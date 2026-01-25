"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Compass,
  Scale,
  Search,
  Heart,
  ArrowRight,
} from "lucide-react";

import { apiFetch } from "../../lib/api";
import type { Property } from "../../lib/property.types";

type ListResponse = {
  success: boolean;
  items: Property[];
};

/**
 * ✅ Brand color (as you gave)
 * HEX: #316249
 */
const BRAND = "#316249";

// ✅ keys (KEEP)
const WISHLIST_KEY = "property-sewa:wishlist:v1";
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

const pageEnter = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

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
    >
      <div className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg ring-1 ring-white/10">
        {text}
      </div>
    </div>
  );
}

export default function BuyerDashboardPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  // ✅ toast popup
  const [toast, setToast] = useState<ToastState>({ show: false, text: "" });
  const toastTimer = useRef<number | null>(null);

  // ✅ pop animations on click
  const [wishPopIds, setWishPopIds] = useState<Record<string, boolean>>({});
  const [comparePopIds, setComparePopIds] = useState<Record<string, boolean>>(
    {}
  );

  useEffect(() => {
    setWishlistIds(readIds(WISHLIST_KEY));
    setCompareIds(readIds(COMPARE_KEY));

    apiFetch<ListResponse>("/properties?limit=12")
      .then((res) => setProperties(res.items))
      .catch(console.error);
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

  function pop(
    id: string,
    setMap: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  ) {
    setMap((s) => ({ ...s, [id]: true }));
    window.setTimeout(() => {
      setMap((s) => {
        const next = { ...s };
        delete next[id];
        return next;
      });
    }, 240);
  }

  // ✅ KEEP YOUR FUNCTIONS (same behavior) + restored toast/pop
  function toggleWishlist(id: string) {
    const has = wishlistSet.has(id);
    const next = has
      ? wishlistIds.filter((x) => x !== id)
      : [id, ...wishlistIds];

    setWishlistIds(next);
    writeIds(WISHLIST_KEY, next);

    showToast(has ? "Removed from wishlist" : "Saved to wishlist");
    if (!has) pop(id, setWishPopIds);
  }

  function toggleCompare(id: string) {
    const has = compareSet.has(id);

    if (has) {
      const next = compareIds.filter((x) => x !== id);
      setCompareIds(next);
      writeIds(COMPARE_KEY, next);
      showToast("Removed from compare");
      return;
    }

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

  const featured = useMemo(() => properties.slice(0, 4), [properties]);
  const recommended = useMemo(() => properties.slice(4, 7), [properties]);
  const recent = useMemo(() => properties.slice(0, 2), [properties]);

  return (
    <motion.main
      initial="hidden"
      animate="show"
      variants={pageEnter}
      className="w-full min-w-0 space-y-10"
    >
      <Toast show={toast.show} text={toast.text} />

      {/* ✅ Hero */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[38px] font-extrabold leading-tight text-slate-900">
              Welcome back, User
            </h1>
            <p className="text-sm font-medium text-emerald-700">
              Here are properties curated for you
            </p>
          </div>

          {/* ✅ Mortgage + Saved pill like your screenshot */}
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/buyer/mortgage-calculator"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-slate-800 ring-1 ring-[#316249]/25 transition hover:bg-slate-50 active:scale-[0.98]"
            >
              Mortgage Calculator
              <Compass className="h-4 w-4" />
            </a>

            <a
              href="/buyer/wishlist"
              className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white ring-1 transition hover:opacity-95 active:scale-[0.98]"
              style={{ backgroundColor: BRAND, borderColor: BRAND }}
              title="Open saved properties"
            >
              Saved ({wishlistIds.length})
              <Heart className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Stats row (bigger + correct brand) */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Stat
            icon={<Clock3 className="h-5 w-5 text-white" />}
            title="Recently Viewed"
            sub="3 properties"
          />
          <Stat
            icon={<Search className="h-5 w-5 text-white" />}
            title="Saved Searches"
            sub="2 searches"
          />
          <Stat
            icon={<BookmarkCheck className="h-5 w-5 text-white" />}
            title="Saved Properties"
            sub={`${wishlistIds.length} properties`}
          />
          <Stat
            icon={<Scale className="h-5 w-5 text-white" />}
            title="Compared Properties"
            sub={`${compareIds.length} properties`}
          />
        </div>
      </div>

      {/* Featured */}
      <section className="space-y-4">
        <h2 className="text-2xl font-extrabold text-slate-900">
          Featured Properties
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {featured.map((p) => (
            <PropertyCard
              key={p._id}
              p={p}
              big={false}
              showMeta
              wishSaved={wishlistSet.has(p._id)}
              wishPop={!!wishPopIds[p._id]}
              onToggleWish={() => toggleWishlist(p._id)}
              compareOn={compareSet.has(p._id)}
              comparePop={!!comparePopIds[p._id]}
              onToggleCompare={() => toggleCompare(p._id)}
            />
          ))}
        </div>

        <Pagination />
      </section>

      {/* Recommended */}
      <section className="space-y-4">
        <h2 className="text-2xl font-extrabold text-slate-900">
          Recommended for You
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {recommended.map((p) => (
            <PropertyCard
              key={p._id}
              p={p}
              big
              showMeta={false}
              wishSaved={wishlistSet.has(p._id)}
              wishPop={!!wishPopIds[p._id]}
              onToggleWish={() => toggleWishlist(p._id)}
              compareOn={compareSet.has(p._id)}
              comparePop={!!comparePopIds[p._id]}
              onToggleCompare={() => toggleCompare(p._id)}
            />
          ))}
        </div>

        <Pagination />
      </section>

      {/* Recently Viewed / Alerts */}
      <section className="space-y-4 pb-10">
        <h2 className="text-2xl font-extrabold text-slate-900">
          Recently Viewed / Alerts
        </h2>

        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70">
          {recent.map((p, idx) => {
            const wishSaved = wishlistSet.has(p._id);
            const compareOn = compareSet.has(p._id);

            return (
              <div
                key={p._id}
                className={[
                  "flex items-center justify-between gap-6 px-5 py-4",
                  idx !== 0 ? "border-t border-slate-200" : "",
                ].join(" ")}
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="h-14 w-14 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-100">
                    <img
                      src={p.images?.[0]?.url}
                      alt={p.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {p.title}
                    </div>
                    <div className="text-xs font-semibold text-emerald-700">
                      {p.beds} beds · {p.baths} baths · {p.sqft} sq ft
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCompare(p._id)}
                    className={[
                      "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold ring-1 transition active:scale-95",
                      compareOn
                        ? "bg-slate-900 text-white ring-slate-900"
                        : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
                    ].join(" ")}
                    title={compareOn ? "Remove from compare" : "Add to compare"}
                  >
                    <Scale className="h-4 w-4" />
                    {compareOn ? "Comparing" : "Compare"}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleWishlist(p._id)}
                    className={[
                      "grid h-10 w-10 place-items-center rounded-full ring-1 transition active:scale-95",
                      wishSaved
                        ? "bg-emerald-600 text-white ring-emerald-600"
                        : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
                      wishPopIds[p._id] ? "scale-110" : "",
                    ].join(" ")}
                    title={wishSaved ? "Saved" : "Save"}
                    aria-label="Toggle wishlist"
                  >
                    <Heart
                      className={["h-4 w-4", wishSaved ? "fill-white" : ""].join(
                        " "
                      )}
                    />
                  </button>

                  <a
                    href={`/buyer/property/${p._id}`}
                    className="inline-flex h-10 items-center justify-center rounded-full bg-emerald-50 px-4 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200 transition hover:bg-emerald-100 active:scale-[0.98]"
                  >
                    View Details <ArrowRight className="ml-1 h-4 w-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </motion.main>
  );
}

/* ---------- UI Bits ---------- */

function Stat({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.16 }}
      className="flex items-center gap-4 rounded-2xl px-7 py-6 text-white shadow-sm"
      style={{
        backgroundColor: BRAND,
        boxShadow: "0 14px 26px rgba(49, 98, 73, 0.22)",
      }}
    >
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15">
        {icon}
      </div>
      <div className="space-y-0.5">
        <div className="text-[17px] font-extrabold leading-tight">{title}</div>
        <div className="text-sm font-semibold text-white/75">{sub}</div>
      </div>
    </motion.div>
  );
}

function PropertyCard({
  p,
  showMeta,
  big,
  wishSaved,
  wishPop,
  onToggleWish,
  compareOn,
  comparePop,
  onToggleCompare,
}: {
  p: Property;
  showMeta: boolean;
  big: boolean;
  wishSaved: boolean;
  wishPop: boolean;
  onToggleWish: () => void;
  compareOn: boolean;
  comparePop: boolean;
  onToggleCompare: () => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ duration: 0.18 }}
      className="relative"
    >
      {/* Compare pill */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleCompare();
        }}
        className={[
          "absolute left-3 top-3 z-10 inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ring-1 transition active:scale-95",
          compareOn
            ? "bg-slate-900 text-white ring-slate-900"
            : "bg-white/90 text-slate-700 ring-black/10 hover:bg-white",
          comparePop ? "scale-105" : "",
        ].join(" ")}
        title={compareOn ? "Remove from compare" : "Add to compare"}
      >
        <Scale className="h-4 w-4" />
        {compareOn ? "Comparing" : "Compare"}
      </button>

      {/* Wishlist icon */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleWish();
        }}
        className={[
          "absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full ring-1 transition active:scale-95",
          wishSaved
            ? "bg-emerald-600 text-white ring-emerald-600"
            : "bg-white/90 text-slate-700 ring-black/10 hover:bg-white",
          wishPop ? "scale-110" : "",
        ].join(" ")}
        title={wishSaved ? "Saved" : "Save"}
        aria-label="Toggle wishlist"
      >
        <Heart
          className={["h-5 w-5", wishSaved ? "fill-white" : ""].join(" ")}
        />
      </button>

      <a
        href={`/buyer/property/${p._id}`}
        className="group block overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/70 transition hover:shadow-md"
      >
        <div
          className={[
            "relative w-full overflow-hidden bg-slate-100",
            big ? "h-56" : "h-44",
          ].join(" ")}
        >
          <img
            src={p.images?.[0]?.url}
            alt={p.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        </div>

        <div className={["space-y-1", big ? "px-5 py-5" : "px-4 py-4"].join(" ")}>
          {!big ? (
            <>
              <div className="text-sm font-semibold text-slate-900">{p.title}</div>
              <div className="text-sm font-bold text-slate-900">
                {formatPrice(p)}
              </div>
              {showMeta ? (
                <div className="text-xs font-semibold text-emerald-700">
                  {p.beds} beds · {p.baths} baths · {p.sqft} sq ft
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="line-clamp-2 text-base font-extrabold text-slate-900">
                {p.title}
              </div>
              <div className="text-sm font-semibold text-emerald-700">
                {formatPrice(p)}
              </div>
            </>
          )}
        </div>
      </a>
    </motion.div>
  );
}

function Pagination() {
  const pages = [1, 2, 3, "…", 10];
  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      <button className="grid h-8 w-8 place-items-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 active:scale-[0.98]">
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pages.map((p, i) => {
        const active = p === 1;
        return (
          <motion.button
            key={i}
            whileHover={{ scale: active ? 1 : 1.08 }}
            className={[
              "grid h-7 w-7 place-items-center rounded-full text-xs font-bold transition",
              active
                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/30"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50",
            ].join(" ")}
          >
            {p}
          </motion.button>
        );
      })}

      <button className="grid h-8 w-8 place-items-center rounded-full bg-white text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 active:scale-[0.98]">
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function formatPrice(p: Property) {
  const currency = p.currency || "USD";
  const price = Number(p.price) || 0;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${currency} ${price.toLocaleString()}`;
  }
}
