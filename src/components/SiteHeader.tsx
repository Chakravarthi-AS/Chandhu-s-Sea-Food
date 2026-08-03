"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";

export function SiteHeader() {
  const { state, customer, logoutCustomer, adminLoggedIn, logoutAdmin } =
    useStore();
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  return (
    <header className="site-header">
      <div className="container inner">
        <Link href="/" className="brand">
          <span className="brand-mark" aria-hidden>
            🦐
          </span>
          {state.config.shopName}
        </Link>
        <nav className="nav">
          {!isAdmin ? (
            <>
              <a href="/#fresh">Why us</a>
              <a href="/#menu">Menu</a>
              <Link href="/order">Order</Link>
              <Link href="/track">Track</Link>
              <a href="/#contact">Contact</a>
              {customer ? (
                <>
                  <Link href="/account">My orders</Link>
                  <span className="user-chip" title={customer.phone}>
                    {customer.name}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={logoutCustomer}
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link href="/account" className="btn btn-ghost btn-sm">
                  Login
                </Link>
              )}
              <Link href="/admin" className="btn btn-ghost btn-sm">
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
  );
}
