import { NextRequest, NextResponse } from "next/server";
import { normalizePhone } from "@/lib/defaults";
import { orderToRow } from "@/lib/order-db";
import { findOrderById, patchOrderPayment } from "@/lib/payment-db";
import { payLog } from "@/lib/pay-log";
import {
  createPaymentLink,
  createUpiQr,
  fetchPaymentLink,
  fetchUpiQr,
  isRazorpayConfigured,
  isUpiQrFeatureMissing,
  qrDataUrlFromText,
} from "@/lib/razorpay";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase-server";
import type { CustomerOrder } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  payLog("create-qr", "Request received");

  if (!isRazorpayConfigured()) {
    payLog("create-qr", "Razorpay keys missing in env", undefined, "error");
    return NextResponse.json(
      {
        error:
          "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
      },
      { status: 503 }
    );
  }

  let body: {
    orderId?: string;
    trackingCode?: string;
    amountInr?: number;
    description?: string;
    force?: boolean;
    order?: CustomerOrder;
  };
  try {
    body = await req.json();
  } catch {
    payLog("create-qr", "Invalid JSON body", undefined, "error");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderId = body.orderId?.trim() || body.order?.id?.trim();
  if (!orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }

  let trackingCode = body.trackingCode?.trim() || "";
  let amountInr = Number(body.amountInr) || 0;
  let description = body.description?.trim() || "Seafood order";
  let existingProviderId: string | undefined;

  payLog("create-qr", "Parsed body", {
    orderId,
    trackingCode,
    amountInr,
    force: Boolean(body.force),
    hasOrderSnapshot: Boolean(body.order),
  });

  if (isSupabaseConfigured()) {
    let order = await findOrderById(orderId);

    // If checkout raced ahead of cloud save, upsert the snapshot now.
    if (!order && body.order && body.order.id === orderId) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        const snapshot: CustomerOrder = {
          ...body.order,
          customerPhone: normalizePhone(body.order.customerPhone),
        };
        const { error } = await supabase
          .from("orders")
          .upsert(orderToRow(snapshot));
        if (error) {
          payLog(
            "create-qr",
            "Failed to upsert order snapshot",
            error.message,
            "error"
          );
          return NextResponse.json(
            { error: `Could not save order: ${error.message}` },
            { status: 500 }
          );
        }
        payLog("create-qr", "Upserted missing order snapshot", {
          trackingCode: snapshot.trackingCode,
        });
        order = snapshot;
      }
    }

    if (order) {
      if (order.paymentStatus === "paid") {
        payLog("create-qr", "Order already paid", { orderId });
        return NextResponse.json({
          ok: true,
          alreadyPaid: true,
          orderId: order.id,
        });
      }
      trackingCode = order.trackingCode;
      amountInr = order.paymentAmountInr || order.totalInr;
      description = `Order ${order.trackingCode}`;
      existingProviderId = order.razorpayQrId;
      if (existingProviderId && !body.force) {
        try {
          if (existingProviderId.startsWith("plink_")) {
            const link = await fetchPaymentLink(existingProviderId);
            if (link.status === "created" || link.status === "partially_paid") {
              const imageUrl = await qrDataUrlFromText(link.short_url);
              payLog("create-qr", "Reusing payment link", {
                linkId: existingProviderId,
                status: link.status,
              });
              return NextResponse.json({
                ok: true,
                orderId: order.id,
                qrId: existingProviderId,
                imageUrl,
                payUrl: link.short_url,
                mode: "payment_link",
                amountInr,
                reused: true,
              });
            }
          } else {
            const qr = await fetchUpiQr(existingProviderId);
            if (qr.status === "active") {
              payLog("create-qr", "Reusing UPI QR", {
                qrId: existingProviderId,
              });
              return NextResponse.json({
                ok: true,
                orderId: order.id,
                qrId: existingProviderId,
                imageUrl: qr.image_url,
                mode: "upi_qr",
                amountInr,
                reused: true,
                closeBy: qr.close_by ?? null,
              });
            }
          }
        } catch (e) {
          payLog(
            "create-qr",
            "Reuse failed, creating new",
            e instanceof Error ? e.message : e,
            "warn"
          );
        }
      }
    } else {
      payLog(
        "create-qr",
        "Order not in DB and no snapshot — cannot safely take payment",
        { orderId },
        "error"
      );
      return NextResponse.json(
        {
          error:
            "Order was not saved to the database. Please go back and place the order again.",
        },
        { status: 409 }
      );
    }
  }

  if (!trackingCode || amountInr < 1) {
    payLog(
      "create-qr",
      "Missing tracking/amount",
      { trackingCode, amountInr },
      "error"
    );
    return NextResponse.json(
      { error: "trackingCode and amountInr required when order is not in DB" },
      { status: 400 }
    );
  }

  try {
    try {
      const qr = await createUpiQr({
        orderId,
        trackingCode,
        amountInr,
        description,
      });

      if (isSupabaseConfigured()) {
        await patchOrderPayment(orderId, { razorpayQrId: qr.id });
      }

      payLog("create-qr", "UPI QR created", { qrId: qr.id, amountInr });
      return NextResponse.json({
        ok: true,
        orderId,
        qrId: qr.id,
        imageUrl: qr.image_url,
        mode: "upi_qr",
        amountInr,
        closeBy: qr.close_by ?? null,
      });
    } catch (upiErr) {
      const msg = upiErr instanceof Error ? upiErr.message : "UPI QR failed";
      payLog("create-qr", "UPI QR failed", msg, "warn");
      if (!isUpiQrFeatureMissing(msg)) {
        throw upiErr;
      }

      const link = await createPaymentLink({
        orderId,
        trackingCode,
        amountInr,
        description,
      });
      const imageUrl = await qrDataUrlFromText(link.short_url);

      if (isSupabaseConfigured()) {
        await patchOrderPayment(orderId, { razorpayQrId: link.id });
      }

      payLog("create-qr", "Payment link QR created (fallback)", {
        linkId: link.id,
        shortUrl: link.short_url,
        amountInr,
      });

      return NextResponse.json({
        ok: true,
        orderId,
        qrId: link.id,
        imageUrl,
        payUrl: link.short_url,
        mode: "payment_link",
        amountInr,
        fallbackFrom: "upi_qr",
        notice:
          "UPI QR API is not enabled on this Razorpay account. Using Payment Link QR instead.",
      });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create QR";
    payLog("create-qr", "Fatal error", message, "error");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
