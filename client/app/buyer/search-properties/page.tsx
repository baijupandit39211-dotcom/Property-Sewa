"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Bath,
  BedDouble,
  Camera,
  ChevronDown,
  Expand,
  Heart,
  MapPin,
  Scale,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { apiFetch } from "../../lib/api";
import type { Property } from "../../lib/property.types";

type ListResponse = {
  items: Property[];
  total: number;
};

type PropertySuggestion = {
  label: string;
  type: "title" | "location" | "address";
};

type PropertySuggestionsResponse = {
  success: boolean;
  items: PropertySuggestion[];
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

      <h2 className="text-2xl font-bold text-slate-900">No available properties found</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
        There are no currently available active listings for these filters. Reserved or paid
        properties are excluded automatically, so try adjusting your filters or check again later.
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

function formatCardArea(property: Property) {
  if (typeof property.sqft === "number" && property.sqft > 0) {
    return `${property.sqft} sqft`;
  }

  return "Area on request";
}

function getCardTypeLabel(property: Property) {
  const title = String(property.title || "").toLowerCase();

  if (title.includes("villa")) return "Villa";
  if (title.includes("apartment")) return "Apartment";
  if (title.includes("house")) return "House";
  if (title.includes("flat")) return "Flat";
  if (title.includes("land")) return "Land";

  return "Property";
}

function getStatusBadgeLabel(property: Property) {
  if (isOfferActive(property)) return "Featured";
  return "New Listing";
}

function getPrimaryImage(property: Property) {
  return property.images?.[0]?.url || "https://placehold.co/900x700/e8f5ee/0f172a?text=Property+Sewa";
}

function extractPriceValue(input: string) {
  const normalized = input.replaceAll(",", "");
  const match = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!match) return "";

  const raw = Number(match[1]);
  if (!Number.isFinite(raw)) return "";

  if (/\b(cr|crore)\b/i.test(normalized)) return String(Math.round(raw * 10000000));
  if (/\b(lac|lakh)\b/i.test(normalized)) return String(Math.round(raw * 100000));
  if (/\bk\b/i.test(normalized)) return String(Math.round(raw * 1000));

  return String(Math.round(raw));
}

function parseSmartSearch(input: string) {
  const raw = input.trim();
  const normalized = raw.toLowerCase();

  let nextSearch = raw;
  let nextLocation = "";
  let nextListingType = "";
  let nextMinPrice = "";
  let nextMaxPrice = "";

  if (/\bfor rent\b|\brent\b/.test(normalized)) {
    nextListingType = "rent";
  } else if (/\bfor buy\b|\bbuy\b|\bfor sale\b|\bsale\b/.test(normalized)) {
    nextListingType = "buy";
  }

  const underMatch = normalized.match(/\b(?:under|below|max)\s+([a-z0-9.,\s]+)/i);
  if (underMatch?.[1]) {
    nextMaxPrice = extractPriceValue(underMatch[1]);
  }

  const aboveMatch = normalized.match(/\b(?:above|over|min)\s+([a-z0-9.,\s]+)/i);
  if (aboveMatch?.[1]) {
    nextMinPrice = extractPriceValue(aboveMatch[1]);
  }

  const inMatch = normalized.match(/\bin\s+([a-z\s]+?)(?=\s+(?:under|below|max|above|over|min|for)\b|$)/i);
  if (inMatch?.[1]) {
    nextLocation = inMatch[1].trim();
  }

  const cleanedSearch = normalized
    .replace(/\bfor rent\b|\bfor buy\b|\bfor sale\b|\brent\b|\bbuy\b|\bsale\b/gi, " ")
    .replace(/\bin\s+[a-z\s]+?(?=\s+(?:under|below|max|above|over|min|for)\b|$)/gi, " ")
    .replace(/\b(?:under|below|max|above|over|min)\s+[a-z0-9.,\s]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleanedSearch) {
    nextSearch = cleanedSearch;
  } else if (nextLocation || nextListingType || nextMaxPrice || nextMinPrice) {
    nextSearch = "";
  }

  return {
    search: nextSearch,
    location: nextLocation,
    listingType: nextListingType,
    minPrice: nextMinPrice,
    maxPrice: nextMaxPrice,
  };
}

