import type { CustomerAccount } from "./types";
import { normalizePhone } from "./defaults";

export async function fetchCustomerFromServer(
  phone: string
): Promise<{ configured: boolean; customer: CustomerAccount | null }> {
  const n = normalizePhone(phone);
  const res = await fetch(`/api/customers?phone=${encodeURIComponent(n)}`, {
    cache: "no-store",
  });
  const data = (await res.json()) as {
    configured?: boolean;
    customer?: CustomerAccount | null;
  };
  return {
    configured: Boolean(data.configured),
    customer: data.customer ?? null,
  };
}

export async function upsertCustomerOnServer(
  customer: CustomerAccount
): Promise<CustomerAccount | null> {
  const res = await fetch("/api/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(customer),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { customer?: CustomerAccount };
  return data.customer ?? customer;
}

export async function updateCustomerOnServer(
  customer: CustomerAccount
): Promise<boolean> {
  const res = await fetch("/api/customers", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(customer),
  });
  return res.ok;
}
