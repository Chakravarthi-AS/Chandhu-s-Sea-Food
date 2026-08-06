import { NextRequest, NextResponse } from "next/server";
import { markOrderPaid } from "@/lib/payment-db";
import { payLog } from "@/lib/pay-log";
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

  payLog("webhook", "Incoming webhook", {
    bytes: rawBody.length,
    hasSignature: Boolean(signature),
  });

  const ok = await verifyWebhookSignature(rawBody, signature);
  if (!ok) {
    payLog(
      "webhook",
      "Signature verification FAILED — check RAZORPAY_WEBHOOK_SECRET matches Razorpay dashboard secret",
      { hasSignature: Boolean(signature) },
      "error"
    );
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let body: WebhookBody;
  try {
    body = JSON.parse(rawBody) as WebhookBody;
  } catch {
    payLog("webhook", "Invalid JSON payload", undefined, "error");
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

  payLog("webhook", "Parsed event", {
    event,
    orderId,
    qrId,
    paymentLinkId,
    paymentId,
  });

  const shouldMarkPaid =
    event === "qr_code.credited" ||
    event === "payment.captured" ||
    event === "payment_link.paid" ||
    event.startsWith("qr_code.") ||
    (event === "order.paid" && Boolean(orderId || qrId || paymentLinkId));

  if (shouldMarkPaid && (orderId || qrId || paymentLinkId)) {
    try {
      const paid = await markOrderPaid({
        orderId: orderId || undefined,
        qrId: qrId || paymentLinkId || undefined,
        paymentId: paymentId || undefined,
      });
      payLog("webhook", "Order marked paid + auto-confirmed", {
        found: Boolean(paid),
        orderId: paid?.id,
        trackingCode: paid?.trackingCode,
        status: paid?.status,
        paymentStatus: paid?.paymentStatus,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Webhook update failed";
      payLog("webhook", "markOrderPaid failed", message, "error");
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } else {
    payLog("webhook", "Event ignored (not a paid event or missing ids)", {
      event,
      shouldMarkPaid,
    });
  }

  return NextResponse.json({ ok: true, received: true, event });
}

/** Browser ping — confirms route is live (Razorpay uses POST). */
export async function GET() {
  payLog("webhook", "GET ping (route alive; Razorpay must POST)");
  return NextResponse.json({
    ok: true,
    message: "Webhook endpoint is live. Razorpay must POST events here.",
  });
}
