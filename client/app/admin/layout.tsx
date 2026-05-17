"use client";

import React from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminSidebar from "@/components/admin/AdminSidebar";
import {
  ADMIN_CACHE_KEYS,
  readFreshAdminCache,
  writeAdminCache,
} from "@/app/admin/prefetchCache";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = React.useState(true);
  const [authReady, setAuthReady] = React.useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const timeoutMs = 8000;

    const resolveRedirect = (role: string) => {
      if (role === "buyer") {
        router.replace("/buyer/buyer-dashboard");
      } else if (role === "seller" || role === "agent") {
        router.replace("/seller/seller-dashboard");
      } else {
        router.replace("/login");
      }
    };

    (async () => {
      let timeoutId: number | null = null;
      try {
        const cached = readFreshAdminCache<{ success: boolean; user: { role?: string } }>(
          ADMIN_CACHE_KEYS.auth
        );
        const authPromise = cached
          ? Promise.resolve(cached)
          : apiFetch<{ success: boolean; user: { role?: string } }>("/auth/admin/me");
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = window.setTimeout(() => reject(new Error("auth_check_timeout")), timeoutMs);
        });

        const res = await Promise.race([authPromise, timeoutPromise]);

        const role = (res?.user?.role || "").toLowerCase();
        const ok = role === "admin" || role === "superadmin";

        if (!ok) {
          resolveRedirect(role);
          return;
        }
        writeAdminCache(ADMIN_CACHE_KEYS.auth, res);
        setAuthReady(true);
      } catch {
        router.replace("/login");
        return;
      } finally {
        if (timeoutId) window.clearTimeout(timeoutId);
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  React.useEffect(() => {
    if (!authReady) return;
    const warm = async () => {
      const jobs: Array<Promise<void>> = [
        apiFetch("/api/admin/overview")
          .then((data) => writeAdminCache(ADMIN_CACHE_KEYS.overview, data))
          .catch(() => {}),
        apiFetch("/api/admin/users/stats")
          .then((data) => writeAdminCache(ADMIN_CACHE_KEYS.usersStats, data))
          .catch(() => {}),
        apiFetch("/properties/admin/pending?page=1&limit=12")
          .then((data) => writeAdminCache(ADMIN_CACHE_KEYS.listingsPending, data))
          .catch(() => {}),
        apiFetch("/api/admin/notifications?limit=10")
          .then((data) => writeAdminCache(ADMIN_CACHE_KEYS.notifications, data))
          .catch(() => {}),
      ];
      await Promise.all(jobs);
    };
    void warm();
  }, [authReady]);

  React.useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!mobileSidebarOpen) {
      document.body.style.removeProperty("overflow");
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.removeProperty("overflow");
    };
  }, [mobileSidebarOpen]);

  React.useEffect(() => {
    if (!mobileSidebarOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileSidebarOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileSidebarOpen]);

  return (
    <div className="min-h-[100dvh] bg-[#f4fbf7] overflow-hidden">
      <AdminHeader
        mobileSidebarOpen={mobileSidebarOpen}
        onToggleSidebar={() => setMobileSidebarOpen((open) => !open)}
      />

      <div className="flex h-[calc(100dvh-64px)]">
        <AdminSidebar
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />
        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 lg:ml-64 lg:px-8 lg:py-8">
          {checking ? (
            <div className="mx-auto max-w-7xl space-y-6">
              <div className="h-56 rounded-[34px] bg-slate-200/70" />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-32 rounded-2xl bg-white shadow-sm" />
                ))}
              </div>
              <div className="h-[360px] rounded-2xl bg-white shadow-sm" />
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
