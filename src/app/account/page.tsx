"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CustomerOtpModal } from "@/components/CustomerOtpModal";
import { PageLoader } from "@/components/PageLoader";
import { formatInr, formatPhoneDisplay, kgLabel } from "@/lib/defaults";
import { useStore } from "@/lib/store";

const STATUS_LABEL: Record<string, string> = {
  pending_agent: "Pending agent",
  confirmed: "Confirmed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  rejected: "Rejected",
};

export default function AccountPage() {
  const {
    ready,
    customer,
    getCustomerOrders,
    removeCustomerLocation,
    logoutCustomer,
    refreshOrdersFromServer,
    serverMenuConfigured,
  } = useStore();
  const [showLogin, setShowLogin] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    if (!ready || !customer || !serverMenuConfigured) return;
    let cancelled = false;
    setOrdersLoading(true);
    void refreshOrdersFromServer().finally(() => {
      if (!cancelled) setOrdersLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, customer, serverMenuConfigured, refreshOrdersFromServer]);
  const orders = useMemo(
    () => (customer ? getCustomerOrders() : []),
    [customer, getCustomerOrders]
  );

  if (!ready) return null;

  if (!customer) {
    return (
      <div className="container section" style={{ maxWidth: 560 }}>
        <div className="panel">
          <h1 style={{ marginTop: 0 }}>Customer login</h1>
          <p style={{ color: "var(--ink-muted)" }}>
            The storefront stays open to browse. Login with mobile OTP to view
            past orders and saved delivery locations.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setShowLogin(true)}
          >
            Login with mobile OTP
          </button>
          <p style={{ marginTop: "1rem" }}>
            <Link href="/order" style={{ color: "var(--sea)" }}>
              Continue to order →
            </Link>
          </p>
        </div>
        <CustomerOtpModal
          open={showLogin}
          onClose={() => setShowLogin(false)}
          onSuccess={() => setShowLogin(false)}
        />
      </div>
    );
  }

  return (
    <div className="container section">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        <div className="section-head" style={{ marginBottom: 0 }}>
          <h1>My account</h1>
          <p>
            {customer.name} · {formatPhoneDisplay(customer.phone)}
          </p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={logoutCustomer}>
          Logout
        </button>
      </div>

      <div className="two-col" style={{ marginTop: "1.5rem" }}>
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Past orders</h2>
          {ordersLoading ? (
            <PageLoader label="Fetching your orders…" compact />
          ) : orders.length === 0 ? (
            <p style={{ color: "var(--ink-muted)" }}>
              No orders yet.{" "}
              <Link href="/order" style={{ color: "var(--sea)" }}>
                Place your first order
              </Link>
              .
            </p>
          ) : (
            <div style={{ display: "grid", gap: "0.85rem" }}>
              {orders.map((o) => (
                <div
                  key={o.id}
                  style={{
                    borderBottom: "1px solid var(--line)",
                    paddingBottom: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "0.75rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <strong>{o.trackingCode}</strong>
                    <span className={`status-pill status-${o.status}`}>
                      {STATUS_LABEL[o.status]}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.92rem", color: "var(--ink-muted)" }}>
                    {o.items?.length > 1
                      ? `${o.items.length} items · ${kgLabel(o.quantityKg)}`
                      : `${o.productName} · ${kgLabel(o.quantityKg)}`}{" "}
                    · {formatInr(o.totalInr)}
                  </div>
                  <div style={{ fontSize: "0.85rem" }}>{o.address}</div>
                  <Link
                    href={`/track?code=${o.trackingCode}`}
                    style={{ color: "var(--sea)", fontSize: "0.9rem" }}
                  >
                    Track
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Saved locations</h2>
          {customer.savedLocations.length === 0 ? (
            <p style={{ color: "var(--ink-muted)" }}>
              Locations are saved automatically when you place an order.
            </p>
          ) : (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {customer.savedLocations.map((l) => (
                <div
                  key={l.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <strong>{l.label}</strong>
                    <div style={{ fontSize: "0.9rem", color: "var(--ink-muted)" }}>
                      {l.address}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => removeCustomerLocation(l.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          <Link
            href="/order"
            className="btn btn-primary btn-sm"
            style={{ marginTop: "1rem", width: "fit-content" }}
          >
            New order
          </Link>
        </div>
      </div>
    </div>
  );
}
