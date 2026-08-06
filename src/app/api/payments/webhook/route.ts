import { NextRequest, NextResponse } from "next/server";
import { markOrderPaid } from "@/lib/payment-db";
import { verifyWebhookSignature } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

type WebhookBody = {
  event?: string;
  payload?: {
    qr_code?: { entity?: { id?: string; notes?: Record<string, string> } };
    payment?: { entity?: { id?: string; notes?: Record<string, string> } };
    payment_link?: {
      entity?: { id?: string; notes?: Record<string, string>; status?: string };
    };
  };
};

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  const ok = await verifyWebhookSignature(rawBody, signature);
  if (!ok) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let body: WebhookBody;
  try {
    body = JSON.parse(rawBody) as WebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = body.event || "";
  const qrId = body.payload?.qr_code?.entity?.id;
  const paymentLinkId = body.payload?.payment_link?.entity?.id;
  const paymentId = body.payload?.payment?.entity?.id;
  const orderId =
    body.payload?.qr_code?.entity?.notes?.order_id ||
    body.payload?.payment_link?.entity?.notes?.order_id ||
    body.payload?.payment?.entity?.notes?.order_id;

  const shouldMarkPaid =
    event === "qr_code.credited" ||
    event === "payment.captured" ||
    event === "payment_link.paid" ||
    event.startsWith("qr_code.") ||
    (event === "order.paid" && Boolean(orderId || qrId || paymentLinkId));

  if (shouldMarkPaid && (orderId || qrId || paymentLinkId)) {
    try {
      await markOrderPaid({
        orderId: orderId || undefined,
        qrId: qrId || paymentLinkId || undefined,
        paymentId: paymentId || undefined,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Webhook update failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
