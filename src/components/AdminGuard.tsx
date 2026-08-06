"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { PageLoader } from "@/components/PageLoader";
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
    return null;
  }

  if (!adminLoggedIn && !isLogin) {
    return (
      <div className="container section">
        <PageLoader label="Redirecting to login…" compact />
      </div>
    );
  }

  if (adminLoggedIn && isLogin) {
    return (
      <div className="container section">
        <PageLoader label="Opening admin…" compact />
      </div>
    );
  }

  return <>{children}</>;
}
