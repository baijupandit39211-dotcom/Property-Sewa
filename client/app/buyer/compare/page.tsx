"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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

const COMPARE_KEY = "property-sewa:compare:v1";
const MAX_COMPARE = 2;

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

type ToastState = { show: boolean; text: string };

function Toast({ show, text }: { show: boolean; text: string }) {
  return (
    <div
      className={[
        "fixed right-6 top-6 z-[9999] transition-all duration-200",
        show ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none",
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

function EmptyState() {
  return (
    <div className="rounded-[30px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] p-10 text-center shadow-sm">
      <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-[22px] bg-emerald-50 ring-1 ring-emerald-200">
        <Scale className="h-7 w-7 text-emerald-700" />
      </div>

      <h2 className="text-2xl font-black tracking-tight text-slate-900">
        No properties to compare
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm font-medium leading-6 text-slate-600">
        Go to Search Properties and tap{" "}
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-0.5 text-xs font-bold text-white">
          <Scale className="h-3.5 w-3.5" /> Compare
        </span>{" "}
        to build a side-by-side shortlist. You can compare up to {MAX_COMPARE} properties.
      </p>

      <Link
        href="/buyer/search-properties"
        className="mt-7 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
      >
        Browse Properties <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function fmtPrice(p?: Property) {
  if (!p) return "-";
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
  const [error, setError] = useState("");

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

  async function refresh(showRefreshToast = true) {
    setLoading(true);
    setError("");
    try {
      const cIds = readIds(COMPARE_KEY);
      setCompareIds(cIds);

      const wishlistRes = await apiFetch<{
        items: Array<{ propertyId?: string | { _id?: string } }>;
      }>("/wishlist");

      const wIds = (wishlistRes.items || [])
        .map((item) =>
          typeof item.propertyId === "string" ? item.propertyId : item.propertyId?._id
        )
        .filter((id): id is string => Boolean(id));

      setWishlistIds(wIds);

      if (cIds.length === 0) {
        setAllProperties([]);
        if (showRefreshToast) showToast("Refreshed");
        return;
      }

      const res = await apiFetch<ListResponse>(`/properties?ids=${cIds.join(",")}`);
      setAllProperties(res.items || []);
      if (showRefreshToast) showToast("Refreshed");
    } catch (e) {
      console.error(e);
      setError("Failed to load compare data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const compareItems = useMemo(() => {
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

    apiFetch("/wishlist", {
      method: "POST",
      body: JSON.stringify({ propertyId: id }),
    })
      .then(() => {
        const next = [id, ...wishlistIds];
        setWishlistIds(next);
        showToast("Added to wishlist");
      })
      .catch(console.error);
  }

  const rows = useMemo(
    () => [
      { label: "Price", a: fmtPrice(left), b: fmtPrice(right) },
      { label: "Listing Type", a: left?.listingType || "-", b: right?.listingType || "-" },
      { label: "Property Type", a: left?.propertyType || "-", b: right?.propertyType || "-" },
      {
        label: "Location / Address",
        a: left?.address || left?.location || "-",
        b: right?.address || right?.location || "-",
      },
      { label: "Beds", a: left?.beds ?? "-", b: right?.beds ?? "-" },
      { label: "Baths", a: left?.baths ?? "-", b: right?.baths ?? "-" },
      { label: "Sqft", a: left?.sqft ?? "-", b: right?.sqft ?? "-" },
      {
        label: "Offer Status",
        a: left?.offerActive ? "Active offer" : "-",
        b: right?.offerActive ? "Active offer" : "-",
      },
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
      className="min-h-screen w-full min-w-0 bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(52,211,153,0.12),transparent_24%),linear-gradient(180deg,#f3fff9_0%,#ecfdf5_100%)] p-4 antialiased sm:p-6"
      style={{
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        textRendering: "optimizeLegibility",
      }}
    >
      <Toast show={toast.show} text={toast.text} />

      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-emerald-200/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-6 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:px-8 sm:py-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-50">
                Compare workspace
              </span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Buyer compare
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/90 sm:text-base">
                Review shortlisted homes side by side, compare key property details, and make a
                faster buyer decision from one production-style comparison workspace.
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
                onClick={clearCompare}
                disabled={compareIds.length === 0}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white/90 backdrop-blur-sm transition hover:bg-white/15 disabled:opacity-60"
                title="Clear all"
              >
                Clear all <Trash2 className="h-4 w-4" />
              </button>

              <Link
                href="/buyer/search-properties"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-50"
                title="Browse"
              >
                Browse <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[28px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-600">Selected properties</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                  {compareIds.length}
                </p>
                <p className="mt-2 text-sm text-slate-500">Compared items on this device.</p>
              </div>
              <div className="rounded-2xl bg-[linear-gradient(135deg,#18794e_0%,#72d6ab_100%)] p-3 text-white shadow-sm">
                <Scale className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-600">Rendered cards</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                  {compareItems.length}
                </p>
                <p className="mt-2 text-sm text-slate-500">Live compare results currently shown.</p>
              </div>
              <div className="rounded-2xl bg-[linear-gradient(135deg,#18794e_0%,#72d6ab_100%)] p-3 text-white shadow-sm">
                <RefreshCcw className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-600">Wishlist overlap</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                  {compareItems.filter((item) => wishlistSet.has(item._id)).length}
                </p>
                <p className="mt-2 text-sm text-slate-500">Compared items already saved to wishlist.</p>
              </div>
              <div className="rounded-2xl bg-[linear-gradient(135deg,#18794e_0%,#72d6ab_100%)] p-3 text-white shadow-sm">
                <Heart className="h-5 w-5" />
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
              <div className="text-lg font-bold text-slate-900">Loading compare...</div>
              <p className="mt-2 text-sm text-slate-500">
                Preparing your selected properties for a clean side-by-side view.
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-[30px] border border-rose-200 bg-[linear-gradient(180deg,#ffffff_0%,#fff8f8_100%)] p-10 text-center shadow-sm">
            <div className="text-lg font-extrabold text-rose-700">{error}</div>
            <p className="mt-2 text-sm font-medium text-slate-600">
              Please try refreshing the page or loading the selected properties again.
            </p>
            <button
              type="button"
              onClick={() => refresh()}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
            >
              Refresh <RefreshCcw className="h-4 w-4" />
            </button>
          </div>
        ) : compareItems.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {compareItems.length === 1 && (
              <section className="rounded-[28px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 ring-1 ring-emerald-200">
                      1 of {MAX_COMPARE} selected
                    </div>
                    <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
                      Add one more property to complete the comparison
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600">
                      You have selected one property. Add another listing from Search Properties to
                      compare pricing, location, and key features side by side.
                    </p>
                  </div>

                  <Link
                    href="/buyer/search-properties"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
                  >
                    Add Another Property <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </section>
            )}

            <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {compareItems.map((p) => (
                <motion.div
                  key={p._id}
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="group overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-sm transition hover:shadow-[0_18px_40px_-26px_rgba(16,185,129,0.22)]"
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={p.images?.[0]?.url}
                      alt={p.title ?? "Property image"}
                      className="h-[260px] w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />

                    <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/92 px-3 py-1.5 text-xs font-bold text-slate-900 ring-1 ring-black/10 backdrop-blur-sm">
                      <Scale className="h-4 w-4 text-slate-900" />
                      Comparing
                    </div>

                    <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/55 to-transparent" />
                  </div>

                  <div className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Compare price
                        </p>
                        <div className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                          {fmtPrice(p)}
                        </div>
                      </div>
                      <div className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 ring-1 ring-emerald-200">
                        {p.listingType || "Listing"}
                      </div>
                    </div>

                    <div>
                      <div className="line-clamp-2 text-base font-bold leading-6 text-slate-900">
                        {p.title}
                      </div>
                      <div className="mt-2 text-sm text-slate-500">
                        {p.address || p.location}
                      </div>
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
                      <Link
                        href={`/buyer/property/${p._id}`}
                        className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl bg-emerald-50 px-4 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
                      >
                        View Details
                      </Link>

                      <button
                        type="button"
                        onClick={() => addToWishlist(p._id)}
                        className={[
                          "grid h-11 w-11 place-items-center rounded-2xl ring-1 transition hover:bg-slate-50",
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
                        className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50"
                        title="Remove from compare"
                        aria-label="Remove from compare"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </section>

            <section className="overflow-hidden rounded-[28px] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)] shadow-sm">
              <div className="border-b border-emerald-100/80 px-6 py-5">
                <h2 className="text-2xl font-black tracking-tight text-slate-900">
                  Side-by-side comparison
                </h2>
                <p className="mt-1 text-sm font-medium text-slate-600">
                  Compare buyer-focused property details quickly and spot the strongest fit.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full border-separate border-spacing-0 text-sm">
                  <thead className="bg-emerald-50/70 text-slate-600">
                    <tr>
                      <th className="sticky left-0 z-10 border-b border-emerald-100 bg-emerald-50/70 px-6 py-4 text-left text-xs font-extrabold uppercase tracking-wide text-slate-700">
                        Feature
                      </th>
                      <th className="border-b border-emerald-100 px-6 py-4 text-left">
                        <div className="text-sm font-extrabold text-slate-900">
                          {left?.title || "Property A"}
                        </div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">
                          {left ? fmtPrice(left) : ""}
                        </div>
                      </th>
                      <th className="border-b border-emerald-100 px-6 py-4 text-left">
                        <div className="text-sm font-extrabold text-slate-900">
                          {right?.title || "Select 2nd property"}
                        </div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">
                          {right ? fmtPrice(right) : "Go to Browse → Compare"}
                        </div>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((r, idx) => (
                      <tr key={r.label} className={idx % 2 ? "bg-emerald-50/30" : "bg-white"}>
                        <td className="sticky left-0 z-10 border-b border-emerald-100 bg-white px-6 py-5 text-sm font-extrabold text-slate-900">
                          {r.label}
                        </td>

                        <td className="border-b border-emerald-100 px-6 py-5 text-sm font-semibold text-slate-800">
                          {r.isNode ? r.a : <span className="tabular-nums">{String(r.a)}</span>}
                        </td>

                        <td className="border-b border-emerald-100 px-6 py-5 text-sm font-semibold text-slate-800">
                          {r.isNode ? r.b : <span className="tabular-nums">{String(r.b)}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
