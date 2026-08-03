"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useStore } from "@/lib/store";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/prices", label: "Prices" },
  { href: "/admin/partners", label: "Delivery partners" },
  { href: "/admin/settings", label: "Shop & delivery" },
];

export function AdminShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { logoutAdmin } = useStore();
  const router = useRouter();

  return (
    <div className="container admin-layout">
      <aside className="admin-nav">
        <strong style={{ padding: "0.35rem 0.75rem", marginBottom: "0.35rem" }}>
          Admin
        </strong>
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={pathname === l.href ? "active" : undefined}
          >
            {l.label}
          </Link>
        ))}
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ marginTop: "0.75rem" }}
          onClick={() => {
            logoutAdmin();
            router.push("/admin/login");
          }}
        >
          Logout
        </button>
      </aside>
      <div>
        <h1 style={{ marginTop: 0 }}>{title}</h1>
        {children}
      </div>
    </div>
  );
}
