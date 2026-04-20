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
    <div className="h-screen bg-[#f4fbf7] overflow-hidden">
      <AdminHeader />

      <div className="flex h-[calc(100vh-64px)]">
        <AdminSidebar />
        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-10 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
