"use client";

import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { useStore } from "@/lib/store";

export default function AdminHomePage() {
  const { state, resetDemo, ready } = useStore();
  const pending = state.orders.filter((o) => o.status === "pending_agent").length;
  const active = state.orders.filter((o) =>
    ["confirmed", "out_for_delivery"].includes(o.status)
  ).length;

  if (!ready) return <p className="container section">Loading…</p>;

  return (
    <AdminShell title="Dashboard">
      <p style={{ color: "var(--ink-muted)", marginTop: "-0.5rem" }}>
        Demo admin — data is saved in this browser (localStorage). Confirm orders,
        set prices, and assign delivery partners here.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "1rem",
          margin: "1.5rem 0",
        }}
      >
        <div className="panel">
          <div style={{ color: "var(--ink-muted)", fontSize: "0.85rem" }}>Pending</div>
          <div style={{ fontSize: "2rem", fontFamily: "var(--font-display)" }}>
            {pending}
          </div>
        </div>
        <div className="panel">
          <div style={{ color: "var(--ink-muted)", fontSize: "0.85rem" }}>
            In progress
          </div>
          <div style={{ fontSize: "2rem", fontFamily: "var(--font-display)" }}>
            {active}
          </div>
        </div>
        <div className="panel">
          <div style={{ color: "var(--ink-muted)", fontSize: "0.85rem" }}>Partners</div>
          <div style={{ fontSize: "2rem", fontFamily: "var(--font-display)" }}>
            {state.partners.filter((p) => p.active).length}
          </div>
        </div>
        <div className="panel">
          <div style={{ color: "var(--ink-muted)", fontSize: "0.85rem" }}>Products</div>
          <div style={{ fontSize: "2rem", fontFamily: "var(--font-display)" }}>
            {state.products.length}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
        <Link href="/admin/orders" className="btn btn-primary">
          Review orders
        </Link>
        <Link href="/admin/prices" className="btn btn-ghost">
          Edit prices
        </Link>
        <button type="button" className="btn btn-ghost" onClick={resetDemo}>
          Reset demo data
        </button>
      </div>
    </AdminShell>
  );
}
