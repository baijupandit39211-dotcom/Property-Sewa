"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import SellerHeader from "@/components/seller/SellerHeader";
import SellerSidebar from "@/components/seller/SellerSidebar";

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checking, setChecking] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await apiFetch<{ success: boolean; user?: { role?: string } }>("/auth/me");
        const role = (res?.user?.role || "").toLowerCase();
        const ok = role === "seller" || role === "agent";

        if (!ok) {
          if (role === "admin" || role === "superadmin") {
            router.replace("/admin/overview");
          } else if (role === "buyer") {
            router.replace("/buyer/buyer-dashboard");
          } else {
            router.replace("/login");
          }
          return;
        }
      } catch (error: any) {
        console.log("SellerLayout auth failed:", error?.message);
        router.replace("/login");
        return;
      } finally {
        if (mounted) {
          setChecking(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F1F7F4]">
        <div className="rounded-2xl bg-white px-6 py-4 shadow-sm ring-1 ring-black/5">
          <div className="text-sm font-semibold text-slate-700">Checking seller access...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#F1F7F4] flex flex-col">
      <div className="sticky top-0 z-50">
        <SellerHeader />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-shrink-0">
          <SellerSidebar />
        </div>
        <main className="flex-1 overflow-y-auto px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
