"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useStore } from "@/lib/store";
import type { ShopConfig } from "@/lib/types";

export default function AdminSettingsPage() {
  const { state, updateConfig, ready } = useStore();
  const [form, setForm] = useState<ShopConfig>(state.config);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (ready) setForm(state.config);
  }, [ready, state.config]);

  if (!ready) return <p className="container section">Loading…</p>;

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    updateConfig(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function set<K extends keyof ShopConfig>(key: K, value: ShopConfig[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <AdminShell title="Shop & delivery settings">
      <p style={{ color: "var(--ink-muted)", marginTop: "-0.5rem" }}>
        Configure hub location, delivery radius, contact details, and admin login
        credentials.
      </p>

      <form onSubmit={onSave} className="panel form-grid" style={{ marginTop: "1rem" }}>
        <div className="form-row">
          <label>Shop name</label>
          <input
            value={form.shopName}
            onChange={(e) => set("shopName", e.target.value)}
          />
        </div>
        <div className="form-row">
          <label>Tagline</label>
          <input
            value={form.tagline}
            onChange={(e) => set("tagline", e.target.value)}
          />
        </div>
        <div className="form-row">
          <label>Hub / shop address</label>
          <textarea
            rows={2}
            value={form.hubAddress}
            onChange={(e) => set("hubAddress", e.target.value)}
          />
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}
        >
          <div className="form-row">
            <label>Hub latitude</label>
            <input
              type="number"
              step="0.0001"
              value={form.hubLat}
              onChange={(e) => set("hubLat", Number(e.target.value))}
            />
          </div>
          <div className="form-row">
            <label>Hub longitude</label>
            <input
              type="number"
              step="0.0001"
              value={form.hubLng}
              onChange={(e) => set("hubLng", Number(e.target.value))}
            />
          </div>
        </div>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}
        >
          <div className="form-row">
            <label>Retail delivery radius (km)</label>
            <input
              type="number"
              min={1}
              value={form.retailDeliveryRadiusKm}
              onChange={(e) =>
                set("retailDeliveryRadiusKm", Number(e.target.value))
              }
            />
          </div>
          <div className="form-row">
            <label>Min kg for auto-confirm (below = agent)</label>
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={form.minKgForExtended}
              onChange={(e) => set("minKgForExtended", Number(e.target.value))}
            />
          </div>
        </div>
        <div className="form-row">
          <label>Support phone</label>
          <input
            value={form.supportPhone}
            onChange={(e) => set("supportPhone", e.target.value)}
          />
        </div>
        <div className="form-row">
          <label>WhatsApp</label>
          <input
            value={form.supportWhatsApp}
            onChange={(e) => set("supportWhatsApp", e.target.value)}
          />
        </div>
        <div className="form-row">
          <label>Email</label>
          <input
            value={form.supportEmail}
            onChange={(e) => set("supportEmail", e.target.value)}
          />
        </div>
        <div className="form-row">
          <label>Support hours</label>
          <input
            value={form.supportHours}
            onChange={(e) => set("supportHours", e.target.value)}
          />
        </div>

        <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "0.5rem 0" }} />
        <h3 style={{ margin: 0 }}>Admin portal login</h3>
        <p style={{ margin: 0, color: "var(--ink-muted)", fontSize: "0.9rem" }}>
          Only people with this username and password can open Admin. Change these
          from the defaults after first login.
        </p>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}
        >
          <div className="form-row">
            <label>Admin username</label>
            <input
              autoComplete="off"
              value={form.adminUsername}
              onChange={(e) => set("adminUsername", e.target.value)}
            />
          </div>
          <div className="form-row">
            <label>Admin password</label>
            <input
              type="password"
              autoComplete="new-password"
              value={form.adminPassword}
              onChange={(e) => set("adminPassword", e.target.value)}
            />
          </div>
        </div>

        <div>
          <button type="submit" className="btn btn-primary">
            Save settings
          </button>
          {saved && (
            <span className="alert alert-ok" style={{ marginLeft: "0.75rem" }}>
              Saved
            </span>
          )}
        </div>
      </form>
    </AdminShell>
  );
}
