"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { formatPhoneDisplay, normalizePhone } from "@/lib/defaults";

type Props = {
  open: boolean;
  initialPhone?: string;
  initialName?: string;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  onSuccess: (phone: string, name: string) => void;
};

export function CustomerOtpModal({
  open,
  initialPhone = "",
  initialName = "",
  title = "Login with mobile OTP",
  subtitle = "Verify your number to confirm the order and save past orders & delivery locations.",
  onClose,
  onSuccess,
}: Props) {
  const { requestOtp, verifyOtp, pendingOtp } = useStore();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState(initialPhone);
  const [name, setName] = useState(initialName);
  const [otp, setOtp] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [busy, setBusy] = useState(false);
  const wasOpen = useRef(false);

  // Only reset when the modal opens — not when parent name/phone update after login
  useEffect(() => {
    if (open && !wasOpen.current) {
      setPhone(initialPhone);
      setName(initialName);
      setStep(initialPhone.trim() ? "phone" : "phone");
      setOtp("");
      setDemoCode(null);
      setError(null);
      setInfo(null);
      setResendIn(0);
      setBusy(false);
    }
    wasOpen.current = open;
  }, [open, initialPhone, initialName]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  if (!open) return null;

  function doSendOtp() {
    setError(null);
    const result = requestOtp(phone);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    setDemoCode(result.demoCode ?? null);
    setInfo(result.message);
    setStep("otp");
    setResendIn(30);
    setOtp("");
    return true;
  }

  function sendOtp(e: FormEvent) {
    e.preventDefault();
    doSendOtp();
  }

  function resendOtp() {
    if (resendIn > 0) return;
    if (doSendOtp()) {
      setInfo("New OTP sent (demo — shown on screen).");
    }
  }

  function confirmOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = verifyOtp(phone, otp, name);
    if (!result.ok) {
      setError(result.message);
      setBusy(false);
      return;
    }
    // Hand off to parent to place order / navigate — keep busy so UI doesn't flash
    onSuccess(normalizePhone(phone), name.trim() || "Customer");
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-panel">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "1rem",
            alignItems: "flex-start",
          }}
        >
          <div>
            <h2 style={{ margin: "0 0 0.4rem" }}>{title}</h2>
            <p style={{ margin: 0, color: "var(--ink-muted)", fontSize: "0.95rem" }}>
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            disabled={busy}
          >
            Close
          </button>
        </div>

        {step === "phone" ? (
          <form onSubmit={sendOtp} className="form-grid" style={{ marginTop: "1.25rem" }}>
            <div className="form-row">
              <label htmlFor="otp-name">Your name</label>
              <input
                id="otp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name for delivery"
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="otp-phone">Mobile number</label>
              <input
                id="otp-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile"
                inputMode="numeric"
                required
              />
            </div>
            {error && <div className="alert alert-warn">{error}</div>}
            <button type="submit" className="btn btn-primary">
              Send OTP
            </button>
          </form>
        ) : (
          <form onSubmit={confirmOtp} className="form-grid" style={{ marginTop: "1.25rem" }}>
            <div className="alert alert-info">
              OTP sent to <strong>{formatPhoneDisplay(phone)}</strong>
              {(demoCode || pendingOtp?.code) && (
                <>
                  <br />
                  Demo OTP:{" "}
                  <strong style={{ fontSize: "1.2rem" }}>
                    {demoCode ?? pendingOtp?.code}
                  </strong>
                </>
              )}
            </div>
            <div className="form-row">
              <label htmlFor="otp-code">Enter 6-digit OTP</label>
              <input
                id="otp-code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••"
                inputMode="numeric"
                required
                disabled={busy}
              />
            </div>
            {info && <div className="alert alert-ok">{info}</div>}
            {error && <div className="alert alert-warn">{error}</div>}
            {busy && (
              <div className="alert alert-ok">Verified — placing your order…</div>
            )}
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? "Please wait…" : "Verify & place order"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={resendIn > 0 || busy}
                onClick={resendOtp}
              >
                {resendIn > 0 ? `Resend OTP (${resendIn}s)` : "Resend OTP"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy}
                onClick={() => {
                  setStep("phone");
                  setOtp("");
                  setError(null);
                }}
              >
                Change number
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
