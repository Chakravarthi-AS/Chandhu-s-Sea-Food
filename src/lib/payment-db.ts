import { orderToRow, rowToOrder } from "@/lib/order-db";
import type { CustomerOrder, PaymentStatus } from "@/lib/types";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase-server";

export async function findOrderById(orderId: string): Promise<CustomerOrder | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (error || !data) return null;
  return rowToOrder(data as ReturnType<typeof orderToRow>);
}

export async function findOrderByQrId(qrId: string): Promise<CustomerOrder | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("razorpay_qr_id", qrId)
    .maybeSingle();
  if (error || !data) return null;
  return rowToOrder(data as ReturnType<typeof orderToRow>);
}

export async function patchOrderPayment(
  orderId: string,
  patch: Partial<{
    paymentStatus: PaymentStatus;
    razorpayQrId: string;
    razorpayPaymentId: string;
    paidAt: string;
    status: CustomerOrder["status"];
    agentNote: string;
  }>
): Promise<CustomerOrder | null> {
  const existing = await findOrderById(orderId);
  if (!existing) return null;

  const updated: CustomerOrder = {
    ...existing,
    ...(patch.paymentStatus !== undefined
      ? { paymentStatus: patch.paymentStatus }
      : {}),
    ...(patch.razorpayQrId !== undefined
      ? { razorpayQrId: patch.razorpayQrId }
      : {}),
    ...(patch.razorpayPaymentId !== undefined
      ? { razorpayPaymentId: patch.razorpayPaymentId }
      : {}),
    ...(patch.paidAt !== undefined ? { paidAt: patch.paidAt } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.agentNote !== undefined ? { agentNote: patch.agentNote } : {}),
  };

  const supabase = getSupabaseAdmin();
  if (!supabase) return updated;

  const { error } = await supabase.from("orders").upsert(orderToRow(updated));
  if (error) throw new Error(error.message);
  return updated;
}

export async function markOrderPaid(opts: {
  orderId?: string;
  qrId?: string;
  paymentId?: string;
}): Promise<CustomerOrder | null> {
  let order: CustomerOrder | null = null;
  if (opts.orderId) order = await findOrderById(opts.orderId);
  if (!order && opts.qrId) order = await findOrderByQrId(opts.qrId);
  if (!order) return null;

  if (order.paymentStatus === "paid" && order.status === "confirmed") {
    return order;
  }

  // Paid online → always auto-confirm (agent confirm only needed when unpaid / COD rules).
  return patchOrderPayment(order.id, {
    paymentStatus: "paid",
    razorpayPaymentId: opts.paymentId,
    paidAt: new Date().toISOString(),
    status: order.status === "rejected" ? order.status : "confirmed",
    agentNote:
      order.status === "rejected"
        ? order.agentNote
        : "Auto-confirmed — online payment received.",
  });
}
