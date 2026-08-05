const ADMIN_SECRET_KEY = "csf-admin-secret";

export function setAdminApiSecret(password: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ADMIN_SECRET_KEY, password);
}

export function clearAdminApiSecret() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ADMIN_SECRET_KEY);
}

export function getAdminApiSecret(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ADMIN_SECRET_KEY);
}

export function adminHeaders(): HeadersInit {
  const secret = getAdminApiSecret();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (secret) headers["x-admin-secret"] = secret;
  return headers;
}
