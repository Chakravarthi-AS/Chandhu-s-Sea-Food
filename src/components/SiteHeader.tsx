"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";

export function SiteHeader() {
  const { state, customer, logoutCustomer, adminLoggedIn, logoutAdmin } =
    useStore();
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle("nav-open", menuOpen);
    return () => document.body.classList.remove("nav-open");
  }, [menuOpen]);

  return (
    <>
      <header className="site-header">
        <div className="container inner">
          <Link href="/" className="brand">
            <span className="brand-mark" aria-hidden>
              🦐
            </span>
            <span className="brand-text">{state.config.shopName}</span>
          </Link>

          {!isAdmin && (
            <button
              type="button"
              className={`nav-toggle ${menuOpen ? "open" : ""}`}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span />
              <span />
              <span />
            </button>
          )}

          <nav className={`nav ${menuOpen ? "open" : ""}`}>
            {!isAdmin ? (
              <>
                <a href="/#fresh" onClick={() => setMenuOpen(false)}>
                  Why us
                </a>
                <a href="/#menu" onClick={() => setMenuOpen(false)}>
                  Menu
                </a>
                <Link href="/order" onClick={() => setMenuOpen(false)}>
                  Order
                </Link>
                <Link href="/track" onClick={() => setMenuOpen(false)}>
                  Track
                </Link>
                <a href="/#contact" onClick={() => setMenuOpen(false)}>
                  Contact
                </a>
                {customer ? (
                  <>
                    <Link href="/account" onClick={() => setMenuOpen(false)}>
                      My orders
                    </Link>
                    <span className="user-chip" title={customer.phone}>
                      {customer.name}
                    </span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        logoutCustomer();
                        setMenuOpen(false);
                      }}
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <Link
                    href="/account"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setMenuOpen(false)}
                  >
                    Login
                  </Link>
                )}
                <Link
                  href="/admin"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setMenuOpen(false)}
                >
                  Admin
                </Link>
              </>
            ) : (
              <>
                <Link href="/">← Storefront</Link>
                {adminLoggedIn && (
                  <>
                    <Link href="/admin">Dashboard</Link>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={logoutAdmin}
                    >
                      Admin logout
                    </button>
                  </>
                )}
              </>
            )}
          </nav>
        </div>
      </header>

      {!isAdmin && (
        <nav className="mobile-tabbar" aria-label="Quick navigation">
          <Link
            href="/"
            className={pathname === "/" ? "active" : undefined}
          >
            <span aria-hidden>🏠</span>
            Home
          </Link>
          <Link
            href="/order"
            className={pathname.startsWith("/order") ? "active" : undefined}
          >
            <span aria-hidden>🛒</span>
            Order
          </Link>
          <Link
            href="/track"
            className={pathname.startsWith("/track") ? "active" : undefined}
          >
            <span aria-hidden>📍</span>
            Track
          </Link>
          <Link
            href="/account"
            className={pathname.startsWith("/account") ? "active" : undefined}
          >
            <span aria-hidden>👤</span>
            {customer ? "Account" : "Login"}
          </Link>
        </nav>
      )}

      {menuOpen && (
        <button
          type="button"
          className="nav-scrim"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </>
  );
}
