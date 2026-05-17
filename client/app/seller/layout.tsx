"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { apiFetch, apiFetchSafe } from "@/app/lib/api";
import SellerHeader from "@/components/seller/SellerHeader";
import SellerSidebar from "@/components/seller/SellerSidebar";
import { SellerAuthProvider, type SellerUser } from "./SellerAuthContext";
import { readFreshCache, SELLER_CACHE_KEYS, SELLER_CACHE_TTL_MS, writeCache } from "./prefetchCache";

function normalizeRole(user: SellerUser | null) {
  return String(user?.role || "").toLowerCase();
}

function isSellerRole(user: SellerUser | null) {
  const role = normalizeRole(user);
  return role === "seller" || role === "agent";
}

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
      let usedCachedSeller = false;
      try {
        const cachedUser = readFreshCache<SellerUser | null>(SELLER_CACHE_KEYS.auth, SELLER_CACHE_TTL_MS);
        if (cachedUser && isSellerRole(cachedUser) && mounted) {
          usedCachedSeller = true;
          setUser(cachedUser);
          setChecking(false);
        }
      } catch {}

      try {
        const res = await apiFetch<{ success: boolean; user?: SellerUser }>("/auth/me");
        const nextUser = res?.user || null;
        const role = normalizeRole(nextUser);
        const ok = isSellerRole(nextUser);

        if (mounted) {
          setUser(nextUser);
          if (!usedCachedSeller) setChecking(false);
        }

        try {
          if (ok) {
            writeCache(SELLER_CACHE_KEYS.auth, nextUser);
          } else {
            window.sessionStorage.removeItem(SELLER_CACHE_KEYS.auth);
          }
        } catch {}

        if (ok) {
          // Non-blocking warm-up for common seller routes.
          void (async () => {
            const hasFreshLeads = !!readFreshCache(SELLER_CACHE_KEYS.leads);
            const hasFreshProperties = !!readFreshCache(SELLER_CACHE_KEYS.myProperties30d);
            const hasFreshNotifications = !!readFreshCache(SELLER_CACHE_KEYS.notificationsList);
            const hasFreshUnread = !!readFreshCache(SELLER_CACHE_KEYS.notificationsUnread);

            const tasks: Array<Promise<unknown>> = [];

            if (!hasFreshLeads) {
              tasks.push(
                apiFetchSafe<{ success: boolean; items: unknown[] }>("/leads/mine").then((res) => {
                  if (res?.items) {
                    writeCache(SELLER_CACHE_KEYS.leads, res.items);
                    writeCache(SELLER_CACHE_KEYS.messages, res.items);
                  }
                })
              );
            }

            if (!hasFreshProperties) {
              tasks.push(
                apiFetchSafe<{ success: boolean; data: unknown }>("/analytics/seller?range=30d").then((res) => {
                  if (res?.data) writeCache(SELLER_CACHE_KEYS.myProperties30d, res.data);
                })
              );
            }

            if (!hasFreshNotifications) {
              tasks.push(
                apiFetchSafe<{ success: boolean; items: unknown[] }>("/notifications?limit=8").then((res) => {
                  if (res?.items) writeCache(SELLER_CACHE_KEYS.notificationsList, res.items);
                })
              );
            }

            if (!hasFreshUnread) {
              tasks.push(
                apiFetchSafe<{ success: boolean; count: number }>("/notifications/unread-count").then((res) => {
                  if (typeof res?.count === "number") writeCache(SELLER_CACHE_KEYS.notificationsUnread, res.count);
                })
              );
            }

            if (tasks.length) await Promise.allSettled(tasks);
          })();
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
        try {
          window.sessionStorage.removeItem(SELLER_CACHE_KEYS.auth);
        } catch {}
        router.replace("/login");
        return;
      } finally {
        if (mounted) {
          if (!usedCachedSeller) setChecking(false);
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

  return (
    <SellerAuthProvider value={{ user }}>
      <div className="min-h-[100dvh] overflow-hidden bg-[#F1F7F4]">
        <div className="fixed inset-x-0 top-0 z-50">
          <SellerHeader
            mobileSidebarOpen={mobileSidebarOpen}
            onToggleSidebar={() => setMobileSidebarOpen((open) => !open)}
          />
        </div>

        <div className="flex pt-14">
          <SellerSidebar
            mobileOpen={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
          />
          <main className="ml-0 h-[calc(100dvh-56px)] flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 lg:ml-64 lg:px-8 lg:py-8">
            {checking ? (
              <div className="mx-auto w-full max-w-7xl space-y-6">
                <section className="overflow-hidden rounded-[24px] border border-emerald-200/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] p-5 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:p-6">
                  <div className="h-3 w-44 animate-pulse rounded-full bg-white/30" />
                  <div className="mt-4 h-9 w-64 animate-pulse rounded-xl bg-white/20" />
                  <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded-full bg-white/20" />
                </section>
                <div className="grid gap-6 lg:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-36 animate-pulse rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]"
                    />
                  ))}
                </div>
                <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="h-[440px] animate-pulse rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]" />
                  <div className="h-[440px] animate-pulse rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]" />
                </div>
              </div>
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </SellerAuthProvider>
  );
}
