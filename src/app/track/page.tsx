"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatInr, kgLabel } from "@/lib/defaults";
import { useStore } from "@/lib/store";

const STATUS_LABEL: Record<string, string> = {
  pending_agent: "Pending agent confirmation",
  confirmed: "Confirmed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  rejected: "Rejected",
};

function TrackInner() {
  const search = useSearchParams();
  const { state, getOrderByTracking, ready } = useStore();
  const [code, setCode] = useState(search.get("code") ?? "");
  const [query, setQuery] = useState(search.get("code") ?? "");

  const order = useMemo(
    () => (query ? getOrderByTracking(query) : undefined),
    [query, getOrderByTracking, state.orders]
  );

  const partner = order?.deliveryPartnerId
    ? state.partners.find((p) => p.id === order.deliveryPartnerId)
    : undefined;

  if (!ready) return <p className="container section">Loading…</p>;

  return (
    <div className="container section" style={{ maxWidth: 680 }}>
      <div className="section-head">
        <h1>Track your order</h1>
        <p>
          Enter the tracking code from your order confirmation. Delivery partner
          details appear only after dispatch is started by admin.
        </p>
      </div>

      <form
        className="panel"
        style={{
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
          marginBottom: "1.25rem",
        }}
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(code.trim());
        }}
      >
        <input
          style={{ flex: 1, minWidth: 200 }}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. CSF-…"
          aria-label="Tracking code"
        />
        <button type="submit" className="btn btn-primary">
          Track
        </button>
      </form>

      {query && !order && (
        <div className="alert alert-warn">
          No order found for <strong>{query}</strong>. Check the code or place a
          new order.
        </div>
      )}

      {order && (
        <div className="panel" style={{ display: "grid", gap: "0.85rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div>
              <span className="badge">{order.trackingCode}</span>
              <h2 style={{ margin: "0.5rem 0 0" }}>{order.productName}</h2>
            </div>
            <span className={`status-pill status-${order.status}`}>
              {STATUS_LABEL[order.status]}
            </span>
          </div>

          {order.items?.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "var(--ink-muted)" }}>
              {order.items.map((item, idx) => (
                <li key={`${item.productId}-${idx}`}>
                  {item.productName} · {kgLabel(item.quantityKg)} ·{" "}
                  {formatInr(item.lineTotalInr)}
                </li>
              ))}
            </ul>
          )}

          <p style={{ margin: 0, color: "var(--ink-muted)" }}>
            Total {kgLabel(order.quantityKg)} · {formatInr(order.totalInr)} · ~
            {order.distanceKm} km from hub
          </p>
          <p style={{ margin: 0 }}>
            <strong>{order.customerName}</strong> · {order.customerPhone}
            <br />
            {order.address}
          </p>

          {order.agentNote && (
            <div className="alert alert-info">{order.agentNote}</div>
          )}

          {order.status === "pending_agent" && (
            <div className="alert alert-warn">
              Waiting for agent confirmation (orders under 2 kg).
            </div>
          )}

          {order.status === "confirmed" && (
            <div className="alert alert-ok">
              Order confirmed
              {order.agentNote?.includes("Auto-confirmed")
                ? " automatically"
                : ""}
              . Delivery partner details will show once dispatch starts.
            </div>
          )}

          {(order.status === "out_for_delivery" ||
            order.status === "delivered") &&
            partner && (
              <div
                className="alert alert-ok"
                style={{ display: "grid", gap: "0.35rem" }}
              >
                <strong>Delivery partner</strong>
                <span>Name: {partner.name}</span>
                <span>Contact: {partner.phone}</span>
                <span style={{ fontSize: "0.9rem", opacity: 0.85 }}>
                  Managed by Chandhu Sea Food admin — please call if needed.
                </span>
              </div>
            )}

          {(order.status === "out_for_delivery" ||
            order.status === "delivered") &&
            !partner && (
              <div className="alert alert-warn">
                Dispatch started, but partner details are not assigned yet.
                Contact support: {state.config.supportPhone}
              </div>
            )}

          {order.status === "rejected" && (
            <div className="alert alert-warn">
              This order was not confirmed
              {order.agentNote ? `: ${order.agentNote}` : "."} Please contact
              support or place a new order.
            </div>
          )}

          <Link
            href="/order"
            className="btn btn-ghost btn-sm"
            style={{ width: "fit-content" }}
          >
            Place another order
          </Link>
        </div>
      )}
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<p className="container section">Loading…</p>}>
      <TrackInner />
    </Suspense>
  );
}
