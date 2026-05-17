"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";
import BuyerHeader from "@/components/buyer/BuyerHeader";
import BuyerSidebar from "@/components/buyer/BuyerSidebar";
import { BuyerAuthProvider, type BuyerUser } from "./BuyerAuthContext";
import {
  BUYER_CACHE_KEYS,
  readFreshBuyerCache,
  writeBuyerCache,
} from "./prefetchCache";

export default function BuyerShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = React.useState(true);
  const [authReady, setAuthReady] = React.useState(false);
  const [user, setUser] = React.useState<BuyerUser | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const cached = readFreshBuyerCache<{ success: boolean; user: BuyerUser }>(
          BUYER_CACHE_KEYS.auth
        );
        const res = cached || (await apiFetch<{ success: boolean; user: BuyerUser }>("/auth/me"));
        const nextUser = res?.user || null;
        const role = (nextUser?.role || "").toLowerCase();

        if (mounted) {
          setUser(nextUser);
        }

        if (role !== "buyer") {
          if (role === "admin" || role === "superadmin") {
            router.replace("/admin/overview");
          } else if (role === "seller" || role === "agent") {
            router.replace("/seller/seller-dashboard");
          } else {
            router.replace("/login");
          }
          return;
        }
        writeBuyerCache(BUYER_CACHE_KEYS.auth, res);
        if (mounted) setAuthReady(true);
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
    if (!authReady) return;

    const warm = async () => {
      const jobs: Array<Promise<void>> = [];
      if (!readFreshBuyerCache(BUYER_CACHE_KEYS.wishlist)) {
        jobs.push(
          apiFetch("/wishlist")
            .then((data) => writeBuyerCache(BUYER_CACHE_KEYS.wishlist, data))
            .catch(() => {})
        );
      }
      if (!readFreshBuyerCache(BUYER_CACHE_KEYS.leads)) {
        jobs.push(
          apiFetch("/leads/my-inquiries")
            .then((data) => writeBuyerCache(BUYER_CACHE_KEYS.leads, data))
            .catch(() => {})
        );
      }
      if (!readFreshBuyerCache(BUYER_CACHE_KEYS.propertiesDashboard)) {
        jobs.push(
          apiFetch("/properties?limit=12&sort=latest&dashboard=true")
            .then((data) => writeBuyerCache(BUYER_CACHE_KEYS.propertiesDashboard, data))
            .catch(() => {})
        );
      }
      if (!readFreshBuyerCache(BUYER_CACHE_KEYS.offersDashboard)) {
        jobs.push(
          apiFetch("/properties?limit=6&sort=latest&offersOnly=true&dashboard=true")
            .then((data) => writeBuyerCache(BUYER_CACHE_KEYS.offersDashboard, data))
            .catch(() => {})
        );
      }
      if (!readFreshBuyerCache(BUYER_CACHE_KEYS.notifications)) {
        jobs.push(
          apiFetch("/notifications?limit=10")
            .then((data) => writeBuyerCache(BUYER_CACHE_KEYS.notifications, data))
            .catch(() => {})
        );
      }
      await Promise.all(jobs);
    };

    void warm();
  }, [authReady]);

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
    <BuyerAuthProvider value={{ user }}>
      <div className="min-h-[100dvh] overflow-hidden bg-[#F7FCFA]">
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
            {checking ? (
              <div className="mx-auto max-w-7xl space-y-6">
                <div className="h-52 rounded-[32px] bg-slate-200/70" />
                <div className="grid gap-4 md:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-32 rounded-[24px] bg-white shadow-sm" />
                  ))}
                </div>
                <div className="h-[360px] rounded-[28px] bg-white shadow-sm" />
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </BuyerAuthProvider>
  );
}
