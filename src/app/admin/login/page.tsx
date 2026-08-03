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

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const ok = loginAdmin(username, password);
    if (!ok) {
      setError("Invalid username or password.");
      return;
    }
    router.replace("/admin");
  }

  if (!ready) return <p className="container section">Loading…</p>;

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
              required
            />
          </div>
          {error && <div className="alert alert-warn">{error}</div>}
          <button type="submit" className="btn btn-primary">
            Sign in
          </button>
        </form>
        <p
          style={{
            marginTop: "1.25rem",
            fontSize: "0.85rem",
            color: "var(--ink-muted)",
          }}
        >
          Default demo login: <strong>admin</strong> / <strong>chandhu@123</strong>
          <br />
          Change these under Admin → Shop &amp; delivery after signing in.
        </p>
      </div>
    </div>
  );
}
