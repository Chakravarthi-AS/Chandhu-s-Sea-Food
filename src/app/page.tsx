"use client";

import dynamic from "next/dynamic";
import { useStore } from "@/lib/store";
import { formatInr } from "@/lib/defaults";
import Link from "next/link";

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

export default function HomePage() {
  const { state, ready } = useStore();
  const { config, products } = state;
  const featured = products.filter((p) => p.featured);
  const rest = products.filter((p) => !p.featured);

  if (!ready) {
    return (
      <div className="container section">
        <p>Loading Chandhu Sea Food…</p>
      </div>
    );
  }

  return (
    <>
      <section className="hero">
        <div className="container hero-content">
          <p className="badge" style={{ marginBottom: "1rem" }}>
            Tirupati · Andhra Pradesh
          </p>
          <h1 className="hero-brand">{config.shopName}</h1>
          <h2>{config.tagline}</h2>
          <p>
            Prawns are our specialty — retail with kg + grams (e.g. 4.5 kg), plus
            bulk from kilograms to tons. Multi-item carts welcome. Orders under
            2 kg need agent confirmation; 2 kg and above are auto-accepted.
          </p>
          <div className="hero-actions">
            <Link href="/order" className="btn btn-primary">
              Order fresh prawns
            </Link>
            <a
              href="#fresh"
              className="btn btn-ghost"
              style={{ color: "white", borderColor: "rgba(255,255,255,.35)" }}
            >
              Why we&apos;re different
            </a>
          </div>
        </div>
        <div className="hero-wave" aria-hidden />
      </section>

      <section className="section" id="fresh">
        <div className="container">
          <div className="section-head">
            <h2>Fresh from Nellore. Never frozen.</h2>
            <p>
              We bring seafood in daily from Nellore and clean every part in-house
              with strict hygiene — so what reaches your kitchen is truly fresh.
            </p>
          </div>
          <div className="promise-grid">
            <article className="promise">
              <div className="icon">🚚</div>
              <h3>Daily Nellore import</h3>
              <p>
                Catch and farm-fresh stock arrives from Nellore every day — not
                held as frozen inventory.
              </p>
            </article>
            <article className="promise">
              <div className="icon">❄️</div>
              <h3>No frozen seafood</h3>
              <p>
                We do not sell frozen prawns or fish. Ice-packed freshness only,
                for taste you can trust.
              </p>
            </article>
            <article className="promise">
              <div className="icon">🧼</div>
              <h3>Cleaned by our team</h3>
              <p>
                Every piece is cleaned by our own employees under hygienic
                standards before packing.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="section" id="menu" style={{ background: "var(--bg-soft)" }}>
        <div className="container">
          <div className="section-head">
            <h2>Today&apos;s menu</h2>
            <p>
              Prices shown in INR per kg — fully configurable in Admin. Demo
              rates for showcase; you can update them anytime.
            </p>
          </div>
          <div className="product-grid">
            {[...featured, ...rest].map((p) => (
              <article key={p.id} className="product-card">
                <div className="emoji" aria-hidden>
                  {p.imageEmoji}
                </div>
                {p.category === "prawns" && <span className="badge">Prawns</span>}
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <div className="price-row">
                  <span className="price">{formatInr(p.pricePerKg)}/kg</span>
                  <span style={{ fontSize: "0.85rem", color: "var(--ink-muted)" }}>
                    Bulk {formatInr(p.bulkPricePerKg)}/kg
                  </span>
                </div>
                <Link href={`/order?product=${p.id}`} className="btn btn-primary btn-sm">
                  Order now
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="delivery">
        <div className="container two-col">
          <div>
            <div className="section-head">
              <h2>Delivery around our Tirupati hub</h2>
              <p>
                Orders under {config.minKgForExtended} kg are delivered within{" "}
                {config.retailDeliveryRadiusKm} km of our hub and need agent
                confirmation. Orders of {config.minKgForExtended} kg and above
                are auto-confirmed.
              </p>
            </div>
            <ul style={{ color: "var(--ink-muted)", paddingLeft: "1.1rem" }}>
              <li>Retail: kg dropdown + grams (e.g. 4 kg + 500 g)</li>
              <li>Multi-item cart in one order</li>
              <li>Map pin = your delivery address vs hub range</li>
              <li>
                Under {config.minKgForExtended} kg → agent confirm;{" "}
                {config.minKgForExtended}+ kg → auto-accept
              </li>
            </ul>
            <Link href="/order" className="btn btn-primary" style={{ marginTop: "1rem" }}>
              Start an order
            </Link>
          </div>
          <DeliveryMap
            hubLat={config.hubLat}
            hubLng={config.hubLng}
            hubLabel={config.hubAddress}
            radiusKm={config.retailDeliveryRadiusKm}
            deliveryLat={config.hubLat + 0.03}
            deliveryLng={config.hubLng + 0.02}
            interactive={false}
          />
        </div>
      </section>

      <section className="section" id="contact" style={{ background: "var(--bg-soft)" }}>
        <div className="container">
          <div className="section-head">
            <h2>Support &amp; help</h2>
            <p>
              Questions on orders, bulk quotes, or delivery? Reach us anytime
              during shop hours.
            </p>
          </div>
          <div className="contact-block" style={{ maxWidth: 560 }}>
            <div className="contact-item">
              <span aria-hidden>📞</span>
              <div>
                <strong>Phone</strong>
                <div>{config.supportPhone}</div>
              </div>
            </div>
            <div className="contact-item">
              <span aria-hidden>💬</span>
              <div>
                <strong>WhatsApp</strong>
                <div>{config.supportWhatsApp}</div>
              </div>
            </div>
            <div className="contact-item">
              <span aria-hidden>✉️</span>
              <div>
                <strong>Email</strong>
                <div>{config.supportEmail}</div>
              </div>
            </div>
            <div className="contact-item">
              <span aria-hidden>🕐</span>
              <div>
                <strong>Hours</strong>
                <div>{config.supportHours}</div>
              </div>
            </div>
            <div className="contact-item">
              <span aria-hidden>📍</span>
              <div>
                <strong>Hub</strong>
                <div>{config.hubAddress}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
