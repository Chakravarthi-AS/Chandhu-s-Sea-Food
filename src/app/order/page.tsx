"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  RETAIL_GRAM_OPTIONS,
  RETAIL_KG_OPTIONS,
  formatInr,
  formatPhoneDisplay,
  formatQtyParts,
  haversineKm,
  qtyFromKgGrams,
  tonsToKg,
} from "@/lib/defaults";
import { useStore } from "@/lib/store";
import type { OrderLineItem, OrderMode } from "@/lib/types";
import { CustomerOtpModal } from "@/components/CustomerOtpModal";

const DeliveryMap = dynamic(
  () => import("@/components/DeliveryMap").then((m) => m.DeliveryMap),
  {
    ssr: false,
    loading: () => (
      <div className="map-wrap" style={{ display: "grid", placeItems: "center" }}>
        Loading map…
      </div>
    ),
  }
);

type CartLine = {
  key: string;
  productId: string;
  mode: OrderMode;
  kg: number;
  grams: number;
  bulkValue: number;
  bulkUnit: "kg" | "tons";
};

function lineQuantityKg(line: CartLine): number {
  if (line.mode === "retail") return qtyFromKgGrams(line.kg, line.grams);
  return line.bulkUnit === "tons" ? tonsToKg(line.bulkValue) : line.bulkValue;
}

