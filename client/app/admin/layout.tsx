"use client";

import React from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = React.useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await apiFetch<{ success: boolean; user: { role?: string } }>(
          "/auth/admin/me"
        );

        const role = (res?.user?.role || "").toLowerCase();
        const ok = role === "admin" || role === "superadmin";

        if (!ok) {
          if (role === "buyer") {
            router.replace("/buyer/buyer-dashboard");
          } else if (role === "seller" || role === "agent") {
            router.replace("/");
          } else {
            router.replace("/admin-login");
          }
          return;
        }
      } catch {
        router.replace("/admin-login");
        return;
      } finally {
        if (mounted) setChecking(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router, pathname]);

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

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f4fbf7]">
        <div className="rounded-2xl bg-white px-6 py-4 shadow-sm ring-1 ring-black/5">
          <div className="text-sm font-semibold text-slate-700">Checking admin access...</div>
        </div>
      </div>
    );
  }

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
          {children}
        </main>
      </div>
    </div>
  );
}
