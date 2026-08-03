"use client";

import { useStore } from "@/lib/store";

export function SiteFooter() {
  const { state } = useStore();
  const { config } = state;

  return (
    <footer className="site-footer">
      <div className="container" style={{ display: "grid", gap: "0.75rem" }}>
        <strong>{config.shopName}</strong>
        <p style={{ margin: 0 }}>
          Fresh seafood daily from Nellore · Hub: {config.hubAddress}
        </p>
        <p style={{ margin: 0, fontSize: "0.9rem", opacity: 0.75 }}>
          Support: {config.supportPhone} · {config.supportEmail} ·{" "}
          {config.supportHours}
        </p>
      </div>
    </footer>
  );
}
