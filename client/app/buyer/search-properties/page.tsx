"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Bath,
  BedDouble,
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

type ActiveFilter = {
  key: "search" | "location" | "listingType" | "minPrice" | "maxPrice" | "showOnlyOffers" | "sort";
  label: string;
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
        "fixed right-4 top-4 z-[9999] transition-all duration-200 sm:right-6 sm:top-6",
        show ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
      ].join(" ")}
    >
      <div className="rounded-2xl bg-[#316249] px-4 py-3 text-sm font-semibold text-white shadow-md ring-1 ring-white/10">
        {text}
      </div>
    </div>
  );
}

function EmptyState({ onResetFilters }: { onResetFilters: () => void }) {
  return (
    <div className="rounded-3xl border border-[#E5E7EB] bg-white px-6 py-12 text-center shadow-sm sm:px-10">
      <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-[#EEF8EB] ring-1 ring-[#D1D5DB]">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" className="text-[#316249]">
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

      <h2 className="text-2xl font-bold tracking-tight text-[#0D1C12]">
        No available properties found
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#618975]">
        There are no currently available active listings for these filters. Reserved or paid
        properties are excluded automatically, so try adjusting your filters or check again later.
      </p>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onResetFilters}
          className="inline-flex items-center justify-center rounded-xl bg-[#316249] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#28513D]"
        >
          Reset filters
        </button>
        <Link
          href="/buyer/wishlist"
          className="inline-flex items-center justify-center rounded-xl border border-[#D1D5DB] bg-[#EEF8EB] px-5 py-2.5 text-sm font-semibold text-[#0D1C12] transition hover:bg-[#E8F2EB]"
        >
          Go to Wishlist
        </Link>
        <Link
          href="/buyer/compare"
          className="inline-flex items-center justify-center rounded-xl border border-[#D1D5DB] bg-white px-5 py-2.5 text-sm font-semibold text-[#0D1C12] transition hover:bg-[#F7FCFA]"
        >
          Go to Compare
        </Link>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <section className="grid grid-cols-1 gap-7 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="flex h-full flex-col overflow-hidden rounded-[24px] border border-[#D1D5DB]/80 bg-white shadow-[0_10px_24px_rgba(13,28,18,0.06)]"
        >
          <div className="aspect-[16/10] animate-pulse bg-[#E8F2EB]" />
          <div className="p-5">
            <div className="h-8 w-2/3 animate-pulse rounded-lg bg-[#E8F2EB]" />
            <div className="mt-3 space-y-2">
              <div className="h-5 w-5/6 animate-pulse rounded bg-[#E8F2EB]" />
              <div className="h-5 w-2/3 animate-pulse rounded bg-[#E8F2EB]" />
            </div>
            <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-[#E8F2EB]" />
            <div className="mt-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="h-8 w-20 animate-pulse rounded-full bg-[#E8F2EB]" />
                <div className="h-8 w-20 animate-pulse rounded-full bg-[#E8F2EB]" />
                <div className="h-8 w-24 animate-pulse rounded-full bg-[#E8F2EB]" />
              </div>
            </div>
            <div className="mt-5 h-10 w-full animate-pulse rounded-xl bg-[#E8F2EB]" />
          </div>
        </div>
      ))}
    </section>
  );
}

function formatCardArea(property: Property) {
  const sqft = Number(property.sqft || 0);
  if (Number.isFinite(sqft) && sqft >= 100) {
    return `${property.sqft} sqft`;
  }

  return "Area on request";
}

function getDisplayCurrency(property: Property) {
  const raw = String(property.currency || "").trim().toUpperCase();
  // Current display rule: normalize to NPR unless explicitly supported.
  if (raw === "NPR") return raw;
  return "NPR";
}

function formatCardPrice(property: Property) {
  const value = Number(property.price || 0);
  const listingType = String(property.listingType || "").toLowerCase();
  const minReasonablePrice = listingType === "rent" ? 1000 : 10000;
  if (!Number.isFinite(value) || value < minReasonablePrice) {
    return "Price on request";
  }
  return `${getDisplayCurrency(property)} ${value.toLocaleString()}`;
}

function getStatusBadgeLabel(property: Property) {
  if (isOfferActive(property)) return "Featured";
  return "New Listing";
}

