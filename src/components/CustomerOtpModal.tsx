"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { CelebrationModal } from "@/components/CelebrationModal";
import { fetchCustomerFromServer } from "@/lib/customers-api";
import { formatPhoneDisplay, normalizePhone } from "@/lib/defaults";
import { useStore } from "@/lib/store";

type Props = {
  open: boolean;
  initialPhone?: string;
  initialName?: string;
  title?: string;
  subtitle?: string;
  /** When true, skip welcome popup and call onSuccess immediately after OTP */
  skipWelcome?: boolean;
  onClose: () => void;
  onSuccess: (phone: string, name: string) => void;
};

type Step = "phone" | "name" | "otp";

export function CustomerOtpModal({
  open,
  initialPhone = "",
  initialName = "",
  title = "Verify your mobile",
  subtitle = "Enter your mobile number to continue.",
  skipWelcome = false,
  onClose,
  onSuccess,
}: Props) {
  const { requestOtp, verifyOtp, pendingOtp, state } = useStore();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState(initialPhone);
  const [name, setName] = useState(initialName);
  const [isReturning, setIsReturning] = useState(false);
  const [otp, setOtp] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [busy, setBusy] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [welcomeName, setWelcomeName] = useState("");
  const wasOpen = useRef(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const pendingSuccess = useRef<{ phone: string; name: string } | null>(null);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setPhone(initialPhone);
      setName(initialName);
      setStep("phone");
      setIsReturning(false);
      setOtp("");
      setDemoCode(null);
      setError(null);
      setInfo(null);
      setResendIn(0);
      setBusy(false);
      setWelcomeOpen(false);
      pendingSuccess.current = null;
    }
    wasOpen.current = open;
  }, [open, initialPhone, initialName]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  useEffect(() => {
    document.body.classList.toggle("modal-open", open || welcomeOpen);
    return () => document.body.classList.remove("modal-open");
  }, [open, welcomeOpen]);

  function sendOtpForPhone(phoneOverride?: string) {
    const target = phoneOverride ?? phone;
    const result = requestOtp(target);
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

  async function onPhoneSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    const n = normalizePhone(phone);
    if (n.length !== 10) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setBusy(true);
    setPhone(n);
    try {
      const localMatch = state.customers.find(
        (c) => normalizePhone(c.phone) === n
      );
      const { customer } = await fetchCustomerFromServer(n);
      const known = customer?.name || localMatch?.name;
      if (known) {
        setIsReturning(true);
        setName(known);
        sendOtpForPhone(n);
      } else {
        setIsReturning(false);
        setName(initialName || "");
        setStep("name");
      }
    } catch {
      const localMatch = state.customers.find(
        (c) => normalizePhone(c.phone) === n
      );
      if (localMatch?.name) {
        setIsReturning(true);
        setName(localMatch.name);
        sendOtpForPhone(n);
      } else {
        setIsReturning(false);
        setStep("name");
      }
    } finally {
      setBusy(false);
    }
  }

  function onNameSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setBusy(true);
    try {
      sendOtpForPhone();
    } finally {
      setBusy(false);
    }
  }

  function resendOtp() {
    if (resendIn > 0 || busy) return;
    if (sendOtpForPhone()) {
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
    const finalName =
      result.customer?.name?.trim() || name.trim() || "Customer";
    const finalPhone = normalizePhone(phone);
    pendingSuccess.current = { phone: finalPhone, name: finalName };
    setBusy(false);
    if (skipWelcome) {
      onSuccess(finalPhone, finalName);
      return;
    }
    setWelcomeName(finalName);
    setWelcomeOpen(true);
  }

  function finishWelcome() {
    setWelcomeOpen(false);
    const pending = pendingSuccess.current;
    pendingSuccess.current = null;
    if (pending) onSuccess(pending.phone, pending.name);
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

  if (!open && !welcomeOpen) return null;

  return (
    <>
      {open && !welcomeOpen ? (
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
              <form onSubmit={onPhoneSubmit} className="form-grid otp-form">
                <div className="form-row">
                  <label htmlFor="otp-phone">Mobile number</label>
                  <input
                    id="otp-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile"
                    inputMode="numeric"
                    autoComplete="tel"
                    disabled={busy}
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
                      Checking…
                    </>
                  ) : (
                    "Continue"
                  )}
                </button>
              </form>
            ) : null}

            {step === "name" ? (
              <form onSubmit={onNameSubmit} className="form-grid otp-form">
                <div className="alert alert-info">
                  New number — tell us your name for delivery.
                </div>
                <div className="form-row">
                  <label htmlFor="otp-name">Your name</label>
                  <input
                    id="otp-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name for delivery"
                    autoComplete="name"
                    disabled={busy}
                    required
                    autoFocus
                  />
                </div>
                <div className="form-row">
                  <label>Mobile</label>
                  <input value={formatPhoneDisplay(phone)} disabled readOnly />
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
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy}
                  onClick={() => {
                    setStep("phone");
                    setError(null);
                  }}
                >
                  Change number
                </button>
              </form>
            ) : null}

            {step === "otp" ? (
              <form onSubmit={confirmOtp} className="form-grid otp-form">
                <div className="alert alert-info otp-sent">
                  {isReturning ? (
                    <>
                      Welcome back, <strong>{name}</strong>
                      <br />
                    </>
                  ) : null}
                  Code sent to <strong>{formatPhoneDisplay(phone)}</strong>
                  {(demoCode || pendingOtp?.code) && (
                    <span className="demo-otp">
                      Demo OTP <strong>{demoCode ?? pendingOtp?.code}</strong>
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
            ) : null}
          </div>
        </div>
      ) : null}

      <CelebrationModal
        open={welcomeOpen}
        title="Login successful"
        message={`Welcome, ${welcomeName}!`}
        detail="You're all set — enjoy shopping fresh Nellore seafood with Chandhu Sea Food."
        confirmLabel="Start shopping"
        onConfirm={finishWelcome}
      />
    </>
  );
}
