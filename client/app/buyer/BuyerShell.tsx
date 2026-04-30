"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";
import BuyerHeader from "@/components/buyer/BuyerHeader";
import BuyerSidebar from "@/components/buyer/BuyerSidebar";
import { BuyerAuthProvider, type BuyerUser } from "./BuyerAuthContext";

export default function BuyerShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = React.useState(true);
  const [user, setUser] = React.useState<BuyerUser | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await apiFetch<{ success: boolean; user: BuyerUser }>("/auth/me");
        const nextUser = res?.user || null;
        const role = (nextUser?.role || "").toLowerCase();

        if (mounted) {
          setUser(nextUser);
        }

        if (role !== "buyer") {
          if (role === "admin" || role === "superadmin") {
            router.replace("/admin/overview");
          } else if (role === "seller" || role === "agent") {
            router.replace("/");
          } else {
            router.replace("/login");
          }
          return;
        }
      } catch (error: any) {
        console.log("BuyerLayout auth failed:", error?.message);
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
      <div className="grid min-h-screen place-items-center bg-[#F3FBF7]">
        <div className="rounded-2xl bg-white px-6 py-4 shadow-sm ring-1 ring-black/5">
          <div className="text-sm font-semibold text-slate-700">Checking buyer access...</div>
        </div>
      </div>
    );
  }

  return (
    <BuyerAuthProvider value={{ user }}>
      <div className="min-h-[100dvh] overflow-hidden bg-[#F3FBF7]">
        <div className="fixed inset-x-0 top-0 z-50">
          <BuyerHeader
            mobileSidebarOpen={mobileSidebarOpen}
            onToggleSidebar={() => setMobileSidebarOpen((open) => !open)}
          />
        </div>

        <div className="pt-16">
          <BuyerSidebar
            mobileOpen={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
          />
          <main className="ml-0 h-[calc(100dvh-64px)] overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 lg:ml-64 lg:px-8 lg:py-7">
            {children}
          </main>
        </div>
      </div>
    </BuyerAuthProvider>
  );
}
