import type { PaymentMethod, PaymentStatus } from "./types";

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  razorpay_upi_qr: "UPI QR",
  cod: "Cash on delivery",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Awaiting UPI",
  paid: "Paid",
  failed: "Payment failed",
  expired: "QR expired",
  cod_pending: "COD due",
  cod_collected: "Cash collected",
};

export function defaultPaymentFields(
  method: PaymentMethod,
  amountInr: number
): {
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentAmountInr: number;
} {
  return {
    paymentMethod: method,
    paymentStatus: method === "cod" ? "cod_pending" : "pending",
    paymentAmountInr: amountInr,
  };
}
