import { NextRequest, NextResponse } from "next/server";
import { findOrderById, patchOrderPayment } from "@/lib/payment-db";
import {
  createPaymentLink,
  createUpiQr,
  fetchPaymentLink,
  fetchUpiQr,
  isRazorpayConfigured,
  isUpiQrFeatureMissing,
  qrDataUrlFromText,
} from "@/lib/razorpay";
import { isSupabaseConfigured } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isRazorpayConfigured()) {
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
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderId = body.orderId?.trim();
  if (!orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }

  let trackingCode = body.trackingCode?.trim() || "";
  let amountInr = Number(body.amountInr) || 0;
  let description = body.description?.trim() || "Seafood order";
  let existingProviderId: string | undefined;

  if (isSupabaseConfigured()) {
    const order = await findOrderById(orderId);
    if (order) {
      if (order.paymentStatus === "paid") {
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
        } catch {
          /* create a fresh QR / link below */
        }
      }
    }
  }

  if (!trackingCode || amountInr < 1) {
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
      if (!isUpiQrFeatureMissing(msg)) {
        throw upiErr;
      }

      // Account often lacks on-demand UPI QR API — Payment Link + QR works on standard accounts.
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
