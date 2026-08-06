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
  title = "Verify your mobile",
  subtitle = "We’ll confirm your number so you can place orders and save delivery spots.",
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
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setPhone(initialPhone);
      setName(initialName);
      setStep("phone");
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

  useEffect(() => {
    document.body.classList.toggle("modal-open", open);
    return () => document.body.classList.remove("modal-open");
  }, [open]);

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
    window.setTimeout(() => otpRefs.current[0]?.focus(), 50);
    return true;
  }

  function sendOtp(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      doSendOtp();
    } finally {
      setBusy(false);
    }
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
    onSuccess(normalizePhone(phone), name.trim() || "Customer");
  }

  function setOtpDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const chars = otp.padEnd(6, " ").split("");
    chars[index] = digit || " ";
    const next = chars.join("").replace(/ /g, "").slice(0, 6);
    setOtp(next);
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  }

  function onOtpKeyDown(index: number, key: string) {
    if (key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-panel otp-modal">
        <div className="otp-modal-head">
          <div>
            <p className="otp-kicker">Secure login</p>
            <h2>{title}</h2>
            <p className="otp-sub">{subtitle}</p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {step === "phone" ? (
          <form onSubmit={sendOtp} className="form-grid otp-form">
            <div className="form-row">
              <label htmlFor="otp-name">Your name</label>
              <input
                id="otp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name for delivery"
                autoComplete="name"
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
                autoComplete="tel"
                required
              />
            </div>
            {error && <div className="alert alert-warn">{error}</div>}
            <button
              type="submit"
              className={`btn btn-primary btn-block${busy ? " is-loading" : ""}`}
              disabled={busy}
            >
              {busy ? (
                <>
                  <span className="spinner spinner-sm spinner-light" aria-hidden />
                  Sending…
                </>
              ) : (
                "Send OTP"
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={confirmOtp} className="form-grid otp-form">
            <div className="alert alert-info otp-sent">
              Code sent to <strong>{formatPhoneDisplay(phone)}</strong>
              {(demoCode || pendingOtp?.code) && (
                <span className="demo-otp">
                  Demo OTP{" "}
                  <strong>{demoCode ?? pendingOtp?.code}</strong>
                </span>
              )}
            </div>

            <div className="form-row">
              <label>Enter 6-digit OTP</label>
              <div className="otp-boxes" role="group" aria-label="OTP digits">
                {Array.from({ length: 6 }).map((_, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      otpRefs.current[i] = el;
                    }}
                    className="otp-box"
                    inputMode="numeric"
                    maxLength={1}
                    value={otp[i] ?? ""}
                    disabled={busy}
                    aria-label={`Digit ${i + 1}`}
                    onChange={(e) => setOtpDigit(i, e.target.value)}
                    onKeyDown={(e) => onOtpKeyDown(i, e.key)}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = e.clipboardData
                        .getData("text")
                        .replace(/\D/g, "")
                        .slice(0, 6);
                      setOtp(pasted);
                      otpRefs.current[Math.min(pasted.length, 5)]?.focus();
                    }}
                  />
                ))}
              </div>
            </div>

            {info && <div className="alert alert-ok">{info}</div>}
            {error && <div className="alert alert-warn">{error}</div>}
            {busy && (
              <div className="alert alert-ok">Verified — placing your order…</div>
            )}

            <button
              type="submit"
              className={`btn btn-primary btn-block${busy ? " is-loading" : ""}`}
              disabled={busy || otp.length < 6}
            >
              {busy ? (
                <>
                  <span className="spinner spinner-sm spinner-light" aria-hidden />
                  Please wait…
                </>
              ) : (
                "Verify & continue"
              )}
            </button>

            <div className="otp-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={resendIn > 0 || busy}
                onClick={resendOtp}
              >
                {resendIn > 0 ? `Resend (${resendIn}s)` : "Resend OTP"}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
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
