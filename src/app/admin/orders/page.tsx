"use client";

import { useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { formatInr, kgLabel } from "@/lib/defaults";
import { useStore } from "@/lib/store";
import type { CustomerOrder } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  pending_agent: "Pending",
  confirmed: "Confirmed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  rejected: "Rejected",
};

export default function AdminOrdersPage() {
  const { state, setOrderStatus, ready } = useStore();
  const [note, setNote] = useState<Record<string, string>>({});
  const [partnerPick, setPartnerPick] = useState<Record<string, string>>({});

  if (!ready) return <p className="container section">Loading…</p>;

  const activePartners = state.partners.filter((p) => p.active);

  function confirm(order: CustomerOrder) {
    setOrderStatus(order.id, "confirmed", {
      agentNote: note[order.id] || "Confirmed — preparing pack.",
    });
  }

  function reject(order: CustomerOrder) {
    setOrderStatus(order.id, "rejected", {
      agentNote: note[order.id] || "Not feasible for delivery at this time.",
    });
  }

  function dispatch(order: CustomerOrder) {
    const partnerId = partnerPick[order.id] || activePartners[0]?.id;
    if (!partnerId) {
      alert("Add an active delivery partner first.");
      return;
    }
    setOrderStatus(order.id, "out_for_delivery", {
      deliveryPartnerId: partnerId,
      agentNote: note[order.id] || order.agentNote,
    });
  }

  return (
    <AdminShell title="Orders">
      <p style={{ color: "var(--ink-muted)", marginTop: "-0.5rem" }}>
        Orders under 2 kg stay pending until you confirm. Orders of 2 kg and above
        are auto-confirmed. Only after you mark <em>Out for delivery</em> will the
        customer see partner name &amp; phone.
      </p>

      {state.orders.length === 0 ? (
        <div className="panel" style={{ marginTop: "1rem" }}>
          No orders yet. Place one from the{" "}
          <a href="/order" style={{ color: "var(--sea)" }}>
            Order
          </a>{" "}
          page to demo the flow.
        </div>
      ) : (
        <div style={{ overflowX: "auto", marginTop: "1rem" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Qty / Total</th>
                <th>Distance</th>
                <th>Status</th>
                <th>Agent actions</th>
              </tr>
            </thead>
            <tbody>
              {state.orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <strong>{o.trackingCode}</strong>
                    <div style={{ fontSize: "0.85rem", color: "var(--ink-muted)" }}>
                      {(o.items?.length ? o.items : [{ productName: o.productName, quantityKg: o.quantityKg, mode: o.mode }]).map(
                        (item, i) => (
                          <div key={i}>
                            {item.productName} · {kgLabel(item.quantityKg)}
                            {"mode" in item && item.mode ? ` · ${item.mode}` : ""}
                          </div>
                        )
                      )}
                    </div>
                    <div style={{ fontSize: "0.8rem" }}>{o.address}</div>
                  </td>
                  <td>
                    {o.customerName}
                    <br />
                    <span style={{ fontSize: "0.85rem" }}>{o.customerPhone}</span>
                  </td>
                  <td>
                    {kgLabel(o.quantityKg)}
                    <br />
                    {formatInr(o.totalInr)}
                  </td>
                  <td>~{o.distanceKm} km</td>
                  <td>
                    <span className={`status-pill status-${o.status}`}>
                      {STATUS_LABEL[o.status]}
                    </span>
                  </td>
                  <td style={{ minWidth: 220 }}>
                    <textarea
                      rows={2}
                      placeholder="Agent note"
                      value={note[o.id] ?? o.agentNote ?? ""}
                      onChange={(e) =>
                        setNote((n) => ({ ...n, [o.id]: e.target.value }))
                      }
                      style={{
                        width: "100%",
                        marginBottom: "0.45rem",
                        borderRadius: 8,
                        border: "1px solid var(--line)",
                        padding: "0.4rem",
                      }}
                    />
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                      {o.status === "pending_agent" && (
                        <>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => confirm(o)}
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => reject(o)}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {o.status === "confirmed" && (
                        <>
                          <select
                            value={partnerPick[o.id] ?? activePartners[0]?.id ?? ""}
                            onChange={(e) =>
                              setPartnerPick((p) => ({
                                ...p,
                                [o.id]: e.target.value,
                              }))
                            }
                            style={{ borderRadius: 8, padding: "0.35rem" }}
                          >
                            {activePartners.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => dispatch(o)}
                          >
                            Start delivery
                          </button>
                        </>
                      )}
                      {o.status === "out_for_delivery" && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setOrderStatus(o.id, "delivered")}
                        >
                          Mark delivered
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
