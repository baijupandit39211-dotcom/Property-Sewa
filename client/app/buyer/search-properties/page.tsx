"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Heart, Scale } from "lucide-react";
import { apiFetch } from "../../lib/api";
import type { Property } from "../../lib/property.types";
import OfferBadge from "@/components/offers/OfferBadge";

type ListResponse = {
  items: Property[];
  total: number;
};

type OfferExpiryState = {
  text: string;
  tone: "emerald" | "amber" | "rose";
};

function isOfferActive(property: Property) {
  return property.offerActive === true || String(property.offerActive).toLowerCase() === "true";
}

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

function getOfferExpiryState(property: Property): OfferExpiryState | null {
  if (!isOfferActive(property) || !property.offerValidUntil) return null;

  const target = new Date(property.offerValidUntil);
  if (Number.isNaN(target.getTime())) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: "Offer expired", tone: "rose" };
  }
  if (diffDays === 0) {
    return { text: "Ends today", tone: "amber" };
  }
  if (diffDays <= 2) {
    return { text: `Ends in ${diffDays} day${diffDays === 1 ? "" : "s"}`, tone: "amber" };
  }
  return { text: `Ends in ${diffDays} days`, tone: "emerald" };
}

type ToastState = { show: boolean; text: string };

function Toast({ show, text }: { show: boolean; text: string }) {
  return (
    <div
      className={[
        "fixed right-6 top-6 z-[9999] transition-all duration-200",
        show ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
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
    <div className="rounded-[32px] border border-emerald-100 bg-white p-10 text-center shadow-sm">
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

      <h2 className="text-2xl font-bold text-slate-900">No properties found</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
        Try again later or explore other listings. You can save to wishlist or compare shortlisted properties.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/buyer/wishlist"
          className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100"
        >
          Go to Wishlist
        </Link>
        <Link
          href="/buyer/compare"
          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
        >
          Go to Compare
        </Link>
      </div>
    </div>
  );
}

export default function SearchPropertiesPage() {
  const [items, setItems] = useState<Property[]>([]);
  const [showOnlyOffers, setShowOnlyOffers] = useState(false);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [listingType, setListingType] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [sort, setSort] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedLocation, setDebouncedLocation] = useState("");

  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const [toast, setToast] = useState<ToastState>({ show: false, text: "" });
  const toastTimer = useRef<number | null>(null);

  const [poppingIds, setPoppingIds] = useState<Record<string, boolean>>({});
  const [comparePopIds, setComparePopIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedLocation(location);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [location]);

  useEffect(() => {
    setCompareIds(readIds(COMPARE_KEY));

    (async () => {
      try {
        const res = await apiFetch<{
          items: Array<{ propertyId?: string | { _id?: string } }>;
        }>("/wishlist");

        const ids = (res.items || [])
          .map((item) =>
            typeof item.propertyId === "string" ? item.propertyId : item.propertyId?._id
          )
          .filter((id): id is string => Boolean(id));

        setWishlistIds(ids);
      } catch {
        setWishlistIds([]);
      }
    })();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();

    if (debouncedSearch) params.set("search", debouncedSearch);
    if (debouncedLocation) params.set("location", debouncedLocation);
    if (listingType) params.set("listingType", listingType);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (page) params.set("page", String(page));
    if (limit) params.set("limit", String(limit));
    if (sort) params.set("sort", sort);

    setLoading(true);
    setError("");

    apiFetch<ListResponse>(`/properties${params.toString() ? `?${params.toString()}` : ""}`)
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
      })
      .catch(() => {
        setError("Failed to fetch properties");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [debouncedSearch, debouncedLocation, listingType, minPrice, maxPrice, page, limit, sort]);

  const wishlistSet = useMemo(() => new Set(wishlistIds), [wishlistIds]);
  const compareSet = useMemo(() => new Set(compareIds), [compareIds]);
  const visibleItems = useMemo(
    () => (showOnlyOffers ? items.filter((item) => isOfferActive(item)) : items),
    [items, showOnlyOffers]
  );
  const totalPages = Math.max(1, Math.ceil(total / limit));

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

  function updateTextFilter(
    setter: React.Dispatch<React.SetStateAction<string>>,
    value: string
  ) {
    setter(value);
    setPage(1);
  }

  function clearFilters() {
    setSearch("");
    setLocation("");
    setListingType("");
    setMinPrice("");
    setMaxPrice("");
    setSort("");
    setPage(1);
  }

  async function toggleWishlist(id: string) {
    const has = wishlistSet.has(id);

    try {
      if (has) {
        await apiFetch(`/wishlist/${id}`, { method: "DELETE" });
        const next = wishlistIds.filter((x) => x !== id);
        setWishlistIds(next);
        showToast("Removed from wishlist");
        return;
      }

      await apiFetch("/wishlist", {
        method: "POST",
        body: JSON.stringify({ propertyId: id }),
      });

      const next = [id, ...wishlistIds];
      setWishlistIds(next);
      showToast("Saved to wishlist");
      pop(id, setPoppingIds);
    } catch (err) {
      console.error(err);
    }
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

  return (
    <main className="min-h-screen w-full min-w-0 scroll-smooth bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(52,211,153,0.12),transparent_24%),linear-gradient(180deg,#f3fff9_0%,#ecfdf5_100%)] p-4 [text-rendering:optimizeLegibility] sm:p-6">
      <Toast show={toast.show} text={toast.text} />

      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[34px] border border-emerald-200/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-6 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:px-8 sm:py-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-50">
                Search workspace
              </span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Discover homes worth shortlisting
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/90 sm:text-base">
                Search active listings, narrow by price and location, compare top options, and save promising properties to revisit later.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/buyer/wishlist"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
              >
                Wishlist
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold">
                  {wishlistIds.length}
                </span>
              </Link>
              <Link
                href="/buyer/compare"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-50"
              >
                Compare
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-900">
                  {compareIds.length}/{MAX_COMPARE}
                </span>
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-emerald-100 shadow-sm bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)]">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Search filters</h2>
              <p className="mt-1 text-sm text-slate-500">
                Update any filter to refresh buyer search results.
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
              Live results
            </span>
          </div>

          <div className="grid gap-4 px-5 pb-5 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Search
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => updateTextFilter(setSearch, e.target.value)}
                placeholder="Search title, address, amenities..."
                className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => updateTextFilter(setLocation, e.target.value)}
                placeholder="Kathmandu, Lalitpur..."
                className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Listing Type
              </label>
              <select
                value={listingType}
                onChange={(e) => updateTextFilter(setListingType, e.target.value)}
                className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              >
                <option value="">All listings</option>
                <option value="buy">Buy</option>
                <option value="rent">Rent</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Min Price
              </label>
              <input
                type="number"
                min="0"
                value={minPrice}
                onChange={(e) => updateTextFilter(setMinPrice, e.target.value)}
                placeholder="0"
                className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Max Price
              </label>
              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(e) => updateTextFilter(setMaxPrice, e.target.value)}
                placeholder="1000000"
                className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Sort
              </label>
              <select
                value={sort}
                onChange={(e) => updateTextFilter(setSort, e.target.value)}
                className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              >
                <option value="">Latest</option>
                <option value="latest">Latest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-emerald-100/80 px-5 py-4">
            <label className="inline-flex items-center gap-3 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-emerald-200">
              <input
                type="checkbox"
                checked={showOnlyOffers}
                onChange={(e) => setShowOnlyOffers(e.target.checked)}
                className="h-4 w-4 accent-emerald-600"
              />
              Show only offers
            </label>

            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50"
            >
              Clear Filters
            </button>
          </div>
        </section>

        <section className="rounded-[28px] border border-emerald-100 shadow-sm bg-[linear-gradient(180deg,#ffffff_0%,#f4fff8_100%)]">
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Results summary
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span className="rounded-full bg-white px-3 py-1 font-semibold ring-1 ring-emerald-100">
                  Visible: <span className="font-bold text-slate-900">{visibleItems.length}</span>
                </span>
                <span className="rounded-full bg-white px-3 py-1 font-semibold ring-1 ring-emerald-100">
                  Total: <span className="font-bold text-emerald-700">{total}</span>
                </span>
              </div>
            </div>

            <div className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 ring-1 ring-emerald-200">
              Buyer search
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-[32px] border border-rose-200 bg-white p-8 shadow-sm">
            <div className="text-lg font-bold text-rose-700">{error}</div>
            <p className="mt-2 text-sm text-slate-500">
              Please adjust filters or try again in a moment.
            </p>
          </div>
        ) : loading ? (
          <div className="rounded-[32px] border border-emerald-100 bg-white p-8 shadow-sm">
            <div className="text-lg font-bold text-slate-900">Loading properties...</div>
            <p className="mt-2 text-sm text-slate-500">
              Fetching the latest matching listings.
            </p>
          </div>
        ) : visibleItems.length === 0 ? (
          <EmptyState />
        ) : (
          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visibleItems.map((p) => {
              const saved = wishlistSet.has(p._id);
              const compareOn = compareSet.has(p._id);
              const offerExpiry = getOfferExpiryState(p);

              const heartPop = !!poppingIds[p._id];
              const scalePop = !!comparePopIds[p._id];

              return (
                <article
                  key={p._id}
                  className="group overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-sm transition duration-300 will-change-transform [transform:translateZ(0)] hover:-translate-y-1 hover:shadow-[0_18px_40px_-26px_rgba(16,185,129,0.22)]"
                  style={{ contentVisibility: "auto", containIntrinsicSize: "420px" }}
                >
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => toggleCompare(p._id)}
                      className={[
                        "absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold shadow-sm ring-1 backdrop-blur transition active:scale-95",
                        compareOn
                          ? "bg-slate-900 text-white ring-slate-900"
                          : "bg-white/92 text-slate-700 ring-black/5 hover:bg-white",
                        scalePop ? "scale-105" : "",
                      ].join(" ")}
                      aria-label={compareOn ? "Remove from compare" : "Add to compare"}
                      title={compareOn ? "Remove from compare" : "Add to compare"}
                    >
                      <Scale className={["h-4 w-4", scalePop ? "scale-110" : ""].join(" ")} />
                      {compareOn ? "Comparing" : "Compare"}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleWishlist(p._id)}
                      className={[
                        "absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full shadow-sm ring-1 backdrop-blur transition active:scale-95",
                        saved
                          ? "bg-emerald-600 text-white ring-emerald-600"
                          : "bg-white/92 text-slate-700 ring-black/5 hover:bg-white",
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

                    <Link href={`/buyer/property/${p._id}`} className="block">
                      <div className="relative overflow-hidden">
                        <img
                          src={p.images[0]?.url}
                          alt={p.title ?? "Property image"}
                          loading="lazy"
                          decoding="async"
                          className="h-[240px] w-full object-cover transition duration-500 [transform:translateZ(0)] group-hover:scale-[1.03]"
                        />
                        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/55 to-transparent" />
                        <div className="absolute bottom-4 left-4 z-10">
                          <OfferBadge
                            category={p.offerCategory}
                            active={isOfferActive(p)}
                            label={p.offerBadge || p.offerTitle}
                          />
                        </div>
                      </div>

                      <div className="space-y-4 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                              Starting Price
                            </p>
                            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                              {p.currency} {Number(p.price || 0).toLocaleString()}
                            </p>
                          </div>

                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700 ring-1 ring-emerald-200">
                            Featured
                          </span>
                        </div>

                        <div>
                          <h3 className="line-clamp-2 text-base font-bold leading-6 text-slate-900">
                            {p.title || "Property listing"}
                          </h3>
                          <p className="mt-2 text-sm text-slate-500">{p.address || p.location}</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-100">
                            {p.beds} Beds
                          </span>
                          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-100">
                            {p.baths} Baths
                          </span>
                          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-100">
                            {p.sqft} sqft
                          </span>
                        </div>

                        {offerExpiry ? (
                          <div
                            className={[
                              "inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold ring-1",
                              offerExpiry.tone === "emerald"
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                : offerExpiry.tone === "amber"
                                ? "bg-amber-50 text-amber-700 ring-amber-200"
                                : "bg-rose-50 text-rose-700 ring-rose-200",
                            ].join(" ")}
                          >
                            {offerExpiry.text}
                          </div>
                        ) : null}
                      </div>
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {!error && !loading && items.length > 0 && (
          <section className="rounded-[28px] border border-emerald-100 shadow-sm bg-[linear-gradient(180deg,#ffffff_0%,#f4fff8_100%)]">
            <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Navigation
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Total results <span className="font-bold text-slate-900">{total}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>

                <div className="rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200">
                  Page {page} of {totalPages}
                </div>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