function OrderForm() {
  const {
    state,
    placeOrder,
    ready,
    customer,
    saveCustomerLocation,
    updateCustomerName,
    getOrderByTracking,
  } = useStore();
  const { config, products } = state;
  const search = useSearchParams();
  const router = useRouter();

  const seedProduct =
    products.find((p) => p.id === search.get("product"))?.id ??
    products.find((p) => p.featured)?.id ??
    products[0]?.id;

  const [cart, setCart] = useState<CartLine[]>(() => [
    {
      key: crypto.randomUUID(),
      productId: seedProduct,
      mode: "retail",
      kg: 1,
      grams: 0,
      bulkValue: 50,
      bulkUnit: "kg",
    },
  ]);
  const [draftProductId, setDraftProductId] = useState(seedProduct);
  const [draftMode, setDraftMode] = useState<OrderMode>("retail");
  const [draftKg, setDraftKg] = useState(1);
  const [draftGrams, setDraftGrams] = useState(0);
  const [draftBulkValue, setDraftBulkValue] = useState(50);
  const [draftBulkUnit, setDraftBulkUnit] = useState<"kg" | "tons">("kg");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  // Default pin at hub (0 km) until address is geocoded or map is tapped
  const [lat, setLat] = useState(config.hubLat);
  const [lng, setLng] = useState(config.hubLng);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [submittedCode, setSubmittedCode] = useState<string | null>(
    () => search.get("placed")
  );
  const [autoConfirmed, setAutoConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOtp, setShowOtp] = useState(false);

  const placedFromUrl = search.get("placed");
  const placedOrder = useMemo(() => {
    const code = submittedCode || placedFromUrl;
    return code ? getOrderByTracking(code) : undefined;
  }, [submittedCode, placedFromUrl, getOrderByTracking, state.orders]);

  useEffect(() => {
    if (!customer) return;
    setName((n) => n || customer.name);
    setPhone(customer.phone);
    const last = customer.savedLocations[0];
    if (last) {
      setAddress((a) => a || last.address);
      setLat(last.lat);
      setLng(last.lng);
    }
  }, [customer]);

  useEffect(() => {
    if (!placedFromUrl) {
      setSubmittedCode(null);
      setAutoConfirmed(false);
    } else {
      setSubmittedCode(placedFromUrl);
    }
  }, [placedFromUrl]);

  async function lookupAddress(raw?: string) {
    const q = (raw ?? address).trim();
    if (q.length < 8) {
      setGeoStatus("Enter a fuller address, then we’ll calculate distance.");
      return;
    }
    setGeoLoading(true);
    setGeoStatus("Looking up address on map…");
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) {
        setGeoStatus(data.error || "Could not find address. Tap the map to set pin.");
        return;
      }
      setLat(data.lat);
      setLng(data.lng);
      const d = haversineKm(config.hubLat, config.hubLng, data.lat, data.lng);
      setGeoStatus(
        `Pin set from address (~${d.toFixed(1)} km from hub). Adjust on map if needed.`
      );
    } catch {
      setGeoStatus("Lookup failed. Tap the map to set your delivery pin.");
    } finally {
      setGeoLoading(false);
    }
  }

  const cartLines = useMemo(() => {
    return cart.map((line) => {
      const product = products.find((p) => p.id === line.productId) ?? products[0];
      const quantityKg = lineQuantityKg(line);
      const pricePerKg =
        line.mode === "bulk" ? product.bulkPricePerKg : product.pricePerKg;
      const lineTotalInr = Math.round(quantityKg * pricePerKg);
      return { line, product, quantityKg, pricePerKg, lineTotalInr };
    });
  }, [cart, products]);

  const totalKg = cartLines.reduce((s, l) => s + l.quantityKg, 0);
  const totalInr = cartLines.reduce((s, l) => s + l.lineTotalInr, 0);
  const distanceKm = haversineKm(config.hubLat, config.hubLng, lat, lng);

  const underMinWeight = totalKg < config.minKgForExtended;
  const outsideRetailRadius = distanceKm > config.retailDeliveryRadiusKm;
  const blockedRetailOutside = underMinWeight && outsideRetailRadius;
  const willAutoConfirm = !underMinWeight;

  const draftQty =
    draftMode === "retail"
      ? qtyFromKgGrams(draftKg, draftGrams)
      : draftBulkUnit === "tons"
        ? tonsToKg(draftBulkValue)
        : draftBulkValue;

  function validateDraftQty(): string | null {
    if (draftMode === "retail") {
      if (draftQty < 0.5) return "Retail item must be at least 500 g (0.5 kg).";
      if (draftQty > 10) return "Retail item max is 10 kg. Use bulk for more.";
      if (draftKg === 0 && draftGrams === 0) return "Select kg and/or grams.";
    } else if (draftQty < 11) {
      return "Bulk items should be above 10 kg (or use tons).";
    }
    return null;
  }

  function addToCart() {
    setError(null);
    const err = validateDraftQty();
    if (err) {
      setError(err);
      return;
    }
    setCart((c) => [
      ...c,
      {
        key: crypto.randomUUID(),
        productId: draftProductId,
        mode: draftMode,
        kg: draftKg,
        grams: draftGrams,
        bulkValue: draftBulkValue,
        bulkUnit: draftBulkUnit,
      },
    ]);
  }

  function removeFromCart(key: string) {
    setCart((c) => (c.length <= 1 ? c : c.filter((l) => l.key !== key)));
  }

  function validateOrder(): string | null {
    if (cart.length === 0) return "Add at least one item to the cart.";
    if (!name.trim() || !phone.trim() || !address.trim()) {
      return "Please fill name, phone, and delivery address.";
    }
    for (const row of cartLines) {
      if (row.line.mode === "retail") {
        if (row.quantityKg < 0.5 || row.quantityKg > 10) {
          return `${row.product.name}: retail quantity must be 0.5–10 kg.`;
        }
      } else if (row.quantityKg < 11) {
        return `${row.product.name}: bulk must be above 10 kg.`;
      }
    }
    if (blockedRetailOutside) {
      return `Orders under ${config.minKgForExtended} kg can only be delivered within ${config.retailDeliveryRadiusKm} km of our hub. Move your pin closer or increase total quantity.`;
    }
    return null;
  }

  function buildItems(): OrderLineItem[] {
    return cartLines.map((row) => ({
      productId: row.product.id,
      productName: row.product.name,
      mode: row.line.mode,
      quantityKg: row.quantityKg,
      pricePerKg: row.pricePerKg,
      lineTotalInr: row.lineTotalInr,
    }));
  }

  function commitOrder(loggedPhone: string, loggedName: string) {
    try {
      updateCustomerName(loggedName, loggedPhone);
      const items = buildItems();
      if (!items.length) {
        setError("Add at least one item before placing the order.");
        setShowOtp(false);
        return;
      }
      const summaryName =
        items.length === 1
          ? items[0].productName
          : `${items[0].productName} +${items.length - 1} more`;
      const hasBulk = items.some((i) => i.mode === "bulk");
      const avgRate =
        totalKg > 0 ? Math.round(totalInr / totalKg) : items[0]?.pricePerKg ?? 0;

      const order = placeOrder({
        customerId: customer?.id,
        customerName: loggedName.trim(),
        customerPhone: loggedPhone,
        items,
        productId: items.length === 1 ? items[0].productId : "multi",
        productName: summaryName,
        mode: hasBulk ? "bulk" : "retail",
        quantityKg: Math.round(totalKg * 1000) / 1000,
        pricePerKg: avgRate,
        totalInr,
        address: address.trim(),
        lat,
        lng,
        distanceKm: Math.round(distanceKm * 10) / 10,
      });

      if (!order?.trackingCode) {
        setError("Order could not be created. Please try again.");
        setShowOtp(false);
        return;
      }

      window.setTimeout(() => {
        saveCustomerLocation(
          {
            label: "Last delivery",
            address: address.trim(),
            lat,
            lng,
          },
          loggedPhone
        );
      }, 0);

      setAutoConfirmed(order.status === "confirmed");
      setSubmittedCode(order.trackingCode);
      setShowOtp(false);
      setError(null);
      router.replace(`/order?placed=${order.trackingCode}`, { scroll: false });
    } catch (err) {
      console.error(err);
      setError("Could not place order after login. Please try submit again.");
      setShowOtp(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const validationError = validateOrder();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!customer) {
      setShowOtp(true);
      return;
    }
    commitOrder(customer.phone, name.trim() || customer.name);
  }

  if (!ready) return <p className="container section">Loading…</p>;

  const successCode = submittedCode || placedOrder?.trackingCode || null;
  const successAuto =
    autoConfirmed ||
    placedOrder?.status === "confirmed" ||
    (placedOrder?.agentNote?.includes("Auto-confirmed") ?? false);
  const successQty = placedOrder?.quantityKg ?? totalKg;

  if (successCode) {
    return (
      <div className="container section" style={{ maxWidth: 640 }}>
        <div className="panel">
          <span className="badge">
            {successAuto ? "Order confirmed" : "Order received"}
          </span>
          <h1 style={{ marginTop: "0.75rem" }}>
            {successAuto
              ? "Auto-confirmed — we’re preparing your pack"
              : "Waiting for agent confirmation"}
          </h1>
          <p style={{ color: "var(--ink-muted)" }}>
            {successAuto
              ? `Total weight is ${formatQtyParts(successQty)} (≥ ${config.minKgForExtended} kg), so this order was accepted automatically.`
              : `Orders under ${config.minKgForExtended} kg need agent confirmation before delivery.`}
          </p>
          {placedOrder?.items?.length ? (
            <ul style={{ color: "var(--ink-muted)", paddingLeft: "1.1rem" }}>
              {placedOrder.items.map((item, i) => (
                <li key={i}>
                  {item.productName} · {formatQtyParts(item.quantityKg)} ·{" "}
                  {formatInr(item.lineTotalInr)}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="alert alert-ok" style={{ margin: "1rem 0" }}>
            Tracking code: <strong>{successCode}</strong>
            {placedOrder ? (
              <>
                <br />
                Distance ~{placedOrder.distanceKm} km · Total{" "}
                {formatInr(placedOrder.totalInr)}
              </>
            ) : null}
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href={`/track?code=${successCode}`} className="btn btn-primary">
              Track order
            </Link>
            <Link href="/account" className="btn btn-ghost">
              My orders &amp; locations
            </Link>
            <Link href="/order" className="btn btn-ghost">
              New order
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container section">
      <div className="section-head">
        <h1>Place your order</h1>
        <p>
          Add multiple seafood items to one order. Use kg + grams for retail
          (e.g. 4 kg + 500 g = 4.5 kg). Under {config.minKgForExtended} kg needs
          agent confirmation; {config.minKgForExtended} kg and above auto-accepts.
        </p>
      </div>

      {customer ? (
        <div className="alert alert-ok" style={{ marginBottom: "1rem" }}>
          Logged in as <strong>{customer.name}</strong> (
          {formatPhoneDisplay(customer.phone)})
          {customer.savedLocations.length > 0 && (
            <> · {customer.savedLocations.length} saved location(s)</>
          )}
        </div>
      ) : (
        <div className="alert alert-info" style={{ marginBottom: "1rem" }}>
          Fill the cart freely. Mobile OTP is required only when you submit.
        </div>
      )}

      <form onSubmit={onSubmit} className="two-col">
        <div className="panel form-grid">
          <h2 style={{ margin: 0, fontSize: "1.15rem" }}>Add item</h2>

          <div className="mode-tabs" role="tablist">
            <button
              type="button"
              className={draftMode === "retail" ? "active" : ""}
              onClick={() => setDraftMode("retail")}
            >
              Retail
            </button>
            <button
              type="button"
              className={draftMode === "bulk" ? "active" : ""}
              onClick={() => setDraftMode("bulk")}
            >
              Bulk
            </button>
          </div>

          <div className="form-row">
            <label htmlFor="product">Seafood item</label>
            <select
              id="product"
              value={draftProductId}
              onChange={(e) => setDraftProductId(e.target.value)}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} —{" "}
                  {formatInr(
                    draftMode === "bulk" ? p.bulkPricePerKg : p.pricePerKg
                  )}
                  /kg
                </option>
              ))}
            </select>
          </div>

          {draftMode === "retail" ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.75rem",
              }}
            >
              <div className="form-row">
                <label htmlFor="qty-kg">Kilograms</label>
                <select
                  id="qty-kg"
                  value={draftKg}
                  onChange={(e) => setDraftKg(Number(e.target.value))}
                >
                  {RETAIL_KG_OPTIONS.map((k) => (
                    <option key={k} value={k}>
                      {k} kg
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label htmlFor="qty-g">Grams</label>
                <select
                  id="qty-g"
                  value={draftGrams}
                  onChange={(e) => setDraftGrams(Number(e.target.value))}
                >
                  {RETAIL_GRAM_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      {g} g
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 120px",
                gap: "0.75rem",
              }}
            >
              <div className="form-row">
                <label htmlFor="bulkValue">Bulk quantity</label>
                <input
                  id="bulkValue"
                  type="number"
                  min={draftBulkUnit === "tons" ? 0.01 : 11}
                  step={draftBulkUnit === "tons" ? 0.01 : 1}
                  value={draftBulkValue}
                  onChange={(e) => setDraftBulkValue(Number(e.target.value))}
                />
              </div>
              <div className="form-row">
                <label htmlFor="bulkUnit">Unit</label>
                <select
                  id="bulkUnit"
                  value={draftBulkUnit}
                  onChange={(e) =>
                    setDraftBulkUnit(e.target.value as "kg" | "tons")
                  }
                >
                  <option value="kg">kg</option>
                  <option value="tons">tons</option>
                </select>
              </div>
            </div>
          )}

          <div className="alert alert-info">
            This item: <strong>{formatQtyParts(draftQty)}</strong>
            {draftMode === "retail" && draftQty >= 0.5 && draftQty <= 10 && (
              <> ({draftKg} kg + {draftGrams} g)</>
            )}
          </div>

          <button type="button" className="btn btn-ghost" onClick={addToCart}>
            + Add to cart
          </button>

          <h2 style={{ margin: "0.5rem 0 0", fontSize: "1.15rem" }}>
            Your cart ({cart.length})
          </h2>
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {cartLines.map((row) => (
              <div
                key={row.line.key}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  alignItems: "flex-start",
                  padding: "0.75rem",
                  background: "var(--bg-soft)",
                  borderRadius: 10,
                }}
              >
                <div>
                  <strong>
                    {row.product.imageEmoji} {row.product.name}
                  </strong>
                  <div style={{ fontSize: "0.9rem", color: "var(--ink-muted)" }}>
                    {row.line.mode} · {formatQtyParts(row.quantityKg)} ·{" "}
                    {formatInr(row.pricePerKg)}/kg ·{" "}
                    <strong>{formatInr(row.lineTotalInr)}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={cart.length <= 1}
                  onClick={() => removeFromCart(row.line.key)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="alert alert-ok">
            Cart total: <strong>{formatQtyParts(totalKg)}</strong> ·{" "}
            <strong>{formatInr(totalInr)}</strong>
            {willAutoConfirm ? (
              <> · Will auto-confirm (≥ {config.minKgForExtended} kg)</>
            ) : (
              <> · Needs agent confirm (&lt; {config.minKgForExtended} kg)</>
            )}
          </div>

          <div className="form-row">
            <label htmlFor="name">Your name</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Customer name"
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="phone">Phone / WhatsApp</label>
            <input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile"
              required
              disabled={!!customer}
            />
          </div>

          {customer && customer.savedLocations.length > 0 && (
            <div className="form-row">
              <label htmlFor="saved-loc">Use saved location</label>
              <select
                id="saved-loc"
                defaultValue=""
                onChange={(e) => {
                  const loc = customer.savedLocations.find(
                    (l) => l.id === e.target.value
                  );
                  if (!loc) return;
                  setAddress(loc.address);
                  setLat(loc.lat);
                  setLng(loc.lng);
                }}
              >
                <option value="">Choose a saved address…</option>
                {customer.savedLocations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}: {l.address.slice(0, 48)}
                    {l.address.length > 48 ? "…" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-row">
            <label htmlFor="address">Delivery address</label>
            <textarea
              id="address"
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onBlur={() => {
                if (address.trim().length >= 8) void lookupAddress();
              }}
              placeholder="e.g. 3-100, Ushodaya Colony, Tiruchanoor, Tirupati, 517503"
              required
            />
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={geoLoading || address.trim().length < 8}
            onClick={() => void lookupAddress()}
          >
            {geoLoading ? "Finding on map…" : "Find address on map"}
          </button>
          {geoStatus && (
            <div
              className={`alert ${geoStatus.includes("Pin set") ? "alert-ok" : "alert-info"}`}
            >
              {geoStatus}
            </div>
          )}

          {blockedRetailOutside && (
            <div className="alert alert-warn">
              Your pin is ~{distanceKm.toFixed(1)} km from hub. Orders under{" "}
              {config.minKgForExtended} kg must be within{" "}
              {config.retailDeliveryRadiusKm} km.
            </div>
          )}
          {!blockedRetailOutside && willAutoConfirm && (
            <div className="alert alert-ok">
              Distance ~{distanceKm.toFixed(1)} km · Total {formatQtyParts(totalKg)}{" "}
              — order will be <strong>auto-confirmed</strong>.
            </div>
          )}
          {!blockedRetailOutside && !willAutoConfirm && (
            <div className="alert alert-info">
              Distance ~{distanceKm.toFixed(1)} km · Under{" "}
              {config.minKgForExtended} kg — agent must confirm before delivery.
            </div>
          )}

          {error && <div className="alert alert-warn">{error}</div>}

          <button type="submit" className="btn btn-primary">
            {customer
              ? willAutoConfirm
                ? "Place order (auto-confirm)"
                : "Submit for agent confirmation"
              : "Login with OTP & place order"}
          </button>
        </div>

        <div style={{ display: "grid", gap: "0.75rem" }}>
          <p style={{ margin: 0, color: "var(--ink-muted)", fontSize: "0.95rem" }}>
            Enter your address (or tap <em>Find address on map</em>) to calculate
            distance. You can also tap the map to fine-tune the pin. Teal circle ={" "}
            {config.retailDeliveryRadiusKm} km range.
          </p>
          <DeliveryMap
            hubLat={config.hubLat}
            hubLng={config.hubLng}
            hubLabel={config.hubAddress}
            radiusKm={config.retailDeliveryRadiusKm}
            deliveryLat={lat}
            deliveryLng={lng}
            onPickDelivery={(la, ln) => {
              setLat(la);
              setLng(ln);
              setGeoStatus(
                `Pin set on map (~${haversineKm(config.hubLat, config.hubLng, la, ln).toFixed(1)} km from hub).`
              );
            }}
          />
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--ink-muted)" }}>
            Hub: {config.hubAddress}
            <br />
            Current pin distance: <strong>~{distanceKm.toFixed(1)} km</strong>
          </p>
        </div>
      </form>

      <CustomerOtpModal
        open={showOtp}
        initialPhone={phone}
        initialName={name}
        title="Confirm with mobile OTP"
        subtitle="Verify your number to place this order. We’ll save order history and this delivery location."
        onClose={() => setShowOtp(false)}
        onSuccess={(loggedPhone, loggedName) => {
          setPhone(loggedPhone);
          setName(loggedName);
          // Defer so React finishes customer login state before placing order
          window.setTimeout(() => {
            commitOrder(loggedPhone, loggedName);
          }, 0);
        }}
      />
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<p className="container section">Loading order…</p>}>
      <OrderForm />
    </Suspense>
  );
}
