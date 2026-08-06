"use client";

import { useEffect, useState } from "react";
import { formatInr } from "@/lib/defaults";

type Props = {
  amountInr: number;
  imageUrl: string | null;
  payUrl?: string | null;
  waiting: boolean;
  error: string | null;
  onCancel: () => void;
  onRetry: () => void;
};

export function PaymentQrPanel({
  amountInr,
  imageUrl,
  payUrl,
  waiting,
  error,
  onCancel,
  onRetry,
}: Props) {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    if (!waiting) return;
    const id = window.setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : `${d}.`));
    }, 500);
    return () => window.clearInterval(id);
  }, [waiting]);

  return (
    <div className="pay-qr-panel panel">
      <span className="badge">UPI payment</span>
      <h2 style={{ margin: "0.5rem 0 0.35rem" }}>
        Pay {formatInr(amountInr)}
      </h2>
      <p style={{ color: "var(--ink-muted)", marginTop: 0 }}>
        Scan this QR with any UPI app
        {payUrl ? ", or open the payment link below" : ""}. Amount is fixed.
      </p>

      <div className="pay-qr-frame">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="UPI QR code" width={220} height={220} />
        ) : (
          <div className="busy-banner" style={{ margin: 0 }}>
            <span className="spinner spinner-sm" aria-hidden />
            Generating QR…
          </div>
        )}
      </div>

      {payUrl && (
        <p style={{ marginTop: "0.85rem" }}>
          <a href={payUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
            Open payment page
          </a>
        </p>
      )}

      {waiting && !error && (
        <div className="alert alert-info" style={{ marginTop: "1rem" }}>
          Waiting for payment{dots}
        </div>
      )}
      {error && (
        <div className="alert alert-warn" style={{ marginTop: "1rem" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", marginTop: "1rem" }}>
        {error ? (
          <button type="button" className="btn btn-primary" onClick={onRetry}>
            Try again
          </button>
        ) : null}
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
