"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Heart, Trash2, RefreshCcw, ArrowRight } from "lucide-react";
import { apiFetch } from "../../lib/api";
import type { Property } from "../../lib/property.types";

type ToastState = { show: boolean; text: string };

function Toast({ show, text }: { show: boolean; text: string }) {
  return (
    <div
      className={[
        "fixed right-6 top-6 z-[9999] transition-all duration-200",
        show ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none",
      ].join(" ")}
    >
      <div className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg ring-1 ring-white/10">
        {text}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[30px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] p-10 text-center shadow-sm">
      <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-[22px] bg-emerald-50 ring-1 ring-emerald-200">
        <Heart className="h-6 w-6 text-emerald-700" />
      </div>

      <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Your wishlist is empty</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-6 text-slate-600">
        Browse listings and save the homes you want to revisit. Once properties are added, they
        will appear here in your shortlist workspace.
      </p>

      <a
        href="/buyer/search-properties"
        className="mt-7 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
      >
        Browse Properties <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}

type WishlistItem = { propertyId: Property | null };
type ListResponse = { items: WishlistItem[] };

export default function BuyerWishlistPage() {
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState<ToastState>({ show: false, text: "" });
  const toastTimer = useRef<number | null>(null);

  const wishlistSet = useMemo(() => new Set(wishlistIds), [wishlistIds]);

  function showToast(text: string) {
    setToast({ show: true, text });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => {
      setToast((t) => ({ ...t, show: false }));
    }, 1400);
  }

  async function refresh() {
    setLoading(true);
    try {
      const res = await apiFetch<ListResponse>("/wishlist");
      const properties = (res.items || [])
        .map((item) => item.propertyId)
        .filter((item): item is Property => Boolean(item));

      setAllProperties(properties);
      setWishlistIds(properties.map((item) => item._id));
      showToast("Refreshed");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const savedItems = useMemo(() => {
    return allProperties.filter((p) => wishlistSet.has(p._id));
  }, [allProperties, wishlistSet]);

  async function removeOne(id: string) {
    try {
      await apiFetch(`/wishlist/${id}`, { method: "DELETE" });

      const next = wishlistIds.filter((x) => x !== id);
      setWishlistIds(next);
      setAllProperties((prev) => prev.filter((p) => p._id !== id));
      showToast("Removed from wishlist");
    } catch (e) {
      console.error(e);
    }
  }

  function clearAll() {
    showToast("Clear all is not available yet");
  }

  return (
    <main className="min-h-screen w-full min-w-0 bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(52,211,153,0.12),transparent_24%),linear-gradient(180deg,#f3fff9_0%,#ecfdf5_100%)] p-4 sm:p-6">
      <Toast show={toast.show} text={toast.text} />

      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-emerald-200/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-6 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:px-8 sm:py-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-50">
                Saved workspace
              </span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Your wishlist</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/90 sm:text-base">
                Review saved properties, revisit pricing and highlights, and jump back into the
                buyer flow from one polished shortlist view.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={refresh}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
                title="Refresh"
              >
                Refresh <RefreshCcw className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white/90 backdrop-blur-sm transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                title="Clear all"
                disabled
              >
                Clear all <Trash2 className="h-4 w-4" />
              </button>

              <a
                href="/buyer/search-properties"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-50"
                title="Browse"
              >
                Browse <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[28px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-600">Saved properties</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{wishlistIds.length}</p>
                <p className="mt-2 text-sm text-slate-500">Total items in your shortlist.</p>
              </div>
              <div className="rounded-2xl bg-[linear-gradient(135deg,#18794e_0%,#72d6ab_100%)] p-3 text-white shadow-sm">
                <Heart className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-600">Visible cards</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{savedItems.length}</p>
                <p className="mt-2 text-sm text-slate-500">Properties currently rendered below.</p>
              </div>
              <div className="rounded-2xl bg-[linear-gradient(135deg,#18794e_0%,#72d6ab_100%)] p-3 text-white shadow-sm">
                <RefreshCcw className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-600">Wishlist status</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                  {loading ? "..." : wishlistIds.length > 0 ? "Active" : "Empty"}
                </p>
                <p className="mt-2 text-sm text-slate-500">Use refresh anytime to sync this view.</p>
              </div>
              <div className="rounded-2xl bg-[linear-gradient(135deg,#18794e_0%,#72d6ab_100%)] p-3 text-white shadow-sm">
                <ArrowRight className="h-5 w-5" />
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-[30px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] p-10 shadow-sm">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-200">
                <RefreshCcw className="h-5 w-5 animate-spin text-emerald-700" />
              </div>
              <div className="text-lg font-bold text-slate-900">Loading wishlist...</div>
              <p className="mt-2 text-sm text-slate-500">
                Preparing your saved properties and shortlist view.
              </p>
            </div>
          </div>
        ) : wishlistIds.length === 0 ? (
          <EmptyState />
        ) : savedItems.length === 0 ? (
          <div className="rounded-[30px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-slate-50 ring-1 ring-slate-200">
              <RefreshCcw className="h-5 w-5 text-slate-700" />
            </div>
            <div className="text-lg font-extrabold tracking-tight text-slate-900">
              Saved properties could not be rendered
            </div>
            <p className="mt-2 text-sm font-medium text-slate-600">
              Click refresh to try loading the latest wishlist items again.
            </p>
            <button
              type="button"
              onClick={refresh}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
            >
              Refresh <RefreshCcw className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {savedItems.map((p) => (
              <motion.div
                key={p._id}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.18 }}
                className="group overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-sm transition hover:shadow-[0_18px_40px_-26px_rgba(16,185,129,0.22)]"
              >
                <div className="relative overflow-hidden">
                  <div className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-emerald-900 ring-1 ring-black/10 backdrop-blur-sm">
                    <Heart className="h-4 w-4 fill-emerald-600 text-emerald-600" />
                    Saved
                  </div>

                  <img
                    src={p.images[0]?.url}
                    alt={p.title ?? "Property image"}
                    className="h-[220px] w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/45 to-transparent" />
                </div>

                <div className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Saved price
                      </p>
                      <div className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                        {p.currency} {Number(p.price || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 ring-1 ring-emerald-200">
                      Wishlist
                    </div>
                  </div>

                  <div>
                    <div className="line-clamp-2 text-base font-bold leading-6 text-slate-900">
                      {p.title}
                    </div>
                    <div className="mt-2 text-sm text-slate-500">{p.address || p.location}</div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-100">
                      {p.beds} beds
                    </span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-100">
                      {p.baths} baths
                    </span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-100">
                      {p.sqft} sq ft
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`/buyer/property/${p._id}`}
                      className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl bg-emerald-50 px-4 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
                    >
                      View Details
                    </a>

                    <button
                      type="button"
                      onClick={() => removeOne(p._id)}
                      className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50"
                      title="Remove"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
