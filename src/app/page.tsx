"use client";

import dynamic from "next/dynamic";
import { useStore } from "@/lib/store";
import { formatInr, isProductInStock } from "@/lib/defaults";
import Link from "next/link";
import { PageLoader } from "@/components/PageLoader";

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
  const { state, productsLoading } = useStore();
  const { config, products } = state;
  const featured = products.filter((p) => p.featured);
  const rest = products.filter((p) => !p.featured);

  return (
    <>
      <section className="hero">
        <div className="ocean-wallpaper" aria-hidden>
          <div className="ocean-depth" />
          <div className="ocean-surface" />
          <div className="ocean-caustics ocean-caustics-a" />
          <div className="ocean-caustics ocean-caustics-b" />
          <div className="ocean-rays" />
          <div className="ocean-haze" />
          <div className="ocean-midwave ocean-midwave-a">
            <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
              <path d="M0,60 C180,20 360,100 540,55 C720,10 900,95 1080,50 C1260,5 1350,70 1440,45 L1440,120 L0,120 Z" />
            </svg>
            <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
              <path d="M0,60 C180,20 360,100 540,55 C720,10 900,95 1080,50 C1260,5 1350,70 1440,45 L1440,120 L0,120 Z" />
            </svg>
          </div>
          <div className="ocean-midwave ocean-midwave-b">
            <svg viewBox="0 0 1440 140" preserveAspectRatio="none">
              <path d="M0,80 C200,30 400,110 600,70 C800,30 1000,115 1200,65 C1320,40 1380,85 1440,60 L1440,140 L0,140 Z" />
            </svg>
            <svg viewBox="0 0 1440 140" preserveAspectRatio="none">
              <path d="M0,80 C200,30 400,110 600,70 C800,30 1000,115 1200,65 C1320,40 1380,85 1440,60 L1440,140 L0,140 Z" />
            </svg>
          </div>
          <div className="ocean-particles">
            <i /><i /><i /><i /><i /><i /><i /><i />
          </div>
          <div className="ocean-bubbles">
            <span /><span /><span /><span /><span /><span /><span /><span />
          </div>
          <div className="ocean-vignette" />
        </div>
        <div className="container hero-content">
          <p className="badge">Tirupati · Andhra Pradesh</p>
          <h1 className="hero-brand">{config.shopName}</h1>
          <h2>{config.tagline}</h2>
          <p>
            Prawns are our specialty — shop retail or bulk, from kilograms to
            tons. Mix items in one cart and get same-day Nellore freshness
            delivered across Tirupati.
          </p>
          <div className="hero-actions">
            <Link href="/order" className="btn btn-primary">
              Order fresh prawns
            </Link>
            <a href="#fresh" className="btn btn-ghost">
              Why we&apos;re different
            </a>
          </div>
        </div>
        <div className="hero-wave" aria-hidden>
          <div className="hero-wave-track">
            <svg viewBox="0 0 2880 80" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
              <path
                className="wave-fill wave-back"
                d="M0,44 C180,70 360,18 540,42 C720,66 900,22 1080,46 C1260,70 1440,26 1620,50 C1800,74 1980,20 2160,44 C2340,68 2520,24 2700,48 C2790,58 2835,52 2880,48 L2880,80 L0,80 Z"
              />
            </svg>
          </div>
          <div className="hero-wave-track hero-wave-track-front">
            <svg viewBox="0 0 2880 80" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
              <path
                className="wave-fill wave-front"
                d="M0,52 C160,28 320,68 480,44 C640,20 800,64 960,40 C1120,16 1280,60 1440,36 C1600,12 1760,56 1920,32 C2080,8 2240,52 2400,28 C2560,4 2720,48 2880,36 L2880,80 L0,80 Z"
              />
            </svg>
          </div>
        </div>
      </section>

      <section className="section" id="fresh">
        <div className="container">
          <div className="fish-lane" aria-hidden>
            <span className="jump-fish jump-fish-1">🐟</span>
            <span className="jump-fish jump-fish-2">🐠</span>
            <span className="jump-fish jump-fish-3">🐟</span>
            <span className="jump-fish jump-fish-4">🐡</span>
          </div>
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
            <p>Fresh catch priced per kg in INR — order what you need today.</p>
          </div>
          {productsLoading ? (
            <PageLoader label="Loading today's menu…" compact />
          ) : products.length === 0 ? (
            <div className="panel empty-menu">
              <p style={{ margin: 0, color: "var(--ink-muted)" }}>
                Menu is being updated. Check back soon, or ask us for today&apos;s
                catch.
              </p>
              <Link href="/#contact" className="btn btn-primary btn-sm" style={{ marginTop: "0.85rem" }}>
                Contact us
              </Link>
            </div>
          ) : (
          <div className="product-grid">
            {[...featured, ...rest].map((p, i) => {
              const inStock = isProductInStock(p);
              return (
              <article
                key={p.id}
                className={`product-card${inStock ? "" : " product-card--sold-out"}`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className="product-card-top">
                  {p.imageEmoji ? (
                    <div className="emoji" aria-hidden>
                      {p.imageEmoji}
                    </div>
                  ) : (
                    <div className="emoji emoji-empty" aria-hidden />
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                    {p.category === "prawns" && <span className="badge">Prawns</span>}
                    {!inStock && (
                      <span className="badge badge-sold-out">Out of stock</span>
                    )}
                  </div>
                </div>
                <h3>{p.name}</h3>
                <div className="price-row">
                  <span className="price">{formatInr(p.pricePerKg)}/kg</span>
                  <span className="bulk-price">
                    Bulk {formatInr(p.bulkPricePerKg)}/kg
                  </span>
                </div>
                {inStock ? (
                  <Link href={`/order?product=${p.id}`} className="btn btn-primary btn-sm">
                    Order now
                  </Link>
                ) : (
                  <span className="btn btn-ghost btn-sm product-card-disabled">
                    Out of stock
                  </span>
                )}
              </article>
            );
            })}
          </div>
          )}
        </div>
      </section>

      <section className="section" id="delivery">
        <div className="container two-col">
          <div>
            <div className="section-head">
              <h2>Delivered from our Tirupati hub</h2>
              <p>
                Fresh seafood from Tiruchanoor to your door — nearby small
                orders and larger bulk drops, handled by our team.
              </p>
            </div>
            <ul className="delivery-points">
              <li>Retail packs or bulk loads in one checkout</li>
              <li>Multi-item carts for home &amp; kitchen needs</li>
              <li>
                Hub coverage about {config.retailDeliveryRadiusKm} km for smaller
                orders
              </li>
              <li>Agent-backed confirmation when you need it</li>
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
