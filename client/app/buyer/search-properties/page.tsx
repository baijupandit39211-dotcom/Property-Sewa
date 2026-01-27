"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, Scale } from "lucide-react";
import { apiFetch } from "../../lib/api";
import type { Property } from "../../lib/property.types";

type ListResponse = {
  items: Property[];
};

// ✅ Wishlist key
const WISHLIST_KEY = "property-sewa:wishlist:v1";
// ✅ Compare key
const COMPARE_KEY = "property-sewa:compare:v1";
const MAX_COMPARE = 2;

/** ---------- localStorage helpers ---------- */
function readIds(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const ids = parsed?.ids;
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

function writeIds(key: string, ids: string[]) {
  localStorage.setItem(key, JSON.stringify({ ids }));
}

/** ---------- UI: toast ---------- */
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

/** ---------- UI: empty state ---------- */
function EmptyState() {
  return (
    <div className="mt-6 rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200/70">
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-200">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" className="text-emerald-700">
          <path
            d="M12 21s-7-4.35-9.33-8.2C.5 9.2 2.1 6 5.7 6c2 0 3.3 1.1 4.3 2.3C11 7.1 12.3 6 14.3 6c3.6 0 5.2 3.2 3.03 6.8C19 16.65 12 21 12 21Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path
            d="M7.5 12.2h2l1 2.2 1.2-3 1 1.8h3.8"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h2 className="text-2xl font-extrabold text-slate-900">No properties found</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm font-semibold text-slate-600">
        Try again later or explore other listings. You can ❤️ save or ⚖️ compare properties.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <a
          href="/buyer/wishlist"
          className="inline-flex items-center justify-center rounded-full bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
        >
          Go to Wishlist
        </a>
        <a
          href="/buyer/compare"
          className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
          Go to Compare
        </a>
      </div>
    </div>
  );
}

export default function SearchPropertiesPage() {
  const [items, setItems] = useState<Property[]>([]);

  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const [toast, setToast] = useState<ToastState>({ show: false, text: "" });
  const toastTimer = useRef<number | null>(null);

  // heart pop
  const [poppingIds, setPoppingIds] = useState<Record<string, boolean>>({});
  // compare pop
  const [comparePopIds, setComparePopIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    apiFetch<ListResponse>("/properties")
      .then((res) => setItems(res.items))
      .catch(console.error);

    setWishlistIds(readIds(WISHLIST_KEY));
    setCompareIds(readIds(COMPARE_KEY));
  }, []);

  const wishlistSet = useMemo(() => new Set(wishlistIds), [wishlistIds]);
  const compareSet = useMemo(() => new Set(compareIds), [compareIds]);

  function showToast(text: string) {
    setToast({ show: true, text });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => {
      setToast((t) => ({ ...t, show: false }));
    }, 1400);
  }

  function pop(id: string, setMap: React.Dispatch<React.SetStateAction<Record<string, boolean>>>) {
    setMap((s) => ({ ...s, [id]: true }));
    window.setTimeout(() => {
      setMap((s) => {
        const next = { ...s };
        delete next[id];
        return next;
      });
    }, 240);
  }

  // ✅ Wishlist toggle
  function toggleWishlist(id: string) {
    const has = wishlistSet.has(id);
    const next = has ? wishlistIds.filter((x) => x !== id) : [id, ...wishlistIds];
    setWishlistIds(next);
    writeIds(WISHLIST_KEY, next);

    showToast(has ? "Removed from wishlist" : "Saved to wishlist");
    if (!has) pop(id, setPoppingIds);
  }

  // ✅ Compare toggle (max 2)
  function toggleCompare(id: string) {
    const has = compareSet.has(id);

    // remove
    if (has) {
      const next = compareIds.filter((x) => x !== id);
      setCompareIds(next);
      writeIds(COMPARE_KEY, next);
      showToast("Removed from compare");
      return;
    }

    // add (max 2)
    if (compareIds.length >= MAX_COMPARE) {
      showToast(`Compare is full (${MAX_COMPARE}/${MAX_COMPARE})`);
      return;
    }

    const next = [id, ...compareIds];
    setCompareIds(next);
    writeIds(COMPARE_KEY, next);
    showToast("Added to compare");
    pop(id, setComparePopIds);
  }

  return (
    <main className="w-full min-w-0 px-10 py-8">
      <Toast show={toast.show} text={toast.text} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Search Results</h1>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            ❤️ Save to wishlist · ⚖️ Compare up to {MAX_COMPARE} properties
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/buyer/wishlist"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
          >
            Wishlist ({wishlistIds.length})
          </a>

          <a
            href="/buyer/compare"
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            Compare ({compareIds.length}/{MAX_COMPARE})
          </a>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {items.map((p) => {
            const saved = wishlistSet.has(p._id);
            const compareOn = compareSet.has(p._id);

            const heartPop = !!poppingIds[p._id];
            const scalePop = !!comparePopIds[p._id];

            return (
              <div
                key={p._id}
                className="relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 hover:shadow-md"
              >
                {/* ✅ Compare button */}
                <button
                  type="button"
                  onClick={() => toggleCompare(p._id)}
                  className={[
                    "absolute left-3 top-3 z-10 inline-flex items-center gap-2 rounded-full px-3 py-2",
                    "text-xs font-semibold ring-1 transition active:scale-95",
                    compareOn
                      ? "bg-slate-900 text-white ring-slate-900"
                      : "bg-white/90 text-slate-700 ring-black/10 hover:bg-white",
                    scalePop ? "scale-105" : "",
                  ].join(" ")}
                  aria-label={compareOn ? "Remove from compare" : "Add to compare"}
                  title={compareOn ? "Remove from compare" : "Add to compare"}
                >
                  <Scale className={["h-4 w-4", scalePop ? "scale-110" : ""].join(" ")} />
                  {compareOn ? "Comparing" : "Compare"}
                </button>

                {/* ✅ Wishlist button */}
                <button
                  type="button"
                  onClick={() => toggleWishlist(p._id)}
                  className={[
                    "absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full",
                    "ring-1 transition active:scale-95",
                    saved
                      ? "bg-emerald-600 text-white ring-emerald-600"
                      : "bg-white/90 text-slate-700 ring-black/10 hover:bg-white",
                    heartPop ? "scale-110" : "",
                  ].join(" ")}
                  aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
                  title={saved ? "Saved" : "Save"}
                >
                  <Heart
                    className={[
                      "h-5 w-5 transition-transform duration-200",
                      saved ? "fill-white" : "",
                      heartPop ? "scale-110" : "",
                    ].join(" ")}
                  />
                </button>

                {/* Card link */}
                <a href={`/buyer/property/${p._id}`} className="block">
                  <img
                    src={p.images[0]?.url}
                    alt={p.title ?? "Property image"}
                    className="h-[120px] w-full object-cover"
                  />

                  <div className="p-4">
                    <div className="font-bold text-slate-900">
                      {p.currency} {Number(p.price || 0).toLocaleString()}
                    </div>

                    <div className="mt-1 text-xs font-semibold text-emerald-700">
                      {p.beds} Beds · {p.baths} Baths · {p.sqft} sqft
                    </div>

                    <div className="mt-2 text-xs text-zinc-600">
                      {p.address || p.location}
                    </div>
                  </div>
                </a>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
