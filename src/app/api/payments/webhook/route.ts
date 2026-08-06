import { NextRequest, NextResponse } from "next/server";
import { markOrderPaid } from "@/lib/payment-db";
import { verifyWebhookSignature } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

type WebhookBody = {
  event?: string;
  payload?: {
    qr_code?: { entity?: { id?: string; notes?: Record<string, string> } };
    payment?: { entity?: { id?: string; notes?: Record<string, string> } };
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
  const paymentId = body.payload?.payment?.entity?.id;
  const orderId =
    body.payload?.qr_code?.entity?.notes?.order_id ||
    body.payload?.payment?.entity?.notes?.order_id;

  if (
    event === "qr_code.credited" ||
    event === "payment.captured" ||
    event.startsWith("qr_code.")
  ) {
    if (orderId || qrId) {
      try {
        await markOrderPaid({
          orderId: orderId || undefined,
          qrId: qrId || undefined,
          paymentId: paymentId || undefined,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Webhook update failed";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
