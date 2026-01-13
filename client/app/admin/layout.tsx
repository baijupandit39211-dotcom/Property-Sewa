"use client";

import React from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";

import AdminHeader from "@/components/buyer/admin/AdminHeader";
import AdminSidebar from "@/components/buyer/admin/AdminSidebar";


export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await apiFetch<{ success: boolean; user: { role?: string } }>(
          "/auth/me"
        );

        const role = (res?.user?.role || "").toLowerCase();
        const ok = role === "admin" || role === "superadmin";

        // ✅ Only admin/superadmin can stay in /admin/*
        if (!ok) {
          if (role === "buyer") {
            router.replace("/buyer/buyer-dashboard");
          } else if (role === "seller" || role === "agent") {
            router.replace("/dashboard");
          } else {
            router.replace("/login");
          }
          return;
        }
      } catch {
        router.replace("/login");
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
      <div className="min-h-screen grid place-items-center bg-[#f4fbf7]">
        <div className="rounded-2xl bg-white px-6 py-4 shadow-sm ring-1 ring-black/5">
          <div className="text-sm font-semibold text-slate-700">
            Checking admin access...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4fbf7]">
      <AdminHeader />
      <div className="flex">
        <AdminSidebar />
        <main className="w-full px-10 py-8">{children}</main>
      </div>
    </div>
  );
}
