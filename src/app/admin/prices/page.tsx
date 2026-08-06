"use client";

import { FormEvent, useEffect, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { PageLoader } from "@/components/PageLoader";
import { formatInr } from "@/lib/defaults";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";

const CATEGORIES: Product["category"][] = ["prawns", "fish", "crab", "other"];
const EMOJI_OPTIONS = ["", "🦐", "🐟", "🦀", "🦞", "🦑", "🐙"];

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const emptyForm = {
  name: "",
  category: "prawns" as Product["category"],
  imageEmoji: "",
  pricePerKg: 400,
  bulkPricePerKg: 360,
  featured: true,
  active: true,
};

export default function AdminPricesPage() {
  const {
    state,
    replaceProductsPrices,
    upsertProduct,
    removeProduct,
    serverMenuConfigured,
    ready,
    productsLoading,
  } = useStore();
  const [draft, setDraft] = useState<
    Record<string, { pricePerKg: number; bulkPricePerKg: number }>
  >({});
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [itemBusy, setItemBusy] = useState(false);

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

  if (!ready) return null;

  function saveAll() {
    if (saving) return;
    const merged = state.products.map((p) => ({
      ...p,
      pricePerKg: draft[p.id]?.pricePerKg ?? p.pricePerKg,
      bulkPricePerKg: draft[p.id]?.bulkPricePerKg ?? p.bulkPricePerKg,
    }));
    setSaving(true);
    void (async () => {
      try {
        const ok = await replaceProductsPrices(merged);
        if (serverMenuConfigured && !ok) {
          setFormMsg(
            "Prices saved here, but cloud sync failed. Log in to admin again and retry."
          );
          return;
        }
        setFormMsg(null);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } finally {
        setSaving(false);
      }
    })();
  }

  function startEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      category: p.category,
      imageEmoji: p.imageEmoji,
      pricePerKg: p.pricePerKg,
      bulkPricePerKg: p.bulkPricePerKg,
      featured: p.featured,
      active: p.active !== false,
    });
    setFormMsg(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setFormMsg(null);
  }

  function setActive(id: string, active: boolean) {
    const p = state.products.find((x) => x.id === id);
    if (!p) return;
    upsertProduct({
      ...p,
      active,
      pricePerKg: draft[p.id]?.pricePerKg ?? p.pricePerKg,
      bulkPricePerKg: draft[p.id]?.bulkPricePerKg ?? p.bulkPricePerKg,
    });
  }

  function onSubmitItem(e: FormEvent) {
    e.preventDefault();
    if (itemBusy) return;
    const name = form.name.trim();
    if (!name) {
      setFormMsg("Enter an item name.");
      return;
    }
    if (form.pricePerKg < 1 || form.bulkPricePerKg < 1) {
      setFormMsg("Prices must be at least ₹1 / kg.");
      return;
    }

    const slug = slugify(name) || `item-${Date.now()}`;
    const id = editingId ?? `item-${slug}-${Date.now().toString(36)}`;
    const existing = state.products.find((p) => p.id === id);

    setItemBusy(true);
    upsertProduct({
      id,
      name,
      slug: existing?.slug ?? slug,
      description: "",
      pricePerKg: form.pricePerKg,
      bulkPricePerKg: form.bulkPricePerKg,
      featured: form.featured,
      category: form.category,
      imageEmoji: form.imageEmoji,
      active: form.active,
    });

    setFormMsg(editingId ? "Item updated." : "New item added to the menu.");
    setEditingId(null);
    setForm(emptyForm);
    window.setTimeout(() => {
      setItemBusy(false);
      setFormMsg(null);
    }, 900);
  }

  function onDelete(id: string, name: string) {
    if (!window.confirm(`Remove “${name}” from the menu?`)) return;
    removeProduct(id);
    if (editingId === id) cancelEdit();
  }

  return (
    <AdminShell title="Menu items & prices">
      <p className="admin-lead">
        Add seafood items, set retail &amp; bulk INR rates, and mark items active
        or out of stock. Changes apply immediately on the website.
      </p>
      {!serverMenuConfigured ? (
        <div className="alert alert-warn" style={{ marginTop: "0.75rem" }}>
          Cloud menu is off — items save only in this browser. Add Supabase env
          vars (see README) so everyone sees the same menu on the live site.
        </div>
      ) : (
        <div className="alert alert-ok" style={{ marginTop: "0.75rem" }}>
          Cloud menu is on — items sync for all visitors on the live site.
        </div>
      )}

      <form className="panel admin-item-form" onSubmit={onSubmitItem}>
        <h3 className="admin-item-form-title">
          {editingId ? "Edit item" : "Add new item"}
        </h3>
        <div className="admin-item-form-grid">
          <div className="form-row admin-field-span-2">
            <label htmlFor="item-name">Name</label>
            <input
              id="item-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. White Prawns"
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="item-category">Category</label>
            <select
              id="item-category"
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  category: e.target.value as Product["category"],
                }))
              }
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="item-emoji">Icon</label>
            <select
              id="item-emoji"
              value={form.imageEmoji}
              onChange={(e) =>
                setForm((f) => ({ ...f, imageEmoji: e.target.value }))
              }
            >
              {EMOJI_OPTIONS.map((em) => (
                <option key={em || "none"} value={em}>
                  {em || "None (empty)"}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="item-retail">Retail ₹ / kg</label>
            <input
              id="item-retail"
              type="number"
              min={1}
              value={form.pricePerKg}
              onChange={(e) =>
                setForm((f) => ({ ...f, pricePerKg: Number(e.target.value) }))
              }
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="item-bulk">Bulk ₹ / kg</label>
            <input
              id="item-bulk"
              type="number"
              min={1}
              value={form.bulkPricePerKg}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  bulkPricePerKg: Number(e.target.value),
                }))
              }
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="item-active">Available</label>
            <select
              id="item-active"
              value={form.active ? "yes" : "no"}
              onChange={(e) =>
                setForm((f) => ({ ...f, active: e.target.value === "yes" }))
              }
            >
              <option value="yes">Yes — in stock</option>
              <option value="no">No — out of stock</option>
            </select>
          </div>
          <div className="form-row admin-field-check">
            <label htmlFor="item-featured">Featured on home</label>
            <label className="check-inline">
              <input
                id="item-featured"
                type="checkbox"
                checked={form.featured}
                onChange={(e) =>
                  setForm((f) => ({ ...f, featured: e.target.checked }))
                }
              />
              Show in featured section
            </label>
          </div>
        </div>
        <div className="admin-item-form-actions">
          <button
            type="submit"
            className={`btn btn-primary${itemBusy ? " is-loading" : ""}`}
            disabled={itemBusy || saving}
          >
            {itemBusy ? (
              <>
                <span className="spinner spinner-sm spinner-light" aria-hidden />
                Saving…
              </>
            ) : editingId ? (
              "Update item"
            ) : (
              "Add item"
            )}
          </button>
          {editingId && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={cancelEdit}
              disabled={itemBusy}
            >
              Cancel
            </button>
          )}
        </div>
        {formMsg && <div className="alert alert-ok">{formMsg}</div>}
      </form>

      <div className="panel admin-price-table-wrap">
        {productsLoading ? (
          <PageLoader label="Loading menu from cloud…" compact />
        ) : (
          <>
        <table className="table admin-price-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Retail ₹ / kg</th>
              <th>Bulk ₹ / kg</th>
              <th>Available</th>
              <th>Preview</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {state.products.map((p) => (
              <tr key={p.id}>
                <td>
                  <strong>
                    {p.imageEmoji} {p.name}
                  </strong>
                  <div className="admin-product-meta">
                    {p.category}
                    {p.featured ? " · featured" : ""}
                    {p.active === false ? " · out of stock" : ""}
                  </div>
                </td>
                <td>
                  <input
                    className="admin-price-input"
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
                  />
                </td>
                <td>
                  <input
                    className="admin-price-input"
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
                  />
                </td>
                <td>
                  <select
                    className="admin-active-select"
                    value={p.active === false ? "no" : "yes"}
                    onChange={(e) =>
                      setActive(p.id, e.target.value === "yes")
                    }
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </td>
                <td className="admin-price-preview">
                  {formatInr(draft[p.id]?.pricePerKg ?? p.pricePerKg)} /{" "}
                  {formatInr(draft[p.id]?.bulkPricePerKg ?? p.bulkPricePerKg)}
                </td>
                <td>
                  <div className="admin-row-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => startEdit(p)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => onDelete(p.id, p.name)}
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="admin-save-row">
          <button
            type="button"
            className={`btn btn-primary${saving ? " is-loading" : ""}`}
            onClick={saveAll}
            disabled={saving || itemBusy}
          >
            {saving ? (
              <>
                <span className="spinner spinner-sm spinner-light" aria-hidden />
                Saving prices…
              </>
            ) : (
              "Save prices"
            )}
          </button>
          {saved && <span className="alert alert-ok">Saved</span>}
        </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}
