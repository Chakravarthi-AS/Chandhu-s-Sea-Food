import { NextRequest, NextResponse } from "next/server";
import { findOrderById, patchOrderPayment } from "@/lib/payment-db";
import { createUpiQr, isRazorpayConfigured } from "@/lib/razorpay";
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
  let existingQrId: string | undefined;

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
      existingQrId = order.razorpayQrId;
      if (existingQrId && !body.force) {
        try {
          const { fetchUpiQr } = await import("@/lib/razorpay");
          const qr = await fetchUpiQr(existingQrId);
          if (qr.status === "active") {
            return NextResponse.json({
              ok: true,
              orderId: order.id,
              qrId: existingQrId,
              imageUrl: qr.image_url,
              amountInr,
              reused: true,
              closeBy: qr.close_by ?? null,
            });
          }
        } catch {
          /* create a fresh QR below */
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
      amountInr,
      closeBy: qr.close_by ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create QR";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
