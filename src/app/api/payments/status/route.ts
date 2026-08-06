import { NextRequest, NextResponse } from "next/server";
import {
  findOrderById,
  findOrderByQrId,
  markOrderPaid,
  patchOrderPayment,
} from "@/lib/payment-db";
import { fetchUpiQr, isRazorpayConfigured } from "@/lib/razorpay";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("orderId")?.trim();
  const qrIdParam = req.nextUrl.searchParams.get("qrId")?.trim();

  if (!orderId && !qrIdParam) {
    return NextResponse.json({ error: "orderId or qrId required" }, { status: 400 });
  }

  let paymentStatus: string | null = null;
  let qrId = qrIdParam || "";

  if (orderId) {
    const order = await findOrderById(orderId);
    if (order) {
      paymentStatus = order.paymentStatus;
      qrId = order.razorpayQrId || qrId;
      if (order.paymentStatus === "paid") {
        return NextResponse.json({
          ok: true,
          paymentStatus: "paid",
          paidAt: order.paidAt ?? null,
          razorpayPaymentId: order.razorpayPaymentId ?? null,
        });
      }
    }
  }

  if (!qrId) {
    return NextResponse.json({
      ok: true,
      paymentStatus: paymentStatus ?? "pending",
    });
  }

  if (!isRazorpayConfigured()) {
    return NextResponse.json({
      ok: true,
      paymentStatus: paymentStatus ?? "pending",
      qrId,
    });
  }

  try {
    const qr = await fetchUpiQr(qrId);
    if (qr.payments_count_received > 0) {
      const paid = await markOrderPaid({
        orderId: orderId || undefined,
        qrId,
      });
      return NextResponse.json({
        ok: true,
        paymentStatus: "paid",
        paidAt: paid?.paidAt ?? new Date().toISOString(),
        qrId,
        amountReceivedPaise: qr.payments_amount_received,
      });
    }

    if (qr.status === "closed" && orderId) {
      const order = (await findOrderById(orderId)) || (await findOrderByQrId(qrId));
      if (order && order.paymentStatus === "pending") {
        await patchOrderPayment(order.id, { paymentStatus: "expired" });
      }
      return NextResponse.json({
        ok: true,
        paymentStatus: "expired",
        qrId,
      });
    }

    return NextResponse.json({
      ok: true,
      paymentStatus: paymentStatus ?? "pending",
      qrId,
      imageUrl: qr.image_url,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Status check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
