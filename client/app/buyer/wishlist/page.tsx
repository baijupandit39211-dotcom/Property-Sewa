"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Heart, Trash2, RefreshCcw, ArrowRight } from "lucide-react";
import { apiFetch } from "../../lib/api";
import type { Property } from "../../lib/property.types";

const LS_KEY = "property-sewa:wishlist:v1";

function readWishlistIds(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const ids = parsed?.ids;
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

function writeWishlistIds(ids: string[]) {
  localStorage.setItem(LS_KEY, JSON.stringify({ ids }));
}

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
    <div className="mt-6 rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200/70">
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-200">
        <Heart className="h-6 w-6 text-emerald-700" />
      </div>

      <h2 className="text-2xl font-extrabold text-slate-900">Your wishlist is empty</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm font-semibold text-slate-600">
        Browse listings and tap ❤️ to save properties on this device.
      </p>

      <a
        href="/buyer/search-properties"
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
      >
        Browse Properties <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}

type ListResponse = { items: Property[] };

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
      const ids = readWishlistIds();
      setWishlistIds(ids);

      const res = await apiFetch<ListResponse>("/properties");
      setAllProperties(res.items || []);
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

  function removeOne(id: string) {
    const next = wishlistIds.filter((x) => x !== id);
    setWishlistIds(next);
    writeWishlistIds(next);
    showToast("Removed from wishlist");
  }

  function clearAll() {
    setWishlistIds([]);
    writeWishlistIds([]);
    showToast("Wishlist cleared");
  }

  return (
    <main className="w-full min-w-0 px-10 py-8">
      <Toast show={toast.show} text={toast.text} />

      {/* Header card */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-emerald-100/60">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Saved properties (local device)</p>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">Wishlist</h1>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              {wishlistIds.length} saved
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
              title="Refresh"
            >
              Refresh <RefreshCcw className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50"
              title="Clear all"
              disabled={wishlistIds.length === 0}
            >
              Clear all <Trash2 className="h-4 w-4" />
            </button>

            <a
              href="/buyer/search-properties"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
              title="Browse"
            >
              Browse <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="mt-6 rounded-3xl bg-white p-10 text-sm font-semibold text-slate-600 ring-1 ring-slate-200/70">
          Loading wishlist...
        </div>
      ) : wishlistIds.length === 0 ? (
        <EmptyState />
      ) : savedItems.length === 0 ? (
        <div className="mt-6 rounded-3xl bg-white p-10 text-center ring-1 ring-slate-200/70">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-slate-50 ring-1 ring-slate-200">
            <RefreshCcw className="h-5 w-5 text-slate-700" />
          </div>
          <div className="text-lg font-extrabold text-slate-900">Saved IDs found, but properties not loaded</div>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            Click refresh to reload properties.
          </p>
          <button
            type="button"
            onClick={refresh}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
          >
            Refresh <RefreshCcw className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {savedItems.map((p) => (
            <motion.div
              key={p._id}
              whileHover={{ y: -6 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 hover:shadow-md"
            >
              <div className="relative">
                <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-emerald-900 ring-1 ring-black/10">
                  <Heart className="h-4 w-4 fill-emerald-600 text-emerald-600" />
                  Saved
                </div>

                <img
                  src={p.images[0]?.url}
                  alt={p.title ?? "Property image"}
                  className="h-[180px] w-full object-cover"
                />
              </div>

              <div className="p-4">
                <div className="text-xl font-extrabold text-slate-900">
                  {p.currency} {Number(p.price || 0).toLocaleString()}
                </div>

                <div className="mt-2 text-sm font-semibold text-slate-800 line-clamp-2">
                  {p.title}
                </div>

                <div className="mt-2 text-xs font-semibold text-emerald-700">
                  {p.beds} beds · {p.baths} baths · {p.sqft} sq ft
                </div>

                <div className="mt-2 text-xs text-zinc-600">{p.address || p.location}</div>

                <div className="mt-4 flex items-center gap-2">
                  <a
                    href={`/buyer/property/${p._id}`}
                    className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-emerald-50 px-4 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
                  >
                    View Details
                  </a>

                  <button
                    type="button"
                    onClick={() => removeOne(p._id)}
                    className="grid h-11 w-11 place-items-center rounded-full bg-white text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50"
                    title="Remove"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </main>
  );
}
