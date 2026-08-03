"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useStore } from "@/lib/store";

export function AdminGuard({ children }: { children: ReactNode }) {
  const { adminLoggedIn, ready } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/admin/login";

  useEffect(() => {
    if (!ready) return;
    if (!adminLoggedIn && !isLogin) {
      router.replace("/admin/login");
    }
    if (adminLoggedIn && isLogin) {
      router.replace("/admin");
    }
  }, [ready, adminLoggedIn, isLogin, router]);

  if (!ready) {
    return <p className="container section">Loading admin…</p>;
  }

  if (!adminLoggedIn && !isLogin) {
    return <p className="container section">Redirecting to login…</p>;
  }

  if (adminLoggedIn && isLogin) {
    return <p className="container section">Redirecting…</p>;
  }

  return <>{children}</>;
}
