"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

export default function AdminLoginPage() {
  const { loginAdmin, ready, state } = useStore();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const ok = await loginAdmin(username, password);
      if (!ok) {
        setError("Invalid username or password.");
        return;
      }
      router.replace("/admin");
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) return null;

  return (
    <div className="container section" style={{ maxWidth: 440 }}>
      <div className="panel">
        <span className="badge">Admin only</span>
        <h1 style={{ marginTop: "0.75rem" }}>Admin login</h1>
        <p style={{ color: "var(--ink-muted)" }}>
          Sign in to manage orders, prices, and delivery partners for{" "}
          {state.config.shopName}.
        </p>
        <form onSubmit={onSubmit} className="form-grid" style={{ marginTop: "1rem" }}>
          <div className="form-row">
            <label htmlFor="admin-user">Username</label>
            <input
              id="admin-user"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={submitting}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="admin-pass">Password</label>
            <input
              id="admin-pass"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              required
            />
          </div>
          {error && <div className="alert alert-warn">{error}</div>}
          <button
            type="submit"
            className={`btn btn-primary${submitting ? " is-loading" : ""}`}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="spinner spinner-sm spinner-light" aria-hidden />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
