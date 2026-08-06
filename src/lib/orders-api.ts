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

export async function createOrderOnServer(order: CustomerOrder): Promise<boolean> {
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });
  return res.ok;
}

export async function patchOrderOnServer(
  id: string,
  patch: {
    status: CustomerOrder["status"];
    agentNote?: string;
    deliveryPartnerId?: string;
  }
): Promise<boolean> {
  const res = await fetch("/api/orders", {
    method: "PATCH",
    headers: adminHeaders(),
    body: JSON.stringify({ id, ...patch }),
  });
  return res.ok;
}
