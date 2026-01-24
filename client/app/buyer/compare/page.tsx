"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Heart,
  RefreshCcw,
  Scale,
  Trash2,
  X,
} from "lucide-react";

import { apiFetch } from "../../lib/api";
import type { Property } from "../../lib/property.types";

type ListResponse = { items: Property[] };

const WISHLIST_KEY = "property-sewa:wishlist:v1";
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
        show
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-2 pointer-events-none",
      ].join(" ")}
      style={{
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
      }}
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
        <Scale className="h-7 w-7 text-emerald-700" />
      </div>

      <h2 className="text-2xl font-black tracking-tight text-slate-900">
        No properties to compare
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm font-semibold text-slate-600">
        Go to Search Properties and tap{" "}
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">
          <Scale className="h-3.5 w-3.5" /> Compare
        </span>{" "}
        . You can compare up to {MAX_COMPARE} properties.
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

/** ---------- formatting helpers ---------- */
function fmtPrice(p?: Property) {
  if (!p) return "—";
  const currency = p.currency || "NPR";
  const price = Number(p.price) || 0;
  return `${currency} ${price.toLocaleString()}`;
}

function yesNo(v: boolean) {
  return v ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-900 ring-1 ring-emerald-200">
      <Check className="h-3.5 w-3.5" /> Yes
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
      <X className="h-3.5 w-3.5" /> No
    </span>
  );
}

