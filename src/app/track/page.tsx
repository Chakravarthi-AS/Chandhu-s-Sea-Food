"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatInr, kgLabel } from "@/lib/defaults";
import { fetchOrdersFromServer } from "@/lib/orders-api";
import {
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
} from "@/lib/payment-labels";
import { useStore } from "@/lib/store";
import type { CustomerOrder } from "@/lib/types";
import { PageLoader } from "@/components/PageLoader";

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
  const [remoteOrder, setRemoteOrder] = useState<CustomerOrder | undefined>();
  const [tracking, setTracking] = useState(false);

  const order = useMemo(
    () => (query ? getOrderByTracking(query) : undefined),
    [query, getOrderByTracking, state.orders]
  );

  const displayed = order ?? remoteOrder;

  useEffect(() => {
    setRemoteOrder(undefined);
    if (!query || order) {
      setTracking(false);
      return;
    }
    let cancelled = false;
    setTracking(true);
    void fetchOrdersFromServer({ tracking: query }).then(({ orders }) => {
      if (cancelled) return;
      if (orders[0]) setRemoteOrder(orders[0]);
      setTracking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [query, order]);

  const partner = displayed?.deliveryPartnerId
    ? state.partners.find((p) => p.id === displayed.deliveryPartnerId)
    : undefined;

  if (!ready) return null;

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
          if (tracking) return;
          setQuery(code.trim());
        }}
      >
        <input
          style={{ flex: 1, minWidth: 200 }}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. CSF-…"
          aria-label="Tracking code"
          disabled={tracking}
        />
        <button
          type="submit"
          className={`btn btn-primary${tracking ? " is-loading" : ""}`}
          disabled={tracking}
        >
          {tracking ? (
            <>
              <span className="spinner spinner-sm spinner-light" aria-hidden />
              Looking up…
            </>
          ) : (
            "Track"
          )}
        </button>
      </form>

      {tracking && (
        <div className="busy-banner">
          <span className="spinner spinner-sm" aria-hidden />
          Searching order…
        </div>
      )}

      {query && !displayed && !tracking && (
        <div className="alert alert-warn">
          No order found for <strong>{query}</strong>. Check the code or place a
          new order.
        </div>
      )}

      {displayed && (
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
              <span className="badge">{displayed.trackingCode}</span>
              <h2 style={{ margin: "0.5rem 0 0" }}>{displayed.productName}</h2>
            </div>
            <span className={`status-pill status-${displayed.status}`}>
              {STATUS_LABEL[displayed.status]}
            </span>
          </div>

          {displayed.items?.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "var(--ink-muted)" }}>
              {displayed.items.map((item, idx) => (
                <li key={`${item.productId}-${idx}`}>
                  {item.productName} · {kgLabel(item.quantityKg)} ·{" "}
                  {formatInr(item.lineTotalInr)}
                </li>
              ))}
            </ul>
          )}

          <p style={{ margin: 0, color: "var(--ink-muted)" }}>
            Total {kgLabel(displayed.quantityKg)} · {formatInr(displayed.totalInr)} · ~
            {displayed.distanceKm} km from hub
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
            <span
              className={`status-pill status-${displayed.paymentStatus ?? "pending"}`}
            >
              {PAYMENT_STATUS_LABEL[displayed.paymentStatus ?? "pending"]}
            </span>
            <span style={{ fontSize: "0.9rem", color: "var(--ink-muted)" }}>
              {PAYMENT_METHOD_LABEL[displayed.paymentMethod ?? "cod"]}
            </span>
          </div>
          {displayed.paymentMethod === "cod" &&
            displayed.paymentStatus === "cod_pending" && (
              <div className="alert alert-info">
                Pay {formatInr(displayed.paymentAmountInr ?? displayed.totalInr)}{" "}
                cash on delivery.
              </div>
            )}
          {displayed.paymentMethod === "razorpay_upi_qr" &&
            displayed.paymentStatus === "paid" && (
              <div className="alert alert-ok">Payment confirmed via UPI.</div>
            )}
          {displayed.paymentMethod === "razorpay_upi_qr" &&
            displayed.paymentStatus === "pending" && (
              <div className="alert alert-warn">
                UPI payment pending — complete payment if you haven’t already.
              </div>
            )}

          <p style={{ margin: 0 }}>
            <strong>{displayed.customerName}</strong> · {displayed.customerPhone}
            <br />
            {displayed.address}
          </p>

          {displayed.agentNote && (
            <div className="alert alert-info">{displayed.agentNote}</div>
          )}

          {displayed.status === "pending_agent" && (
            <div className="alert alert-warn">
              Waiting for agent confirmation (orders under 2 kg).
            </div>
          )}

          {displayed.status === "confirmed" && (
            <div className="alert alert-ok">
              Order confirmed
              {displayed.agentNote?.includes("Auto-confirmed")
                ? " automatically"
                : ""}
              . Delivery partner details will show once dispatch starts.
            </div>
          )}

          {(displayed.status === "out_for_delivery" ||
            displayed.status === "delivered") &&
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

          {(displayed.status === "out_for_delivery" ||
            displayed.status === "delivered") &&
            !partner && (
              <div className="alert alert-warn">
                Dispatch started, but partner details are not assigned yet.
                Contact support: {state.config.supportPhone}
              </div>
            )}

          {displayed.status === "rejected" && (
            <div className="alert alert-warn">
              This order was not confirmed
              {displayed.agentNote ? `: ${displayed.agentNote}` : "."} Please contact
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
    <Suspense
      fallback={
        <div className="container section">
          <PageLoader label="Loading tracker…" />
        </div>
      }
    >
      <TrackInner />
    </Suspense>
  );
}
