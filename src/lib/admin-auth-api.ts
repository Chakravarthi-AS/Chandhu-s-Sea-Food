import type { CustomerAccount, CustomerOrder } from "./types";
import { adminHeaders } from "./admin-api";

export async function loginAdminOnServer(
  username: string,
  password: string
): Promise<{
  ok: boolean;
  configured: boolean;
  username?: string;
  displayName?: string | null;
}> {
  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    configured?: boolean;
    username?: string;
    displayName?: string | null;
    error?: string;
  };
  if (!res.ok) return { ok: false, configured: Boolean(data.configured) };
  return {
    ok: Boolean(data.ok),
    configured: Boolean(data.configured),
    username: data.username,
    displayName: data.displayName,
  };
}

export async function saveAdminUserOnServer(payload: {
  username: string;
  password: string;
  displayName?: string;
}): Promise<boolean> {
  const res = await fetch("/api/admin/user", {
    method: "PUT",
    headers: adminHeaders(),
    body: JSON.stringify(payload),
  });
  return res.ok;
}

export async function fetchAdminUserFromServer(): Promise<{
  configured: boolean;
  username: string | null;
  displayName: string | null;
}> {
  const res = await fetch("/api/admin/user", { cache: "no-store" });
  const data = (await res.json()) as {
    configured?: boolean;
    username?: string | null;
    displayName?: string | null;
  };
  return {
    configured: Boolean(data.configured),
    username: data.username ?? null,
    displayName: data.displayName ?? null,
  };
}
