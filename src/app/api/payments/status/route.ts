import { NextRequest, NextResponse } from "next/server";
import {
  findOrderById,
  findOrderByQrId,
  markOrderPaid,
  patchOrderPayment,
} from "@/lib/payment-db";
import {
  fetchPaymentLink,
  fetchUpiQr,
  isRazorpayConfigured,
} from "@/lib/razorpay";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("orderId")?.trim();
  const qrIdParam = req.nextUrl.searchParams.get("qrId")?.trim();

  if (!orderId && !qrIdParam) {
    return NextResponse.json({ error: "orderId or qrId required" }, { status: 400 });
  }

  let paymentStatus: string | null = null;
  let providerId = qrIdParam || "";

  if (orderId) {
    const order = await findOrderById(orderId);
    if (order) {
      paymentStatus = order.paymentStatus;
      providerId = order.razorpayQrId || providerId;
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

  if (!providerId) {
    return NextResponse.json({
      ok: true,
      paymentStatus: paymentStatus ?? "pending",
    });
  }

  if (!isRazorpayConfigured()) {
    return NextResponse.json({
      ok: true,
      paymentStatus: paymentStatus ?? "pending",
      qrId: providerId,
    });
  }

  try {
    if (providerId.startsWith("plink_")) {
      const link = await fetchPaymentLink(providerId);
      if (link.status === "paid" || link.amount_paid > 0) {
        const paid = await markOrderPaid({
          orderId: orderId || undefined,
          qrId: providerId,
        });
        return NextResponse.json({
          ok: true,
          paymentStatus: "paid",
          paidAt: paid?.paidAt ?? new Date().toISOString(),
          qrId: providerId,
          mode: "payment_link",
        });
      }
      if (link.status === "expired" || link.status === "cancelled") {
        if (orderId) {
          const order =
            (await findOrderById(orderId)) || (await findOrderByQrId(providerId));
          if (order && order.paymentStatus === "pending") {
            await patchOrderPayment(order.id, { paymentStatus: "expired" });
          }
        }
        return NextResponse.json({
          ok: true,
          paymentStatus: "expired",
          qrId: providerId,
          mode: "payment_link",
        });
      }
      return NextResponse.json({
        ok: true,
        paymentStatus: paymentStatus ?? "pending",
        qrId: providerId,
        mode: "payment_link",
        payUrl: link.short_url,
      });
    }

    const qr = await fetchUpiQr(providerId);
    if (qr.payments_count_received > 0) {
      const paid = await markOrderPaid({
        orderId: orderId || undefined,
        qrId: providerId,
      });
      return NextResponse.json({
        ok: true,
        paymentStatus: "paid",
        paidAt: paid?.paidAt ?? new Date().toISOString(),
        qrId: providerId,
        mode: "upi_qr",
        amountReceivedPaise: qr.payments_amount_received,
      });
    }

    if (qr.status === "closed" && orderId) {
      const order =
        (await findOrderById(orderId)) || (await findOrderByQrId(providerId));
      if (order && order.paymentStatus === "pending") {
        await patchOrderPayment(order.id, { paymentStatus: "expired" });
      }
      return NextResponse.json({
        ok: true,
        paymentStatus: "expired",
        qrId: providerId,
        mode: "upi_qr",
      });
    }

    return NextResponse.json({
      ok: true,
      paymentStatus: paymentStatus ?? "pending",
      qrId: providerId,
      imageUrl: qr.image_url,
      mode: "upi_qr",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Status check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