export default function SearchPropertiesPage() {
  const searchParams = useSearchParams();
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
  const [smartSearch, setSmartSearch] = useState("");
  const [debouncedSmartSearch, setDebouncedSmartSearch] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [smartSearchOpen, setSmartSearchOpen] = useState(false);
  const [smartSearchSuggestions, setSmartSearchSuggestions] = useState<PropertySuggestion[]>([]);
  const smartSearchRef = useRef<HTMLDivElement | null>(null);

  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const [toast, setToast] = useState<ToastState>({ show: false, text: "" });
  const toastTimer = useRef<number | null>(null);

  const [poppingIds, setPoppingIds] = useState<Record<string, boolean>>({});
  const [comparePopIds, setComparePopIds] = useState<Record<string, boolean>>({});
  const offersOnlyFromQuery = searchParams.get("offersOnly");
  const offersOnlyEnabled =
    offersOnlyFromQuery === "true" || offersOnlyFromQuery === "1" || offersOnlyFromQuery === "yes";

  useEffect(() => {
    document.title = "Properties";
  }, []);

  useEffect(() => {
    setShowOnlyOffers(offersOnlyEnabled);
    setPage(1);
  }, [offersOnlyEnabled]);

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
    const timer = window.setTimeout(() => {
      setDebouncedSmartSearch(smartSearch.trim());
    }, 250);

    return () => window.clearTimeout(timer);
  }, [smartSearch]);

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
    if (showOnlyOffers) params.set("offersOnly", "true");

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
  }, [debouncedSearch, debouncedLocation, listingType, minPrice, maxPrice, page, limit, sort, showOnlyOffers]);

  useEffect(() => {
    if (debouncedSmartSearch.length < 2) {
      setSmartSearchSuggestions([]);
      setSmartSearchOpen(false);
      return;
    }

    let cancelled = false;

    apiFetch<PropertySuggestionsResponse>(
      `/properties/suggestions?q=${encodeURIComponent(debouncedSmartSearch)}&limit=8`
    )
      .then((response) => {
        if (cancelled) return;
        setSmartSearchSuggestions(response.items || []);
        setSmartSearchOpen((response.items || []).length > 0);
      })
      .catch(() => {
        if (cancelled) return;
        setSmartSearchSuggestions([]);
        setSmartSearchOpen(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSmartSearch]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!smartSearchRef.current) return;
      if (smartSearchRef.current.contains(event.target as Node)) return;
      setSmartSearchOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

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
    setSmartSearch("");
    setSearch("");
    setLocation("");
    setListingType("");
    setMinPrice("");
    setMaxPrice("");
    setSort("");
    setPage(1);
  }

  function applySmartSearch() {
    const parsed = parseSmartSearch(smartSearch);
    setSmartSearchOpen(false);
    setSearch(parsed.search);
    setLocation(parsed.location);
    setListingType(parsed.listingType);
    setMinPrice(parsed.minPrice);
    setMaxPrice(parsed.maxPrice);
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
        <section className="ps-fade-up overflow-hidden rounded-[34px] border border-emerald-200/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-6 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:px-8 sm:py-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-50">
                Properties
              </span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Properties
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/90 sm:text-base">
                Search active listings, narrow by price and location, compare top options, and save promising properties to revisit later.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/buyer/wishlist"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/15 hover:shadow-[0_14px_30px_rgba(255,255,255,0.08)]"
              >
                Wishlist
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold">
                  {wishlistIds.length}
                </span>
              </Link>
              <Link
                href="/buyer/compare"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-emerald-900 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-50 hover:shadow-[0_18px_36px_rgba(255,255,255,0.16)]"
              >
                Compare
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-900">
                  {compareIds.length}/{MAX_COMPARE}
                </span>
              </Link>
            </div>
          </div>
        </section>

        <section className="ps-fade-up ps-fade-up-delay-1 rounded-[28px] border border-emerald-100 shadow-sm bg-[linear-gradient(180deg,#ffffff_0%,#f7fffb_100%)]">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Smart property search</h2>
              <p className="mt-1 text-sm text-slate-500">
                Search like a buyer: try keywords, places, price intent, or simple natural phrases.
              </p>
            </div>
          </div>

          <div className="px-5 pb-5">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                applySmartSearch();
              }}
              className="rounded-[30px] border border-emerald-100 bg-white p-3 shadow-[0_18px_48px_rgba(15,23,42,0.08)] transition-all duration-300 hover:shadow-[0_24px_56px_rgba(15,23,42,0.1)]"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div ref={smartSearchRef} className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={smartSearch}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setSmartSearch(nextValue);
                      if (nextValue.trim().length < 2) {
                        setSmartSearchOpen(false);
                      }
                    }}
                    onFocus={() => setSmartSearchOpen(smartSearchSuggestions.length > 0)}
                    placeholder='Search "villa in kathmandu" or "apartment in lalitpur under 5000000"'
                    className="ps-soft-pulse h-16 w-full rounded-3xl border border-transparent bg-slate-50 pl-11 pr-5 text-[15px] text-slate-900 shadow-[0_8px_24px_rgba(15,23,42,0.05)] outline-none transition-all duration-300 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />

                  {smartSearchOpen && smartSearchSuggestions.length > 0 ? (
                    <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-20 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                      {smartSearchSuggestions.map((suggestion) => (
                        <button
                          key={`${suggestion.type}:${suggestion.label}`}
                          type="button"
                          onMouseDown={() => {
                            setSmartSearch(suggestion.label);
                            setSmartSearchOpen(false);
                            const parsed = parseSmartSearch(suggestion.label);
                            setSearch(parsed.search);
                            setLocation(parsed.location);
                            setListingType(parsed.listingType);
                            setMinPrice(parsed.minPrice);
                            setMaxPrice(parsed.maxPrice);
                            setPage(1);
                          }}
                          className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800 last:border-b-0"
                        >
                          <Search className="h-4 w-4 shrink-0 text-slate-400" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">{suggestion.label}</div>
                            <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                              {suggestion.type}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row lg:items-center">
                  <button
                    type="submit"
                    className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-800 hover:shadow-[0_18px_30px_rgba(14,159,110,0.24)]"
                  >
                    <Sparkles className="h-4 w-4" />
                    Search
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdvancedOpen((current) => !current)}
                    className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-[0_14px_28px_rgba(15,23,42,0.08)]"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Advanced Filters
                    <ChevronDown
                      className={[
                        "h-4 w-4 transition-transform duration-200",
                        advancedOpen ? "rotate-180" : "",
                      ].join(" ")}
                    />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-600">Try:</span>
                <button
                  type="button"
                  onClick={() => setSmartSearch("villa in kathmandu")}
                  className="rounded-full bg-slate-50 px-3 py-1.5 transition hover:bg-emerald-50 hover:text-emerald-700"
                >
                  villa in kathmandu
                </button>
                <button
                  type="button"
                  onClick={() => setSmartSearch("apartment in lalitpur under 5000000")}
                  className="rounded-full bg-slate-50 px-3 py-1.5 transition hover:bg-emerald-50 hover:text-emerald-700"
                >
                  apartment in lalitpur under 5000000
                </button>
                <button
                  type="button"
                  onClick={() => setSmartSearch("house for rent in bhaktapur")}
                  className="rounded-full bg-slate-50 px-3 py-1.5 transition hover:bg-emerald-50 hover:text-emerald-700"
                >
                  house for rent in bhaktapur
                </button>
              </div>
            </form>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-emerald-100/80 px-5 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-3 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-emerald-200">
                <input
                  type="checkbox"
                  checked={showOnlyOffers}
                  onChange={(e) => setShowOnlyOffers(e.target.checked)}
                  className="h-4 w-4 accent-emerald-600"
                />
                Show only offers
              </label>

              <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">
                Sort
                <select
                  value={sort}
                  onChange={(e) => updateTextFilter(setSort, e.target.value)}
                  className="bg-transparent text-sm font-semibold text-slate-800 outline-none"
                >
                  <option value="">Latest</option>
                  <option value="latest">Latest</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50"
            >
              Clear Filters
            </button>
          </div>

          {advancedOpen ? (
            <div className="border-t border-emerald-100/80 px-5 py-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <SlidersHorizontal className="h-4 w-4 text-emerald-700" />
                Advanced filters
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Keyword
                  </label>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => updateTextFilter(setSearch, e.target.value)}
                    placeholder="Modern villa, apartment, house..."
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
              </div>
            </div>
          ) : null}
        </section>

        <section className="ps-fade-up ps-fade-up-delay-2 rounded-[28px] border border-emerald-100 shadow-sm bg-[linear-gradient(180deg,#ffffff_0%,#f4fff8_100%)]">
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
              Fetching all currently available listings.
            </p>
          </div>
        ) : visibleItems.length === 0 ? (
          <EmptyState />
        ) : (
          <section className="ps-fade-up ps-fade-up-delay-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleItems.map((p) => {
              const saved = wishlistSet.has(p._id);
              const compareOn = compareSet.has(p._id);
              const cardType = getCardTypeLabel(p);
              const cardArea = formatCardArea(p);
              const statusBadgeLabel = getStatusBadgeLabel(p);
              const photoCount = Array.isArray(p.images) ? p.images.length : 0;
              const heartPop = !!poppingIds[p._id];
              const scalePop = !!comparePopIds[p._id];

              return (
                <div key={p._id} className="mx-auto w-full max-w-[340px]">
                  <article
                    className="group flex h-full min-h-[438px] flex-col overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.07)] transition-all duration-300 hover:-translate-y-1.5 hover:border-emerald-200 hover:shadow-[0_22px_44px_rgba(15,23,42,0.12)]"
                    style={{ contentVisibility: "auto", containIntrinsicSize: "438px" }}
                  >
                    <div className="relative flex h-full flex-col">
                      <button
                        type="button"
                        onClick={() => toggleCompare(p._id)}
                        className={[
                          "absolute right-[4.15rem] top-4 z-20 inline-flex h-10 min-w-[38px] items-center justify-center rounded-full px-2 text-[10px] shadow-sm ring-1 transition-all duration-300 active:scale-95",
                          compareOn
                            ? "bg-slate-900/80 text-white ring-slate-900/70"
                            : "bg-white/92 text-slate-700 ring-black/5 backdrop-blur-sm hover:bg-white",
                          scalePop ? "scale-105" : "",
                        ].join(" ")}
                        aria-label={compareOn ? "Remove from compare" : "Add to compare"}
                        title={compareOn ? "Remove from compare" : "Add to compare"}
                      >
                        <Scale className={["h-[13px] w-[13px]", scalePop ? "scale-110" : ""].join(" ")} />
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleWishlist(p._id)}
                        className={[
                          "absolute right-4 top-4 z-20 grid h-11 w-11 place-items-center rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-all duration-300 active:scale-95",
                          saved ? "text-emerald-600" : "text-slate-700 hover:bg-slate-50",
                          heartPop ? "scale-110" : "",
                        ].join(" ")}
                        aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
                        title={saved ? "Saved" : "Save"}
                      >
                        <Heart
                          className={[
                            "h-[18px] w-[18px] transition-transform duration-200",
                            saved ? "fill-emerald-600" : "",
                            heartPop ? "scale-110" : "",
                          ].join(" ")}
                        />
                      </button>

                      <Link href={`/buyer/property/${p._id}`} className="block">
                        <div className="relative overflow-hidden rounded-t-[24px]">
                          <img
                            src={getPrimaryImage(p)}
                            alt={p.title ?? "Property image"}
                            loading="lazy"
                            decoding="async"
                            className="aspect-[4/3] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/28 via-slate-950/4 to-transparent" />
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_28%)] opacity-70 transition-opacity duration-500 group-hover:opacity-100" />

                          <div className="absolute left-4 top-4 z-20">
                            <span
                              className={[
                                "inline-flex min-h-[40px] items-center rounded-full px-5 text-[14px] font-bold text-white shadow-[0_8px_20px_rgba(15,23,42,0.15)]",
                                statusBadgeLabel === "Featured" ? "bg-[#0b7a5a]" : "bg-[#172554]",
                              ].join(" ")}
                            >
                              {statusBadgeLabel}
                            </span>
                          </div>

                          <div className="absolute bottom-4 right-4 z-20">
                            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-900/78 px-3 py-2 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] backdrop-blur-sm transition-all duration-300 group-hover:-translate-y-0.5 group-hover:bg-slate-900/84">
                              <Camera className="h-[14px] w-[14px]" />
                              <span className="text-[13px] font-semibold">
                                {photoCount || 1} Photo{photoCount === 1 ? "" : "s"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex min-h-[210px] flex-1 flex-col bg-white px-5 py-4">
                          <p className="text-[18px] font-extrabold tracking-tight text-slate-900">
                            {p.currency} {Number(p.price || 0).toLocaleString()}
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-3">
                            <span className="text-[13px] font-bold text-emerald-700">{cardType}</span>
                            <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#2563eb]">
                              <ShieldCheck className="h-[13px] w-[13px]" />
                              Verified
                            </span>
                          </div>

                          <h3 className="mt-3 line-clamp-2 text-xl font-bold leading-[1.28] tracking-tight text-slate-900">
                            {p.title || "Property listing"}
                          </h3>

                          <p className="mt-2 flex items-center gap-2 text-[13px] font-semibold text-slate-600">
                            <MapPin className="h-[16px] w-[16px] shrink-0 text-emerald-700" strokeWidth={2.1} />
                            <span className="truncate">{p.address || p.location}</span>
                          </p>

                          <div className="mt-3 border-t border-slate-200 pt-3">
                            <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-slate-700">
                              <span className="inline-flex items-center gap-1.5">
                                <BedDouble className="h-[16px] w-[16px] text-emerald-700" strokeWidth={2.1} />
                                {p.beds} bd
                              </span>
                              <span className="text-slate-300">&bull;</span>
                              <span className="inline-flex items-center gap-1.5">
                                <Bath className="h-[16px] w-[16px] text-emerald-700" strokeWidth={2.1} />
                                {p.baths} ba
                              </span>
                              <span className="text-slate-300">&bull;</span>
                              <span className="inline-flex items-center gap-1.5">
                                <Expand className="h-[16px] w-[16px] text-emerald-700" strokeWidth={2.1} />
                                {cardArea.includes("sqft") ? cardArea : "Area"}
                              </span>
                            </div>
                          </div>

                          <div className="mt-auto pt-4">
                            <div className="flex items-center justify-center gap-2.5 rounded-[12px] border border-emerald-600 px-4 py-2 text-center text-[13px] font-bold text-emerald-700 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:bg-emerald-50 group-hover:shadow-[0_14px_26px_rgba(14,159,110,0.12)]">
                              <span>View details</span>
                              <ArrowRight className="h-[15px] w-[15px]" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  </article>
                </div>
              );
            })}
          </section>
        )}

        {!error && !loading && items.length > 0 && (
          <section className="ps-fade-up rounded-[28px] border border-emerald-100 shadow-sm bg-[linear-gradient(180deg,#ffffff_0%,#f4fff8_100%)]">
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
