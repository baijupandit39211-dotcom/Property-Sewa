"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Heart,
  Plus,
  RefreshCcw,
  Scale,
  Search,
  Trash2,
} from "lucide-react";

import { apiFetch } from "../../lib/api";
import type { Property } from "../../lib/property.types";
import PropertyCard from "@/components/property/PropertyCard";
import {
  BUYER_CACHE_KEYS,
  removeWishlistIdFromCache,
  readFreshBuyerCache,
  writeBuyerCache,
} from "@/app/buyer/prefetchCache";
import BuyerToast, { showBuyerToast, type BuyerToastState } from "@/app/buyer/_components/BuyerToast";

type WishlistItem = { propertyId: Property | null };
type ListResponse = { items: WishlistItem[] };

const COMPARE_KEY = "property-sewa:compare:v1";
const MAX_COMPARE = 2;

const THEME = {
  primary: "#316249",
  primaryDark: "#274f3a",
  primarySoft: "#EEF8EB",
  primaryBorder: "#D1D5DB",
  text: "#0D1C12",
  textSoft: "#618975",
  border: "#E5E7EB",
};

function readCompareIds(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(COMPARE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    const ids = Array.isArray(parsed?.ids) ? parsed.ids : [];
    return ids.filter((value: unknown): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

function writeCompareIds(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COMPARE_KEY, JSON.stringify({ ids: ids.slice(0, MAX_COMPARE) }));
}

function EmptyState() {
  return (
    <div
      className="rounded-[30px] border p-10 text-center shadow-sm"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(248,251,249,1) 100%)",
        borderColor: THEME.primaryBorder,
      }}
    >
      <div
        className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-[22px] border"
        style={{ backgroundColor: THEME.primarySoft, borderColor: THEME.primaryBorder }}
      >
        <Heart className="h-6 w-6" style={{ color: THEME.primary }} />
      </div>

      <h2 className="text-2xl font-bold tracking-tight" style={{ color: THEME.text }}>
        Your wishlist is empty
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-base leading-7" style={{ color: THEME.textSoft }}>
        Browse listings and save the homes you want to revisit. Once properties are added, they
        will appear here in your shortlist workspace.
      </p>

      <Link
        href="/buyer/search-properties"
        className="mt-7 inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition"
        style={{ backgroundColor: THEME.primary }}
      >
        Browse Properties <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export default function BuyerWishlistPage() {
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"latest" | "price_asc" | "price_desc">("latest");
  const [listingFilter, setListingFilter] = useState<"all" | "sale" | "rent">("all");
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<BuyerToastState>({ show: false, text: "", tone: "success" });

  const toastTimer = useRef<number | null>(null);

  const wishlistSet = useMemo(() => new Set(wishlistIds), [wishlistIds]);
  const compareSet = useMemo(() => new Set(compareIds), [compareIds]);

  function showToast(text: string, tone: BuyerToastState["tone"] = "success") {
    const next = showBuyerToast({ tone, fallbackText: text });
    setToast({ show: true, text: next.text, tone: next.tone });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => {
      setToast((current) => ({ ...current, show: false }));
    }, 1400);
  }

  async function refresh(showRefreshToast = true) {
    setLoading(true);
    try {
      const cached = readFreshBuyerCache<ListResponse>(BUYER_CACHE_KEYS.wishlist);
      if (cached?.items?.length) {
        const cachedProperties = (cached.items || [])
          .map((item) => item.propertyId)
          .filter((item): item is Property => Boolean(item));
        setAllProperties(cachedProperties);
        setWishlistIds(cachedProperties.map((item) => item._id));
        if (!showRefreshToast) {
          setLoading(false);
          return;
        }
      }

      const res = await apiFetch<ListResponse>("/wishlist");
      writeBuyerCache(BUYER_CACHE_KEYS.wishlist, res);
      const properties = (res.items || [])
        .map((item) => item.propertyId)
        .filter((item): item is Property => Boolean(item));

      setAllProperties(properties);
      setWishlistIds(properties.map((item) => item._id));
      setCompareIds(readCompareIds());

      if (showRefreshToast) showToast("Refreshed");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh(false);

    const handleStorage = (event: StorageEvent) => {
      if (event.key === COMPARE_KEY) {
        setCompareIds(readCompareIds());
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const savedItems = useMemo(() => {
    return allProperties.filter((property) => wishlistSet.has(property._id));
  }, [allProperties, wishlistSet]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let base = savedItems;

    if (listingFilter !== "all") {
      base = base.filter((property) => {
        const type = String((property as any).listingType || "").toLowerCase();
        if (listingFilter === "sale") return type === "buy" || type === "sale";
        return type === "rent";
      });
    }

    let searched = base;
    if (query) {
      searched = base.filter((property) => {
        const haystack = [
          property.title,
          property.address,
          property.location,
          property.currency,
          String(property.price ?? ""),
          String(property.beds ?? ""),
          String(property.baths ?? ""),
          String(property.sqft ?? ""),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      });
    }

    const sorted = [...searched].sort((left, right) => {
      if (sortBy === "price_asc") return Number(left.price || 0) - Number(right.price || 0);
      if (sortBy === "price_desc") return Number(right.price || 0) - Number(left.price || 0);
      return 0;
    });

    return sorted;
  }, [savedItems, searchQuery, sortBy, listingFilter]);

  async function removeSelected() {
    if (!selectedIds.length) {
      showToast("Select properties to remove", "warning");
      return;
    }

    const prevIds = wishlistIds;
    const prevProperties = allProperties;
    const removeSet = new Set(selectedIds);
    const nextIds = wishlistIds.filter((id) => !removeSet.has(id));
    const nextProperties = allProperties.filter((property) => !removeSet.has(property._id));

    setWishlistIds(nextIds);
    setAllProperties(nextProperties);
    setSelectedIds([]);
    showToast("Removing selected...");

    try {
      await Promise.all(selectedIds.map((id) => apiFetch(`/wishlist/${id}`, { method: "DELETE" })));
      selectedIds.forEach((id) => removeWishlistIdFromCache(id));
      showToast("Selected removed");
    } catch (e) {
      console.error(e);
      setWishlistIds(prevIds);
      setAllProperties(prevProperties);
      showToast("Failed to remove selected", "error");
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  async function removeOne(id: string) {
    try {
      await apiFetch(`/wishlist/${id}`, { method: "DELETE" });

      const next = wishlistIds.filter((x) => x !== id);
      setWishlistIds(next);
      removeWishlistIdFromCache(id);
      setAllProperties((prev) => prev.filter((property) => property._id !== id));
      showToast("Removed from wishlist");
    } catch (e) {
      console.error(e);
    }
  }

  function clearAll() {
    showToast("Clear all is not available yet");
  }

  function toggleCompare(id: string) {
    const has = compareSet.has(id);

    if (has) {
      const next = compareIds.filter((currentId) => currentId !== id);
      setCompareIds(next);
      writeCompareIds(next);
      showToast("Removed from compare");
      return;
    }

    if (compareIds.length >= MAX_COMPARE) {
      showToast(`Compare is full (${MAX_COMPARE}/${MAX_COMPARE})`, "warning");
      return;
    }

    const next = [id, ...compareIds];
    setCompareIds(next);
    writeCompareIds(next);
    showToast("Added to compare");
  }

  return (
    <main
      className="min-h-screen w-full min-w-0 bg-[#F7FCFA] p-4 sm:p-6"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(49,98,73,0.12), transparent 24%), radial-gradient(circle at top right, rgba(49,98,73,0.06), transparent 22%), linear-gradient(180deg, #F7FCFA 0%, #EEF8EB 100%)",
      }}
    >
      <BuyerToast show={toast.show} text={toast.text} tone={toast.tone} />

      <div className="mx-auto max-w-7xl">
        <div
          className="overflow-hidden rounded-[34px] border shadow-[0_20px_48px_rgba(13,28,18,0.08)]"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,249,0.98) 100%)",
            borderColor: "#E5E7EB",
          }}
        >
          <section className="overflow-hidden rounded-[32px] border border-[#D1D5DB]/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-6 text-white shadow-[0_22px_56px_rgba(13,28,18,0.10)] sm:px-8 sm:py-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/90">
                  <Heart className="h-3.5 w-3.5" />
                  Saved Homes
                </div>

                <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Saved Homes
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
                  View and manage your saved properties, keep compare selections in sync, and jump
                  back into the buyer flow from one polished shortlist workspace.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/buyer/compare"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition backdrop-blur-sm hover:bg-white/15"
                >
                  <Scale className="h-4 w-4" />
                  Compare ({compareIds.length})
                </Link>

                <button
                  type="button"
                  onClick={() => refresh()}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition backdrop-blur-sm hover:bg-white/15"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={clearAll}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition backdrop-blur-sm hover:bg-white/15"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear All
                </button>
              </div>
            </div>
          </section>

          <section className="px-6 py-6 sm:px-8">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
              <div
                className="flex items-center gap-3 rounded-[24px] border px-5 py-4"
                style={{ backgroundColor: "#ffffff", borderColor: "#E5E7EB" }}
              >
                <Search className="h-5 w-5" style={{ color: THEME.textSoft }} />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search saved properties by title, location, price or features..."
                  className="w-full bg-transparent text-base leading-7 outline-none placeholder:text-[#618975]"
                  style={{ color: THEME.text }}
                  aria-label="Search saved properties"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div
                  className="rounded-full border px-4 py-2 font-semibold"
                  style={{ backgroundColor: THEME.primarySoft, borderColor: THEME.primaryBorder, color: THEME.primaryDark }}
                >
                  Showing {filteredItems.length} saved homes
                </div>
                <div
                  className="rounded-full border px-4 py-2 font-semibold"
                  style={{ backgroundColor: "#ffffff", borderColor: "#E5E7EB", color: THEME.text }}
                >
                  Compare {compareIds.length}/{MAX_COMPARE}
                </div>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as "latest" | "price_asc" | "price_desc")}
                  className="rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold outline-none"
                  style={{ color: THEME.text }}
                >
                  <option value="latest">Latest</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
                <select
                  value={listingFilter}
                  onChange={(event) => setListingFilter(event.target.value as "all" | "sale" | "rent")}
                  className="rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold outline-none"
                  style={{ color: THEME.text }}
                >
                  <option value="all">All Types</option>
                  <option value="sale">For Sale</option>
                  <option value="rent">For Rent</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setBulkMode((current) => !current);
                    setSelectedIds([]);
                  }}
                  className="rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold transition hover:bg-[#EEF8EB]"
                  style={{ color: THEME.text }}
                >
                  {bulkMode ? "Exit Bulk" : "Bulk Remove"}
                </button>
                {bulkMode ? (
                  <button
                    type="button"
                    onClick={removeSelected}
                    className="rounded-full px-4 py-2 text-sm font-semibold text-white transition"
                    style={{ backgroundColor: THEME.primary }}
                  >
                    Remove Selected ({selectedIds.length})
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-[28px] border p-5 shadow-sm" style={{ backgroundColor: "#fff", borderColor: THEME.primaryBorder }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: THEME.textSoft }}>Saved properties</p>
                    <p className="mt-2 text-3xl font-bold tracking-tight" style={{ color: THEME.text }}>{wishlistIds.length}</p>
                    <p className="mt-2 text-sm leading-6" style={{ color: THEME.textSoft }}>Total items in your shortlist.</p>
                  </div>
                  <div
                    className="rounded-2xl p-3 text-white shadow-sm"
                    style={{ background: "linear-gradient(135deg, #316249 0%, #4D9966 100%)" }}
                  >
                    <Heart className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border p-5 shadow-sm" style={{ backgroundColor: "#fff", borderColor: THEME.primaryBorder }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: THEME.textSoft }}>Visible cards</p>
                    <p className="mt-2 text-3xl font-bold tracking-tight" style={{ color: THEME.text }}>{filteredItems.length}</p>
                    <p className="mt-2 text-sm leading-6" style={{ color: THEME.textSoft }}>Properties currently rendered below.</p>
                  </div>
                  <div
                    className="rounded-2xl p-3 text-white shadow-sm"
                    style={{ background: "linear-gradient(135deg, #316249 0%, #4D9966 100%)" }}
                  >
                    <RefreshCcw className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border p-5 shadow-sm" style={{ backgroundColor: "#fff", borderColor: THEME.primaryBorder }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: THEME.textSoft }}>Wishlist status</p>
                    <p className="mt-2 text-3xl font-bold tracking-tight" style={{ color: THEME.text }}>
                      {loading ? "..." : wishlistIds.length > 0 ? "Active" : "Empty"}
                    </p>
                    <p className="mt-2 text-sm leading-6" style={{ color: THEME.textSoft }}>Use refresh anytime to sync this view.</p>
                  </div>
                  <div
                    className="rounded-2xl p-3 text-white shadow-sm"
                    style={{ background: "linear-gradient(135deg, #316249 0%, #4D9966 100%)" }}
                  >
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div
                className="mt-6 rounded-[30px] border p-10 shadow-sm"
                style={{ backgroundColor: "#ffffff", borderColor: THEME.primaryBorder }}
              >
                <div className="flex flex-col items-center justify-center text-center">
                  <div
                    className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border"
                    style={{ backgroundColor: THEME.primarySoft, borderColor: THEME.primaryBorder }}
                  >
                    <RefreshCcw className="h-5 w-5 animate-spin" style={{ color: THEME.primary }} />
                  </div>
                  <div className="text-lg font-bold" style={{ color: THEME.text }}>Loading wishlist...</div>
                  <p className="mt-2 text-sm leading-6" style={{ color: THEME.textSoft }}>
                    Preparing your saved properties and shortlist view.
                  </p>
                </div>
              </div>
            ) : wishlistIds.length === 0 ? (
              <div className="mt-6">
                <EmptyState />
              </div>
            ) : savedItems.length === 0 ? (
              <div
                className="mt-6 rounded-[30px] border p-10 text-center shadow-sm"
                style={{ backgroundColor: "#ffffff", borderColor: THEME.primaryBorder }}
              >
                <div
                  className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border"
                  style={{ backgroundColor: "#E8F2EB", borderColor: "#D1D5DB" }}
                >
                  <RefreshCcw className="h-5 w-5 text-[#0D1C12]" />
                </div>
                <div className="text-lg font-bold tracking-tight" style={{ color: THEME.text }}>
                  Saved properties could not be rendered
                </div>
                <p className="mt-2 text-sm leading-6" style={{ color: THEME.textSoft }}>
                  Click refresh to try loading the latest wishlist items again.
                </p>
                <button
                  type="button"
                  onClick={() => refresh()}
                  className="mt-6 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition"
                  style={{ backgroundColor: THEME.primary }}
                >
                  Refresh <RefreshCcw className="h-4 w-4" />
                </button>
              </div>
            ) : filteredItems.length === 0 ? (
              <div
                className="mt-6 rounded-[30px] border p-10 text-center shadow-sm"
                style={{ backgroundColor: "#ffffff", borderColor: THEME.primaryBorder }}
              >
                <div
                  className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border"
                  style={{ backgroundColor: THEME.primarySoft, borderColor: THEME.primaryBorder }}
                >
                  <Search className="h-5 w-5" style={{ color: THEME.primary }} />
                </div>
                <div className="text-lg font-bold tracking-tight" style={{ color: THEME.text }}>
                  No saved homes match your search
                </div>
                <p className="mt-2 text-sm leading-6" style={{ color: THEME.textSoft }}>
                  Try a different title, location, feature, or clear the search input.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="mt-6 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white transition"
                  style={{ backgroundColor: THEME.primary }}
                >
                  Clear Search
                </button>
              </div>
            ) : (
              <>
                <section className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {filteredItems.slice(0, 3).map((property) => {
                    const compareOn = compareSet.has(property._id);

                    return (
                      <motion.div
                        key={property._id}
                        whileHover={{ y: -6 }}
                        transition={{ duration: 0.18 }}
                        className="h-full"
                      >
                        <div className="relative">
                          {bulkMode ? (
                            <label className="absolute left-3 top-3 z-30 inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#0D1C12] ring-1 ring-[#D1D5DB]">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(property._id)}
                                onChange={() => toggleSelect(property._id)}
                                className="h-3.5 w-3.5 accent-[#316249]"
                              />
                              Select
                            </label>
                          ) : null}
                          <PropertyCard
                            property={property}
                            variant="default"
                            saved={wishlistSet.has(property._id)}
                            onToggleWishlist={removeOne}
                            compareOn={compareOn}
                            onToggleCompare={toggleCompare}
                          />
                        </div>
                      </motion.div>
                    );
                  })}

                  <Link
                    href="/buyer/search-properties"
                    className="flex min-h-[520px] flex-col items-center justify-center rounded-[28px] border border-dashed bg-white text-center shadow-sm transition"
                    style={{ borderColor: "#cfdad4", color: THEME.textSoft }}
                  >
                    <div className="grid h-20 w-20 place-items-center rounded-full" style={{ backgroundColor: THEME.primarySoft }}>
                      <Plus className="h-10 w-10" style={{ color: THEME.primary }} />
                    </div>
                    <div className="mt-6 text-3xl font-medium tracking-tight" style={{ color: THEME.text }}>Add Another</div>
                    <div className="mt-2 max-w-[220px] text-lg font-medium leading-8" style={{ color: THEME.textSoft }}>Property</div>
                  </Link>
                </section>

                {filteredItems.length > 3 ? (
                  <section className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {filteredItems.slice(3).map((property) => {
                      const compareOn = compareSet.has(property._id);

                      return (
                        <motion.div
                          key={property._id}
                          whileHover={{ y: -6 }}
                          transition={{ duration: 0.18 }}
                          className="h-full"
                        >
                          <div className="relative">
                            {bulkMode ? (
                              <label className="absolute left-3 top-3 z-30 inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#0D1C12] ring-1 ring-[#D1D5DB]">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.includes(property._id)}
                                  onChange={() => toggleSelect(property._id)}
                                  className="h-3.5 w-3.5 accent-[#316249]"
                                />
                                Select
                              </label>
                            ) : null}
                            <PropertyCard
                              property={property}
                              variant="default"
                              saved={wishlistSet.has(property._id)}
                              onToggleWishlist={removeOne}
                              compareOn={compareOn}
                              onToggleCompare={toggleCompare}
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </section>
                ) : null}

                <section
                  className="mt-6 flex flex-col gap-4 border-t px-1 pt-6 lg:flex-row lg:items-center lg:justify-between"
                  style={{ borderColor: "#E5E7EB" }}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={clearAll}
                      className="inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition"
                      style={{
                        backgroundColor: "#ffffff",
                        borderColor: THEME.border,
                        color: THEME.text,
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Clear All
                    </button>

                    <div className="max-w-xl text-sm leading-7" style={{ color: THEME.textSoft }}>
                      Compare up to {MAX_COMPARE} properties side-by-side and keep your shortlist
                      synced across saved homes, search, and compare.
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href="/buyer/compare"
                      className="inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition"
                      style={{
                        backgroundColor: "#ffffff",
                        borderColor: THEME.border,
                        color: THEME.text,
                      }}
                    >
                      <Scale className="h-4 w-4" />
                      Compare
                    </Link>

                    <Link
                      href="/buyer/search-properties"
                      className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition"
                      style={{ backgroundColor: THEME.primary }}
                    >
                      Add More Homes
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </section>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
