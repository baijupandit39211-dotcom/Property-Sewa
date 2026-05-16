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
  const hasCheckedAuth = React.useRef(false);

  React.useEffect(() => {
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;

    let mounted = true;
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
        const authPromise = apiFetch<{ success: boolean; user: { role?: string } }>(
          "/auth/admin/me"
        );
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
      } catch {
        router.replace("/login");
        return;
      } finally {
        if (timeoutId) window.clearTimeout(timeoutId);
        if (mounted) setChecking(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

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
