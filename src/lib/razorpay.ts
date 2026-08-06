/**
 * Razorpay helpers — UPI QR create / fetch / webhook verify.
 * Uses REST + Basic auth (no SDK dependency).
 */

function credentials(): { keyId: string; keySecret: string } | null {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

export function isRazorpayConfigured(): boolean {
  return Boolean(credentials());
}

function authHeader(): string {
  const c = credentials();
  if (!c) throw new Error("Razorpay is not configured");
  return `Basic ${Buffer.from(`${c.keyId}:${c.keySecret}`).toString("base64")}`;
}

export type RazorpayQrCode = {
  id: string;
  image_url: string;
  payment_amount: number;
  status: string;
  payments_count_received: number;
  payments_amount_received: number;
  close_by?: number;
  notes?: Record<string, string>;
};

export async function createUpiQr(opts: {
  orderId: string;
  trackingCode: string;
  amountInr: number;
  description: string;
}): Promise<RazorpayQrCode> {
  const amountPaise = Math.round(opts.amountInr * 100);
  if (amountPaise < 100) {
    throw new Error("Minimum payment amount is ₹1");
  }

  const closeBy = Math.floor(Date.now() / 1000) + 30 * 60; // 30 min

  const res = await fetch("https://api.razorpay.com/v1/payments/qr_codes", {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "upi_qr",
      name: opts.trackingCode,
      usage: "single_use",
      fixed_amount: true,
      payment_amount: amountPaise,
      description: opts.description.slice(0, 250),
      close_by: closeBy,
      notes: {
        order_id: opts.orderId,
        tracking_code: opts.trackingCode,
      },
    }),
  });

  const data = (await res.json()) as RazorpayQrCode & { error?: { description?: string } };
  if (!res.ok) {
    throw new Error(data.error?.description || "Failed to create UPI QR");
  }
  return data;
}

export async function fetchUpiQr(qrId: string): Promise<RazorpayQrCode> {
  const res = await fetch(
    `https://api.razorpay.com/v1/payments/qr_codes/${encodeURIComponent(qrId)}`,
    {
      headers: { Authorization: authHeader() },
      cache: "no-store",
    }
  );
  const data = (await res.json()) as RazorpayQrCode & { error?: { description?: string } };
  if (!res.ok) {
    throw new Error(data.error?.description || "Failed to fetch QR status");
  }
  return data;
}

export async function verifyWebhookSignature(
  rawBody: string,
  signature: string | null
): Promise<boolean> {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret || !signature) return false;
  const crypto = await import("crypto");
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}
