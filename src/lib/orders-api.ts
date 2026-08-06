import type { CustomerOrder } from "./types";
import { adminHeaders } from "./admin-api";
import { normalizePhone } from "./defaults";

export async function fetchOrdersFromServer(opts: {
  phone?: string;
  tracking?: string;
  asAdmin?: boolean;
}): Promise<{ configured: boolean; orders: CustomerOrder[] }> {
  const params = new URLSearchParams();
  if (opts.tracking) params.set("tracking", opts.tracking);
  else if (opts.phone) params.set("phone", normalizePhone(opts.phone));

  const res = await fetch(`/api/orders?${params.toString()}`, {
    cache: "no-store",
    headers: opts.asAdmin ? adminHeaders() : undefined,
  });
  const data = (await res.json()) as {
    configured?: boolean;
    orders?: CustomerOrder[];
  };
  if (!res.ok) {
    return { configured: Boolean(data.configured), orders: [] };
  }
  return {
    configured: Boolean(data.configured),
    orders: Array.isArray(data.orders) ? data.orders : [],
  };
}

export async function createOrderOnServer(
  order: CustomerOrder
): Promise<{ ok: boolean; configured: boolean; error?: string }> {
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });
  let data: { error?: string } = {};
  try {
    data = (await res.json()) as { error?: string };
  } catch {
    /* ignore */
  }
  if (res.status === 503) {
    return { ok: false, configured: false, error: data.error };
  }
  if (!res.ok) {
    return {
      ok: false,
      configured: true,
      error: data.error || `Save failed (${res.status})`,
    };
  }
  return { ok: true, configured: true };
}

export async function patchOrderOnServer(
  id: string,
  patch: {
    status?: CustomerOrder["status"];
    agentNote?: string;
    deliveryPartnerId?: string;
    paymentStatus?: CustomerOrder["paymentStatus"];
    paymentMethod?: CustomerOrder["paymentMethod"];
    paymentAmountInr?: number;
    razorpayQrId?: string;
    razorpayPaymentId?: string;
    paidAt?: string;
  }
): Promise<boolean> {
  const res = await fetch("/api/orders", {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify({ id, ...patch }),
  });
  return res.ok;
}
