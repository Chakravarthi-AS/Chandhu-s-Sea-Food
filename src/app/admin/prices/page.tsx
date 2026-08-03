"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { formatInr } from "@/lib/defaults";
import { useStore } from "@/lib/store";

export default function AdminPricesPage() {
  const { state, updateProductPrice, ready } = useStore();
  const [draft, setDraft] = useState<
    Record<string, { pricePerKg: number; bulkPricePerKg: number }>
  >({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const next: typeof draft = {};
    state.products.forEach((p) => {
      next[p.id] = {
        pricePerKg: p.pricePerKg,
        bulkPricePerKg: p.bulkPricePerKg,
      };
    });
    setDraft(next);
  }, [ready, state.products]);

  if (!ready) return <p className="container section">Loading…</p>;

  function saveAll() {
    Object.entries(draft).forEach(([id, prices]) => {
      updateProductPrice(id, prices.pricePerKg, prices.bulkPricePerKg);
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <AdminShell title="Configurable prices (INR)">
      <p style={{ color: "var(--ink-muted)", marginTop: "-0.5rem" }}>
        Update retail and bulk rates anytime. Storefront and order totals use these
        values immediately. Replace demo numbers with your real Nellore rates later.
      </p>

      <div className="panel" style={{ marginTop: "1rem", overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Retail ₹ / kg</th>
              <th>Bulk ₹ / kg</th>
              <th>Preview</th>
            </tr>
          </thead>
          <tbody>
            {state.products.map((p) => (
              <tr key={p.id}>
                <td>
                  <strong>
                    {p.imageEmoji} {p.name}
                  </strong>
                </td>
                <td>
                  <input
                    type="number"
                    min={1}
                    value={draft[p.id]?.pricePerKg ?? p.pricePerKg}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        [p.id]: {
                          ...d[p.id],
                          pricePerKg: Number(e.target.value),
                          bulkPricePerKg:
                            d[p.id]?.bulkPricePerKg ?? p.bulkPricePerKg,
                        },
                      }))
                    }
                    style={{ width: 110, padding: "0.45rem", borderRadius: 8 }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={1}
                    value={draft[p.id]?.bulkPricePerKg ?? p.bulkPricePerKg}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        [p.id]: {
                          ...d[p.id],
                          bulkPricePerKg: Number(e.target.value),
                          pricePerKg: d[p.id]?.pricePerKg ?? p.pricePerKg,
                        },
                      }))
                    }
                    style={{ width: 110, padding: "0.45rem", borderRadius: 8 }}
                  />
                </td>
                <td style={{ fontSize: "0.9rem", color: "var(--ink-muted)" }}>
                  {formatInr(draft[p.id]?.pricePerKg ?? p.pricePerKg)} /{" "}
                  {formatInr(draft[p.id]?.bulkPricePerKg ?? p.bulkPricePerKg)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" className="btn btn-primary" onClick={saveAll}>
          Save prices
        </button>
        {saved && (
          <span className="alert alert-ok" style={{ marginLeft: "0.75rem" }}>
            Saved
          </span>
        )}
      </div>
    </AdminShell>
  );
}
