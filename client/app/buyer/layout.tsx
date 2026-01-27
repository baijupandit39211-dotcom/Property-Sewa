"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";

import BuyerHeader from "@/components/buyer/BuyerHeader";
import BuyerSidebar from "@/components/buyer/BuyerSidebar";

export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await apiFetch<{ success: boolean; user: { role?: string } }>(
          "/auth/me"
        );

        const role = (res?.user?.role || "").toLowerCase();

        // ✅ KEEP YOUR LOGIC EXACTLY
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
      } catch (e: any) {
        console.log("BuyerLayout auth failed:", e?.message);
        router.replace("/login");
        return;
      } finally {
        if (mounted) setChecking(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F3FBF7]">
        <div className="rounded-2xl bg-white px-6 py-4 shadow-sm ring-1 ring-black/5">
          <div className="text-sm font-semibold text-slate-700">
            Checking buyer access...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-[#F3FBF7]">
      <div className="fixed inset-x-0 top-0 z-50">
        <BuyerHeader />
      </div>

      <div className="pt-16">
        <BuyerSidebar />

        <main className="ml-64 h-[calc(100vh-64px)] overflow-y-auto px-8 py-7">
          {children}
        </main>
      </div>
    </div>
  );
}
