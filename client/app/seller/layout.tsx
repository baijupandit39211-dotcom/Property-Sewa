"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/app/lib/api";
import SellerHeader from "@/components/seller/SellerHeader";
import SellerSidebar from "@/components/seller/SellerSidebar";
import { SellerAuthProvider, type SellerUser } from "./SellerAuthContext";

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [checking, setChecking] = React.useState(true);
  const [user, setUser] = React.useState<SellerUser | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await apiFetch<{ success: boolean; user?: SellerUser }>("/auth/me");
        const nextUser = res?.user || null;
        const role = (nextUser?.role || "").toLowerCase();
        const ok = role === "seller" || role === "agent";

        if (mounted) {
          setUser(nextUser);
        }

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
      <div className="grid min-h-screen place-items-center bg-[#F1F7F4]">
        <div className="rounded-2xl bg-white px-6 py-4 shadow-sm ring-1 ring-black/5">
          <div className="text-sm font-semibold text-slate-700">Checking seller access...</div>
        </div>
      </div>
    );
  }

  return (
    <SellerAuthProvider value={{ user }}>
      <div className="min-h-[100dvh] overflow-hidden bg-[#F1F7F4]">
        <div className="fixed inset-x-0 top-0 z-50">
          <SellerHeader
            mobileSidebarOpen={mobileSidebarOpen}
            onToggleSidebar={() => setMobileSidebarOpen((open) => !open)}
          />
        </div>

        <div className="flex pt-16">
          <SellerSidebar
            mobileOpen={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
          />
          <main className="ml-0 h-[calc(100dvh-64px)] flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 lg:ml-64 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </SellerAuthProvider>
  );
}
