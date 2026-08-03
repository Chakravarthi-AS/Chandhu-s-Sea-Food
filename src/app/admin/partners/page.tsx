"use client";

import { useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useStore } from "@/lib/store";
import type { DeliveryPartner } from "@/lib/types";

export default function AdminPartnersPage() {
  const { state, upsertPartner, removePartner, ready } = useStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  if (!ready) return <p className="container section">Loading…</p>;

  function addPartner(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    const partner: DeliveryPartner = {
      id: crypto.randomUUID(),
      name: name.trim(),
      phone: phone.trim(),
      active: true,
    };
    upsertPartner(partner);
    setName("");
    setPhone("");
  }

  return (
    <AdminShell title="Delivery partners">
      <p style={{ color: "var(--ink-muted)", marginTop: "-0.5rem" }}>
        Maintain riders here. When an order is marked out for delivery, the
        customer sees the assigned partner&apos;s name and contact on Track.
      </p>

      <form
        onSubmit={addPartner}
        className="panel"
        style={{
          marginTop: "1rem",
          display: "grid",
          gridTemplateColumns: "1fr 1fr auto",
          gap: "0.75rem",
          alignItems: "end",
        }}
      >
        <div className="form-row">
          <label htmlFor="pn">Name</label>
          <input
            id="pn"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Partner name"
          />
        </div>
        <div className="form-row">
          <label htmlFor="pp">Phone</label>
          <input
            id="pp"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 …"
          />
        </div>
        <button type="submit" className="btn btn-primary">
          Add
        </button>
      </form>

      <div className="panel" style={{ marginTop: "1rem", overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Active</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {state.partners.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.phone}</td>
                <td>
                  <label
                    style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}
                  >
                    <input
                      type="checkbox"
                      checked={p.active}
                      onChange={(e) =>
                        upsertPartner({ ...p, active: e.target.checked })
                      }
                    />
                    {p.active ? "Yes" : "No"}
                  </label>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => removePartner(p.id)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
