/**
 * Razorpay helpers — UPI QR / Payment Link + webhook verify.
 * Uses REST + Basic auth (no SDK dependency).
 */

import QRCode from "qrcode";

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

function razorpayErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const err = (data as { error?: { description?: string; code?: string; reason?: string } })
    .error;
  if (!err) return fallback;
  return err.description || err.reason || err.code || fallback;
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

export type RazorpayPaymentLink = {
  id: string;
  short_url: string;
  status: string;
  amount: number;
  amount_paid: number;
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

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      razorpayErrorMessage(data, "Failed to create UPI QR")
    );
  }
  return data as RazorpayQrCode;
}

export async function fetchUpiQr(qrId: string): Promise<RazorpayQrCode> {
  const res = await fetch(
    `https://api.razorpay.com/v1/payments/qr_codes/${encodeURIComponent(qrId)}`,
    {
      headers: { Authorization: authHeader() },
      cache: "no-store",
    }
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(razorpayErrorMessage(data, "Failed to fetch QR status"));
  }
  return data as RazorpayQrCode;
}

export async function createPaymentLink(opts: {
  orderId: string;
  trackingCode: string;
  amountInr: number;
  description: string;
}): Promise<RazorpayPaymentLink> {
  const amountPaise = Math.round(opts.amountInr * 100);
  if (amountPaise < 100) {
    throw new Error("Minimum payment amount is ₹1");
  }

  const expireBy = Math.floor(Date.now() / 1000) + 30 * 60;
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://chandhu-s-sea-food.vercel.app";

  const res = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      accept_partial: false,
      reference_id: `${opts.trackingCode}-${Date.now().toString(36)}`.slice(0, 40),
      description: opts.description.slice(0, 200),
      expire_by: expireBy,
      notify: { sms: false, email: false },
      reminder_enable: false,
      notes: {
        order_id: opts.orderId,
        tracking_code: opts.trackingCode,
      },
      callback_url: `${site.replace(/\/$/, "")}/order?placed=${encodeURIComponent(opts.trackingCode)}`,
      callback_method: "get",
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      razorpayErrorMessage(data, "Failed to create payment link")
    );
  }
  return data as RazorpayPaymentLink;
}

export async function fetchPaymentLink(
  linkId: string
): Promise<RazorpayPaymentLink> {
  const res = await fetch(
    `https://api.razorpay.com/v1/payment_links/${encodeURIComponent(linkId)}`,
    {
      headers: { Authorization: authHeader() },
      cache: "no-store",
    }
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      razorpayErrorMessage(data, "Failed to fetch payment link")
    );
  }
  return data as RazorpayPaymentLink;
}

export async function qrDataUrlFromText(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 220,
    margin: 2,
    errorCorrectionLevel: "M",
  });
}

export function isUpiQrFeatureMissing(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("not found on the server") ||
    m.includes("not enabled") ||
    m.includes("feature") ||
    m.includes("does not exist")
  );
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