export default function BuyerComparePage() {
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const [toast, setToast] = useState<ToastState>({ show: false, text: "" });
  const toastTimer = useRef<number | null>(null);

  const compareSet = useMemo(() => new Set(compareIds), [compareIds]);
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
      const cIds = readIds(COMPARE_KEY);
      const wIds = readIds(WISHLIST_KEY);
      setCompareIds(cIds);
      setWishlistIds(wIds);

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

  const compareItems = useMemo(() => {
    // keep order like localStorage ids
    const map = new Map(allProperties.map((p) => [p._id, p]));
    return compareIds.map((id) => map.get(id)).filter(Boolean) as Property[];
  }, [allProperties, compareIds]);

  const left = compareItems[0];
  const right = compareItems[1];

  function removeFromCompare(id: string) {
    const next = compareIds.filter((x) => x !== id);
    setCompareIds(next);
    writeIds(COMPARE_KEY, next);
    showToast("Removed from compare");
  }

  function clearCompare() {
    setCompareIds([]);
    writeIds(COMPARE_KEY, []);
    showToast("Compare cleared");
  }

  function addToWishlist(id: string) {
    if (wishlistSet.has(id)) {
      showToast("Already in wishlist");
      return;
    }
    const next = [id, ...wishlistIds];
    setWishlistIds(next);
    writeIds(WISHLIST_KEY, next);
    showToast("Added to wishlist");
  }

  const rows = useMemo(
    () => [
      { label: "Price", a: fmtPrice(left), b: fmtPrice(right) },
      { label: "Location", a: left?.address || left?.location || "—", b: right?.address || right?.location || "—" },
      { label: "Beds", a: left?.beds ?? "—", b: right?.beds ?? "—" },
      { label: "Baths", a: left?.baths ?? "—", b: right?.baths ?? "—" },
      { label: "Sqft", a: left?.sqft ?? "—", b: right?.sqft ?? "—" },
      {
        label: "Has Images",
        a: yesNo(!!left?.images?.length),
        b: yesNo(!!right?.images?.length),
        isNode: true,
      },
    ],
    [left, right]
  );

  return (
    <main
      className="w-full min-w-0 px-10 py-8 antialiased"
      style={{
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        textRendering: "optimizeLegibility",
      }}
    >
      <Toast show={toast.show} text={toast.text} />

      {/* Header card */}
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-emerald-100/60">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">
              Compare properties (local device)
            </p>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">
              Compare
            </h1>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              {compareIds.length}/{MAX_COMPARE} selected
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
              onClick={clearCompare}
              disabled={compareIds.length === 0}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50"
              title="Clear all"
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
          Loading compare...
        </div>
      ) : compareItems.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Top cards (no blur: only hover uses translate on card itself) */}
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            {compareItems.map((p) => (
              <motion.div
                key={p._id}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5"
              >
                <div className="relative">
                  <img
                    src={p.images?.[0]?.url}
                    alt={p.title ?? "Property image"}
                    className="h-[220px] w-full object-cover"
                  />

                  <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-900 ring-1 ring-black/10">
                    <Scale className="h-4 w-4 text-slate-900" />
                    Comparing
                  </div>
                </div>

                <div className="p-5">
                  <div className="text-2xl font-black tracking-tight text-slate-900">
                    {fmtPrice(p)}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-800 line-clamp-2">
                    {p.title}
                  </div>
                  <div className="mt-2 text-xs font-semibold text-emerald-700">
                    {p.beds} beds · {p.baths} baths · {p.sqft} sq ft
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {p.address || p.location}
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <a
                      href={`/buyer/property/${p._id}`}
                      className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-emerald-50 px-4 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
                    >
                      View Details
                    </a>

                    <button
                      type="button"
                      onClick={() => addToWishlist(p._id)}
                      className={[
                        "grid h-11 w-11 place-items-center rounded-full ring-1 transition hover:bg-slate-50",
                        wishlistSet.has(p._id)
                          ? "bg-emerald-600 text-white ring-emerald-600"
                          : "bg-white text-slate-800 ring-slate-200",
                      ].join(" ")}
                      title={
                        wishlistSet.has(p._id) ? "In wishlist" : "Add to wishlist"
                      }
                      aria-label="Add to wishlist"
                    >
                      <Heart
                        className={[
                          "h-4 w-4",
                          wishlistSet.has(p._id) ? "fill-white" : "",
                        ].join(" ")}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => removeFromCompare(p._id)}
                      className="grid h-11 w-11 place-items-center rounded-full bg-white text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50"
                      title="Remove from compare"
                      aria-label="Remove from compare"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Comparison table (CRISP: no motion/transform on container) */}
          <div className="mt-8 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70">
            <div className="border-b border-slate-200/70 px-6 py-5">
              <h2 className="text-2xl font-black tracking-tight text-slate-900">
                Side-by-side comparison
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                Compare key features quickly.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full border-separate border-spacing-0">
                <thead>
                  <tr className="bg-slate-50/70">
                    <th className="sticky left-0 z-10 border-b border-slate-200/70 bg-slate-50/70 px-6 py-4 text-left text-xs font-extrabold uppercase tracking-wide text-slate-700">
                      Feature
                    </th>
                    <th className="border-b border-slate-200/70 px-6 py-4 text-left">
                      <div className="text-sm font-extrabold text-slate-900">
                        {left?.title || "Property A"}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">
                        {left ? fmtPrice(left) : ""}
                      </div>
                    </th>
                    <th className="border-b border-slate-200/70 px-6 py-4 text-left">
                      <div className="text-sm font-extrabold text-slate-900">
                        {right?.title || `Select 2nd property`}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">
                        {right ? fmtPrice(right) : `Go to Browse → Compare`}
                      </div>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={r.label} className={idx % 2 ? "bg-slate-50/40" : ""}>
                      <td className="sticky left-0 z-10 border-b border-slate-200/70 bg-white px-6 py-5 text-sm font-extrabold text-slate-900">
                        {r.label}
                      </td>

                      <td className="border-b border-slate-200/70 px-6 py-5 text-sm font-semibold text-slate-800">
                        {r.isNode ? r.a : <span className="tabular-nums">{String(r.a)}</span>}
                      </td>

                      <td className="border-b border-slate-200/70 px-6 py-5 text-sm font-semibold text-slate-800">
                        {r.isNode ? r.b : <span className="tabular-nums">{String(r.b)}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
