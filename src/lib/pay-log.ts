/**
 * In-memory payment debug log (dev / local inspection).
 * Visible via GET /api/payments/debug
 */

export type PayLogEntry = {
  at: string;
  level: "info" | "warn" | "error";
  scope: string;
  message: string;
  data?: unknown;
};

const MAX = 100;
const entries: PayLogEntry[] = [];

export function payLog(
  scope: string,
  message: string,
  data?: unknown,
  level: PayLogEntry["level"] = "info"
) {
  const entry: PayLogEntry = {
    at: new Date().toISOString(),
    level,
    scope,
    message,
    data,
  };
  entries.unshift(entry);
  if (entries.length > MAX) entries.pop();

  const prefix = `[pay:${scope}]`;
  if (level === "error") console.error(prefix, message, data ?? "");
  else if (level === "warn") console.warn(prefix, message, data ?? "");
  else console.log(prefix, message, data ?? "");
}

export function getPayLogs(): PayLogEntry[] {
  return [...entries];
}

export function clearPayLogs() {
  entries.length = 0;
}

export function paymentConfigSnapshot() {
  return {
    razorpayKeyIdSet: Boolean(process.env.RAZORPAY_KEY_ID?.trim()),
    razorpayKeySecretSet: Boolean(process.env.RAZORPAY_KEY_SECRET?.trim()),
    webhookSecretSet: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET?.trim()),
    supabaseUrlSet: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
    supabaseServiceSet: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    nodeEnv: process.env.NODE_ENV,
  };
}