function getPrimaryImage(property: Property) {
  return property.images?.[0]?.url || "https://placehold.co/900x700/e8f5ee/0f172a?text=Property+Sewa";
}

function formatFilterChipLabel(filter: string) {
  if (filter.startsWith("Keyword: ")) return filter.replace("Keyword: ", "");
  if (filter.startsWith("Location: ")) return filter.replace("Location: ", "");
  if (filter.startsWith("Type: ")) return filter.replace("Type: ", "");
  if (filter === "Sort: Price low to high") return "Low to high";
  if (filter === "Sort: Price high to low") return "High to low";
  if (filter === "Sort: Latest") return "Latest";
  return filter;
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

function SearchPropertiesPageContent() {
  const ITEMS_PER_PAGE = 6;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestSeq = useRef(0);
  const filterSyncReadyRef = useRef(false);
  const [items, setItems] = useState<Property[]>([]);
  const [showOnlyOffers, setShowOnlyOffers] = useState(false);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [listingType, setListingType] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [page, setPage] = useState(1);
  const limit = ITEMS_PER_PAGE;
  const [sort, setSort] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [retryNonce, setRetryNonce] = useState(0);
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
    const nextSearch = searchParams.get("search") || "";
    const nextLocation = searchParams.get("location") || "";
    const nextListingType = searchParams.get("listingType") || "";
    const nextMinPrice = searchParams.get("minPrice") || "";
    const nextMaxPrice = searchParams.get("maxPrice") || "";
    const nextSort = searchParams.get("sort") || "";
    const rawPage = Number(searchParams.get("page") || "1");
    const nextPage = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
    const nextOffersOnly =
      searchParams.get("offersOnly") === "true" ||
      searchParams.get("offersOnly") === "1" ||
      searchParams.get("offersOnly") === "yes";

    setSearch((prev) => (prev === nextSearch ? prev : nextSearch));
    setLocation((prev) => (prev === nextLocation ? prev : nextLocation));
    setListingType((prev) => (prev === nextListingType ? prev : nextListingType));
    setMinPrice((prev) => (prev === nextMinPrice ? prev : nextMinPrice));
    setMaxPrice((prev) => (prev === nextMaxPrice ? prev : nextMaxPrice));
    setSort((prev) => (prev === nextSort ? prev : nextSort));
    setPage((prev) => (prev === nextPage ? prev : nextPage));
    setShowOnlyOffers((prev) => (prev === nextOffersOnly ? prev : nextOffersOnly));
    filterSyncReadyRef.current = true;
  }, [searchParams]);

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
    if (!filterSyncReadyRef.current) return;

    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (location.trim()) params.set("location", location.trim());
    if (listingType) params.set("listingType", listingType);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (sort) params.set("sort", sort);
    if (showOnlyOffers) params.set("offersOnly", "true");
    if (page > 1) params.set("page", String(page));

    const nextQuery = params.toString();
    const current = searchParams.toString();
    if (nextQuery === current) return;
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [router, pathname, searchParams, search, location, listingType, minPrice, maxPrice, sort, showOnlyOffers, page]);

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
    params.set("excludeReserved", "true");

    const reqId = ++requestSeq.current;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      controller.abort("timeout");
    }, 12000);

    setLoading(true);
    setError("");

    apiFetch<ListResponse>(`/properties${params.toString() ? `?${params.toString()}` : ""}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (reqId !== requestSeq.current) return;
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err: any) => {
        if (reqId !== requestSeq.current) return;
        if (controller.signal.aborted) {
          if (err?.name === "AbortError" || String(err?.message || "").includes("aborted")) {
            return;
          }
          setError("Loading timed out. Please retry.");
          return;
        }
        setError("Failed to fetch properties");
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (reqId !== requestSeq.current) return;
        setLoading(false);
      });

    return () => {
      window.clearTimeout(timeout);
      controller.abort("filter-change");
    };
  }, [
    debouncedSearch,
    debouncedLocation,
    listingType,
    minPrice,
    maxPrice,
    page,
    limit,
    sort,
    showOnlyOffers,
    retryNonce,
  ]);

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
  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const filters: ActiveFilter[] = [];

    if (search.trim()) filters.push({ key: "search", label: `Keyword: ${search.trim()}` });
    if (location.trim()) filters.push({ key: "location", label: `Location: ${location.trim()}` });
    if (listingType) {
      filters.push({ key: "listingType", label: `Type: ${listingType === "buy" ? "Buy" : "Rent"}` });
    }
    if (minPrice) filters.push({ key: "minPrice", label: `Min: ${minPrice}` });
    if (maxPrice) filters.push({ key: "maxPrice", label: `Max: ${maxPrice}` });
    if (showOnlyOffers) filters.push({ key: "showOnlyOffers", label: "Offers only" });
    if (sort) {
      filters.push({
        key: "sort",
        label:
          sort === "price_asc"
            ? "Sort: Price low to high"
            : sort === "price_desc"
            ? "Sort: Price high to low"
            : "Sort: Latest",
      });
    }

    return filters;
  }, [search, location, listingType, minPrice, maxPrice, showOnlyOffers, sort]);
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
    setSmartSearchOpen(false);
    setSmartSearch("");
    setSearch("");
    setLocation("");
    setListingType("");
    setMinPrice("");
    setMaxPrice("");
    setSort("");
    setPage(1);
  }

  function removeFilter(key: ActiveFilter["key"]) {
    if (key === "search") setSearch("");
    if (key === "location") setLocation("");
    if (key === "listingType") setListingType("");
    if (key === "minPrice") setMinPrice("");
    if (key === "maxPrice") setMaxPrice("");
    if (key === "showOnlyOffers") setShowOnlyOffers(false);
    if (key === "sort") setSort("");
    setPage(1);
  }

  function applySmartSearch() {
    if (!smartSearch.trim()) {
      clearFilters();
      return;
    }

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
    <main className="min-h-screen w-full min-w-0 bg-[#F7FCFA] px-4 py-4 [text-rendering:optimizeLegibility] sm:px-6 sm:py-6">
      <Toast show={toast.show} text={toast.text} />

      <div className="mx-auto max-w-7xl space-y-4">
        <section className="ps-fade-up overflow-hidden rounded-[32px] border border-[#D1D5DB]/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-6 text-white shadow-[0_22px_56px_rgba(13,28,18,0.10)] sm:px-8 sm:py-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/90">
                Properties
              </span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Properties</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/90/90 sm:text-base">
                Search active listings, narrow by price and location, compare top options, and
                save promising properties to revisit later.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/buyer/wishlist"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Wishlist
                <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold">
                  {wishlistIds.length}
                </span>
              </Link>
              <Link
                href="/buyer/compare"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#0D1C12] shadow-sm transition hover:bg-[#EEF8EB]"
              >
                Compare
                <span className="rounded-full bg-[#E8F2EB] px-2.5 py-0.5 text-xs font-bold text-[#0D1C12]">
                  {compareIds.length}/{MAX_COMPARE}
                </span>
              </Link>
            </div>
          </div>
        </section>

        <section className="ps-fade-up ps-fade-up-delay-1 rounded-3xl border border-[#E5E7EB] bg-white shadow-sm">
          <div className="border-b border-[#E5E7EB] px-6 py-3.5">
            <h2 className="text-lg font-bold tracking-tight text-[#0D1C12]">
              Smart property search
            </h2>
            <p className="mt-1 text-[13px] text-[#618975] sm:text-sm">
              Search like a buyer with keywords, places, price intent, or natural phrases.
            </p>
          </div>

          <div className="px-6 py-5">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                applySmartSearch();
              }}
              className="rounded-2xl border border-[#D1D5DB] bg-[#EEF8EB] p-2.5"
            >
              <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-3">
                <div ref={smartSearchRef} className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#618975]" />
                  <input
                    type="text"
                    value={smartSearch}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      if (!nextValue.trim()) {
                        clearFilters();
                        return;
                      }

                      setSmartSearch(nextValue);
                      if (nextValue.trim().length < 2) {
                        setSmartSearchOpen(false);
                      }
                    }}
                    onFocus={() => setSmartSearchOpen(smartSearchSuggestions.length > 0)}
                    placeholder='Search "villa in kathmandu" or "apartment in lalitpur under 5000000"'
                    className="ps-soft-pulse h-12 w-full rounded-xl border border-[#D1D5DB] bg-white pl-11 pr-4 text-sm text-[#0D1C12] outline-none transition focus:border-[#316249] focus:ring-4 focus:ring-[#316249]/15"
                  />

                  {smartSearchOpen && smartSearchSuggestions.length > 0 ? (
                    <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-20 overflow-hidden rounded-2xl border border-[#D1D5DB] bg-white shadow-md">
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
                          className="flex w-full items-center gap-3 border-b border-[#E5E7EB] px-4 py-3 text-left text-sm text-[#0D1C12] transition hover:bg-[#EEF8EB] hover:text-[#316249] last:border-b-0"
                        >
                          <Search className="h-4 w-4 shrink-0 text-[#618975]" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium">{suggestion.label}</div>
                            <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#618975]">
                              {suggestion.type}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0 lg:items-center">
                  <button
                    type="submit"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#316249] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#28513D]"
                  >
                    <Sparkles className="h-4 w-4" />
                    Search
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdvancedOpen((current) => !current)}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#D1D5DB] bg-white px-4 text-sm font-medium text-[#0D1C12] transition hover:bg-[#F7FCFA]"
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

              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-[#618975]">
                <span className="font-medium text-[#618975]">Try:</span>
                <button
                  type="button"
                  onClick={() => setSmartSearch("villa in kathmandu")}
                  className="rounded-full border border-[#D1D5DB] bg-white px-2.5 py-1 text-[11px] text-[#618975] transition hover:border-[#D1D5DB] hover:text-[#316249]"
                >
                  villa in kathmandu
                </button>
                <button
                  type="button"
                  onClick={() => setSmartSearch("apartment in lalitpur under 5000000")}
                  className="rounded-full border border-[#D1D5DB] bg-white px-2.5 py-1 text-[11px] text-[#618975] transition hover:border-[#D1D5DB] hover:text-[#316249]"
                >
                  apartment in lalitpur under 5000000
                </button>
                <button
                  type="button"
                  onClick={() => setSmartSearch("house for rent in bhaktapur")}
                  className="rounded-full border border-[#D1D5DB] bg-white px-2.5 py-1 text-[11px] text-[#618975] transition hover:border-[#D1D5DB] hover:text-[#316249]"
                >
                  house for rent in bhaktapur
                </button>
              </div>
            </form>
          </div>

          <div className="border-t border-[#E5E7EB] px-6 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="inline-flex items-center rounded-full bg-[#EEF8EB] px-3 py-1.5 text-sm font-semibold text-[#316249] ring-1 ring-[#D1D5DB]">
                    {total} results
                  </div>
                  {activeFilters.length > 0 ? (
                    activeFilters.map((filter) => (
                      <button
                        type="button"
                        key={`${filter.key}:${filter.label}`}
                        onClick={() => removeFilter(filter.key)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#618975] ring-1 ring-[#D1D5DB] transition hover:bg-[#EEF8EB] hover:text-[#316249]"
                        title="Remove filter"
                      >
                        {formatFilterChipLabel(filter.label)}
                        <span className="text-[11px] font-bold">×</span>
                      </button>
                    ))
                  ) : (
                    <span className="text-sm text-[#618975]">No active filters</span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2.5 rounded-full bg-[#EEF8EB] px-4 py-2 text-sm font-semibold text-[#0D1C12] ring-1 ring-[#D1D5DB]">
                  <input
                    type="checkbox"
                    checked={showOnlyOffers}
                    onChange={(e) => setShowOnlyOffers(e.target.checked)}
                    className="h-4 w-4 accent-[#316249]"
                  />
                  Show only offers
                </label>

                <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#618975] ring-1 ring-[#D1D5DB]">
                  Sort
                  <select
                    value={sort}
                    onChange={(e) => updateTextFilter(setSort, e.target.value)}
                    className="bg-transparent text-sm font-semibold text-[#0D1C12] outline-none"
                  >
                    <option value="">Latest</option>
                    <option value="latest">Latest</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {advancedOpen ? (
            <div className="border-t border-[#E5E7EB] px-6 py-5">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#0D1C12]">
                <SlidersHorizontal className="h-4 w-4 text-[#316249]" />
                Advanced filters
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[#618975]">
                    Keyword
                  </label>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => updateTextFilter(setSearch, e.target.value)}
                    placeholder="Modern villa, apartment, house..."
                    className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#0D1C12] shadow-sm outline-none transition focus:border-[#316249] focus:ring-4 focus:ring-[#316249]/15"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[#618975]">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => updateTextFilter(setLocation, e.target.value)}
                    placeholder="Kathmandu, Lalitpur..."
                    className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#0D1C12] shadow-sm outline-none transition focus:border-[#316249] focus:ring-4 focus:ring-[#316249]/15"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[#618975]">
                    Listing Type
                  </label>
                  <select
                    value={listingType}
                    onChange={(e) => updateTextFilter(setListingType, e.target.value)}
                    className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#0D1C12] shadow-sm outline-none transition focus:border-[#316249] focus:ring-4 focus:ring-[#316249]/15"
                  >
                    <option value="">All listings</option>
                    <option value="buy">Buy</option>
                    <option value="rent">Rent</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[#618975]">
                    Min Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={minPrice}
                    onChange={(e) => updateTextFilter(setMinPrice, e.target.value)}
                    placeholder="0"
                    className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#0D1C12] shadow-sm outline-none transition focus:border-[#316249] focus:ring-4 focus:ring-[#316249]/15"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[#618975]">
                    Max Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={maxPrice}
                    onChange={(e) => updateTextFilter(setMaxPrice, e.target.value)}
                    placeholder="1000000"
                    className="w-full rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm text-[#0D1C12] shadow-sm outline-none transition focus:border-[#316249] focus:ring-4 focus:ring-[#316249]/15"
                  />
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-white p-8 shadow-sm">
            <div className="text-lg font-bold text-rose-700">{error}</div>
            <p className="mt-2 text-sm text-[#618975]">
              Please adjust filters or try again in a moment.
            </p>
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setRetryNonce((current) => current + 1)}
                className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700"
              >
                Retry
              </button>
            </div>
          </div>
        ) : loading ? (
          <LoadingSkeleton />
        ) : visibleItems.length === 0 ? (
          <EmptyState onResetFilters={clearFilters} />
        ) : (
          <section className="ps-fade-up ps-fade-up-delay-3 grid grid-cols-1 gap-7 sm:grid-cols-2 xl:grid-cols-3">
            {visibleItems.map((p) => {
              const saved = wishlistSet.has(p._id);
              const compareOn = compareSet.has(p._id);
              const cardArea = formatCardArea(p);
              const statusBadgeLabel = getStatusBadgeLabel(p);
              const heartPop = !!poppingIds[p._id];
              const scalePop = !!comparePopIds[p._id];

              return (
                <article
                  key={p._id}
                  className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_6px_16px_rgba(13,28,18,0.06)] transition-all duration-300 hover:-translate-y-[3px] hover:border-[#D1D5DB] hover:shadow-[0_14px_28px_rgba(13,28,18,0.10)]"
                >
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => toggleCompare(p._id)}
                      className={[
                        "absolute right-[2.8rem] top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EB] bg-white/95 text-[10px] text-[#0D1C12] shadow-sm backdrop-blur-sm transition active:scale-95 hover:border-[#316249]/40 hover:bg-[#EEF8EB]",
                        compareOn ? "border-[#316249]/60 bg-[#316249] text-white" : "text-[#0D1C12]",
                        scalePop ? "scale-105" : "",
                      ].join(" ")}
                      aria-label={compareOn ? "Remove from compare" : "Add to compare"}
                      title={compareOn ? "Remove from compare" : "Add to compare"}
                    >
                      <Scale className={["h-4 w-4", scalePop ? "scale-110" : ""].join(" ")} />
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleWishlist(p._id)}
                      className={[
                        "absolute right-3 top-3 z-20 grid h-9 w-9 place-items-center rounded-full border border-[#E5E7EB] bg-white/95 text-[#0D1C12] shadow-sm backdrop-blur-sm transition active:scale-95 hover:border-[#316249]/40 hover:bg-[#EEF8EB]",
                        saved ? "border-[#316249]/60 bg-[#316249] text-white" : "text-[#0D1C12]",
                        heartPop ? "scale-110" : "",
                      ].join(" ")}
                      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
                      title={saved ? "Saved" : "Save"}
                    >
                      <Heart
                        className={[
                          "h-4 w-4 transition-transform duration-200",
                          saved ? "fill-white" : "",
                          heartPop ? "scale-110" : "",
                        ].join(" ")}
                      />
                    </button>

                    <Link
                      href={`/buyer/property/${p._id}`}
                      className="block focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#316249]/35"
                    >
                      <div className="relative overflow-hidden rounded-t-2xl">
                        <img
                          src={getPrimaryImage(p)}
                          alt={p.title ?? "Property image"}
                          loading="lazy"
                          decoding="async"
                          className="h-52 w-full object-cover transition-transform duration-700 group-hover:scale-[1.02] sm:h-56"
                        />
                        <div className="absolute left-3 top-3 z-20 flex items-center gap-1.5">
                          {statusBadgeLabel === "Featured" ? (
                            <span className="inline-flex items-center rounded-full border border-[#D8E5DD] bg-white/88 px-2.5 py-0.5 text-[10px] font-medium text-[#316249] shadow-sm backdrop-blur-sm">
                              Featured
                            </span>
                          ) : null}
                          <span className="inline-flex items-center rounded-full border border-[#E5E7EB] bg-white/92 px-2.5 py-0.5 text-[10px] font-medium text-black shadow-sm backdrop-blur-sm">
                            {p.listingType === "rent" ? "For Rent" : "For Sale"}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </div>

                  <Link
                    href={`/buyer/property/${p._id}`}
                    className="flex h-full flex-1 flex-col p-4 sm:p-5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#316249]/35"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2.5">
                      <h3 className="line-clamp-2 text-[18px] font-semibold leading-6 tracking-tight text-black transition-colors group-hover:text-[#316249] sm:text-[19px]">
                        {p.title || "Property listing"}
                      </h3>
                      <span className="shrink-0 rounded-full border border-[#DDE5E0] bg-[#F2F8F4] px-3 py-1 text-[14px] font-semibold text-black">
                        {formatCardPrice(p)}
                      </span>
                    </div>

                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-black">
                      <MapPin className="h-[17px] w-[17px] shrink-0 text-[#374151]" strokeWidth={2.3} />
                      <span className="truncate">{p.address || p.location || "Location on request"}</span>
                    </p>

                    <div className="mt-3.5 border-t border-[#EEF2F0] pt-2.5">
                      <div className="grid grid-cols-3 gap-1.5 text-[13px] font-medium text-black">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-[#F7FAF8] px-2 py-1 text-[13px] text-black">
                          <BedDouble className="h-4 w-4 text-[#374151]" strokeWidth={2.2} />
                          {p.beds} bd
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-lg bg-[#F7FAF8] px-2 py-1 text-[13px] text-black">
                          <Bath className="h-4 w-4 text-[#374151]" strokeWidth={2.2} />
                          {p.baths} ba
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-lg bg-[#F7FAF8] px-2 py-1 text-[13px] text-black">
                          <Expand className="h-4 w-4 text-[#374151]" strokeWidth={2.2} />
                          {cardArea.includes("sqft") ? cardArea : "Area"}
                        </span>
                      </div>
                    </div>
                  </Link>
                </article>
              );
            })}
          </section>
        )}

        {!error && !loading && items.length > 0 && (
          <section className="ps-fade-up rounded-3xl border border-[#E5E7EB] bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#618975]">
                  Navigation
                </p>
                <p className="mt-1 text-sm text-[#618975]">
                  Total results <span className="font-bold text-[#0D1C12]">{total}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center justify-center rounded-xl border border-[#D1D5DB] bg-white px-4 py-2.5 text-sm font-semibold text-[#0D1C12] shadow-sm transition hover:bg-[#EEF8EB] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>

                <div className="rounded-2xl bg-[#EEF8EB] px-3.5 py-2 text-sm font-semibold text-[#0D1C12] ring-1 ring-[#D1D5DB]">
                  Page {page} of {totalPages}
                </div>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center justify-center rounded-xl bg-[#316249] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#28513D] disabled:cursor-not-allowed disabled:opacity-50"
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

export default function SearchPropertiesPage() {
  return (
    <Suspense fallback={null}>
      <SearchPropertiesPageContent />
    </Suspense>
  );
}
