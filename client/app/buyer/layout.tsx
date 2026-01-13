"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";

import BuyerHeader from "@/components/buyer/BuyerHeader";
import BuyerSidebar from "@/components/buyer/BuyerSidebar";

export default function BuyerLayout({ children }: { children: React.ReactNode }) {
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

        // ✅ Only buyer can stay in /buyer/*
        if (role !== "buyer") {
          if (role === "admin" || role === "superadmin") {
            router.replace("/admin/overview");
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
            Checking buyer access...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-emerald-50">
      <BuyerHeader />
      <div className="flex">
        <BuyerSidebar />
        <main className="w-full px-10 py-8">{children}</main>
      </div>
    </div>
  );
}
