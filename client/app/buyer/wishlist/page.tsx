"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Heart,
  MapPin,
  Plus,
  RefreshCcw,
  Scale,
  Search,
  Trash2,
} from "lucide-react";

import { apiFetch } from "../../lib/api";
import type { Property } from "../../lib/property.types";

type ToastState = { show: boolean; text: string };
type WishlistItem = { propertyId: Property | null };
type ListResponse = { items: WishlistItem[] };

const COMPARE_KEY = "property-sewa:compare:v1";
const MAX_COMPARE = 2;

const THEME = {
  primary: "#316249",
  primaryDark: "#274f3a",
  primarySoft: "#edf5f0",
  primaryBorder: "#d7e7dd",
  text: "#1f2937",
  textSoft: "#4b5563",
  border: "#e5e7eb",
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

function formatPrice(property: Property) {
  const currency = property.currency || "NPR";
  const price = Number(property.price || 0);
  return `${currency} ${price.toLocaleString()}`;
}

function formatLocation(property: Property) {
  return property.address || property.location || "Location unavailable";
}

function safeImage(property: Property) {
  return property.images?.[0]?.url || "/placeholder-property.jpg";
}

function Toast({ show, text }: { show: boolean; text: string }) {
  return (
    <div
      className={[
        "fixed right-5 top-5 z-[9999] transition-all duration-200 sm:right-6 sm:top-6",
        show ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
      ].join(" ")}
    >
      <div
        className="rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-xl"
        style={{ backgroundColor: THEME.primary }}
      >
        {text}
      </div>
    </div>
  );
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

      <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: THEME.text }}>
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
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>({ show: false, text: "" });

  const toastTimer = useRef<number | null>(null);

  const wishlistSet = useMemo(() => new Set(wishlistIds), [wishlistIds]);
  const compareSet = useMemo(() => new Set(compareIds), [compareIds]);

  function showToast(text: string) {
    setToast({ show: true, text });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => {
      setToast((current) => ({ ...current, show: false }));
    }, 1400);
  }

  async function refresh(showRefreshToast = true) {
    setLoading(true);
    try {
      const res = await apiFetch<ListResponse>("/wishlist");
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
    if (!query) return savedItems;

    return savedItems.filter((property) => {
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
  }, [savedItems, searchQuery]);

  async function removeOne(id: string) {
    try {
      await apiFetch(`/wishlist/${id}`, { method: "DELETE" });

      const next = wishlistIds.filter((x) => x !== id);
      setWishlistIds(next);
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
      showToast(`Compare is full (${MAX_COMPARE}/${MAX_COMPARE})`);
      return;
    }

    const next = [id, ...compareIds];
    setCompareIds(next);
    writeCompareIds(next);
    showToast("Added to compare");
  }

  return (
    <main
      className="min-h-screen w-full min-w-0 p-4 sm:p-6"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(49,98,73,0.16), transparent 24%), radial-gradient(circle at top right, rgba(49,98,73,0.08), transparent 22%), linear-gradient(180deg, #edf4f0 0%, #f7faf8 100%)",
      }}
    >
      <Toast show={toast.show} text={toast.text} />

      <div className="mx-auto max-w-7xl">
        <div
          className="overflow-hidden rounded-[34px] border shadow-[0_28px_90px_rgba(15,23,42,0.10)]"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,249,0.98) 100%)",
            borderColor: "#d9e4de",
          }}
        >
          <section
            className="border-b px-6 py-6 sm:px-8"
            style={{
              background:
                "linear-gradient(180deg, rgba(240,244,248,0.92) 0%, rgba(255,255,255,0.98) 100%)",
              borderColor: "#e4eaef",
            }}
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]"
                  style={{
                    backgroundColor: THEME.primarySoft,
                    borderColor: THEME.primaryBorder,
                    color: THEME.primaryDark,
                  }}
                >
                  <Heart className="h-3.5 w-3.5" />
                  Saved Homes
                </div>

                <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-[42px]" style={{ color: THEME.text }}>
                  Saved Homes
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 sm:text-[17px]" style={{ color: THEME.textSoft }}>
                  View and manage your saved properties, keep compare selections in sync, and jump
                  back into the buyer flow from one polished shortlist workspace.
                </p>
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
                  Compare ({compareIds.length})
                </Link>

                <button
                  type="button"
                  onClick={() => refresh()}
                  className="inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition"
                  style={{
                    backgroundColor: "#ffffff",
                    borderColor: THEME.border,
                    color: THEME.text,
                  }}
                >
                  <RefreshCcw className="h-4 w-4" />
                  Refresh
                </button>

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
              </div>
            </div>
          </section>

          <section className="px-6 py-6 sm:px-8">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
              <div
                className="flex items-center gap-3 rounded-[24px] border px-5 py-4"
                style={{ backgroundColor: "#ffffff", borderColor: "#e7ece9" }}
              >
                <Search className="h-5 w-5" style={{ color: THEME.textSoft }} />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search saved properties by title, location, price or features..."
                  className="w-full bg-transparent text-base leading-7 outline-none placeholder:text-slate-500"
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
                  style={{ backgroundColor: "#ffffff", borderColor: "#e7ece9", color: THEME.text }}
                >
                  Compare {compareIds.length}/{MAX_COMPARE}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-[28px] border p-5 shadow-sm" style={{ backgroundColor: "#fff", borderColor: THEME.primaryBorder }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[15px] font-semibold" style={{ color: THEME.textSoft }}>Saved properties</p>
                    <p className="mt-2 text-3xl font-bold tracking-tight" style={{ color: THEME.text }}>{wishlistIds.length}</p>
                    <p className="mt-2 text-[15px] leading-6" style={{ color: THEME.textSoft }}>Total items in your shortlist.</p>
                  </div>
                  <div
                    className="rounded-2xl p-3 text-white shadow-sm"
                    style={{ background: "linear-gradient(135deg, #316249 0%, #6b9b83 100%)" }}
                  >
                    <Heart className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border p-5 shadow-sm" style={{ backgroundColor: "#fff", borderColor: THEME.primaryBorder }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[15px] font-semibold" style={{ color: THEME.textSoft }}>Visible cards</p>
                    <p className="mt-2 text-3xl font-bold tracking-tight" style={{ color: THEME.text }}>{filteredItems.length}</p>
                    <p className="mt-2 text-[15px] leading-6" style={{ color: THEME.textSoft }}>Properties currently rendered below.</p>
                  </div>
                  <div
                    className="rounded-2xl p-3 text-white shadow-sm"
                    style={{ background: "linear-gradient(135deg, #316249 0%, #6b9b83 100%)" }}
                  >
                    <RefreshCcw className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border p-5 shadow-sm" style={{ backgroundColor: "#fff", borderColor: THEME.primaryBorder }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[15px] font-semibold" style={{ color: THEME.textSoft }}>Wishlist status</p>
                    <p className="mt-2 text-3xl font-bold tracking-tight" style={{ color: THEME.text }}>
                      {loading ? "..." : wishlistIds.length > 0 ? "Active" : "Empty"}
                    </p>
                    <p className="mt-2 text-[15px] leading-6" style={{ color: THEME.textSoft }}>Use refresh anytime to sync this view.</p>
                  </div>
                  <div
                    className="rounded-2xl p-3 text-white shadow-sm"
                    style={{ background: "linear-gradient(135deg, #316249 0%, #6b9b83 100%)" }}
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
                  <p className="mt-2 text-[15px] leading-6" style={{ color: THEME.textSoft }}>
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
                  style={{ backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }}
                >
                  <RefreshCcw className="h-5 w-5 text-slate-700" />
                </div>
                <div className="text-lg font-extrabold tracking-tight" style={{ color: THEME.text }}>
                  Saved properties could not be rendered
                </div>
                <p className="mt-2 text-[15px] leading-6" style={{ color: THEME.textSoft }}>
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
                <div className="text-lg font-extrabold tracking-tight" style={{ color: THEME.text }}>
                  No saved homes match your search
                </div>
                <p className="mt-2 text-[15px] leading-6" style={{ color: THEME.textSoft }}>
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
                <section className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                  {filteredItems.slice(0, 3).map((property) => {
                    const compareOn = compareSet.has(property._id);

                    return (
                      <motion.div
                        key={property._id}
                        whileHover={{ y: -6 }}
                        transition={{ duration: 0.18 }}
                        className="group overflow-hidden rounded-[28px] border bg-white shadow-sm transition"
                        style={{ borderColor: THEME.primaryBorder }}
                      >
                        <div className="relative overflow-hidden">
                          <div
                            className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur-sm"
                            style={{
                              backgroundColor: THEME.primary,
                              color: "#ffffff",
                            }}
                          >
                            Saved
                          </div>

                          <div
                            className="absolute right-4 top-4 z-10 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm"
                            style={{ backgroundColor: "rgba(255,255,255,0.92)", color: THEME.text }}
                          >
                            <Heart className="h-3.5 w-3.5 fill-[#316249] text-[#316249]" />
                            Save
                          </div>

                          <img
                            src={safeImage(property)}
                            alt={property.title ?? "Property image"}
                            className="h-[220px] w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                          />
                        </div>

                        <div className="space-y-4 p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="line-clamp-2 text-[19px] font-bold leading-7" style={{ color: THEME.text }}>
                                {property.title}
                              </div>
                              <div className="mt-2 flex items-center gap-1 text-[15px] leading-6" style={{ color: THEME.textSoft }}>
                                <MapPin className="h-4 w-4" />
                                <span className="line-clamp-1">{formatLocation(property)}</span>
                              </div>
                            </div>
                            <div className="text-right text-2xl font-bold tracking-tight" style={{ color: THEME.text }}>
                              {formatPrice(property)}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {[
                              `${property.beds ?? "-"} beds`,
                              `${property.baths ?? "-"} baths`,
                              `${property.sqft ?? "-"} sq ft`,
                            ].map((item) => (
                              <span
                                key={item}
                                className="rounded-full px-3 py-1.5 text-xs font-semibold"
                                style={{ backgroundColor: THEME.primarySoft, color: THEME.primaryDark }}
                              >
                                {item}
                              </span>
                            ))}
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <Link
                              href={`/buyer/property/${property._id}`}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition"
                              style={{ backgroundColor: THEME.primary }}
                            >
                              View Listing
                            </Link>

                            <button
                              type="button"
                              onClick={() => toggleCompare(property._id)}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition"
                              style={{
                                backgroundColor: compareOn ? THEME.primarySoft : "#ffffff",
                                borderColor: compareOn ? THEME.primaryBorder : THEME.border,
                                color: compareOn ? THEME.primaryDark : THEME.text,
                              }}
                            >
                              <Scale className="h-4 w-4" />
                              {compareOn ? "Comparing" : "Compare"}
                            </button>
                          </div>

                          <div className="flex items-center justify-between border-t pt-4" style={{ borderColor: "#edf2f7" }}>
                            <div className="text-xl font-bold" style={{ color: THEME.primary }}>
                              {formatPrice(property)}
                            </div>

                            <button
                              type="button"
                              onClick={() => removeOne(property._id)}
                              className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition"
                              style={{
                                backgroundColor: "#ffffff",
                                borderColor: THEME.border,
                                color: THEME.text,
                              }}
                              title="Remove"
                              aria-label="Remove"
                            >
                              <Trash2 className="h-4 w-4" />
                              Remove
                            </button>
                          </div>
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
                    <div className="mt-6 text-3xl font-semibold tracking-tight" style={{ color: THEME.text }}>Add Another</div>
                    <div className="mt-2 max-w-[220px] text-xl font-medium leading-8" style={{ color: THEME.textSoft }}>Property</div>
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
                          className="group overflow-hidden rounded-[28px] border bg-white shadow-sm transition"
                          style={{ borderColor: THEME.primaryBorder }}
                        >
                          <div className="relative overflow-hidden">
                            <div
                              className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
                              style={{ backgroundColor: THEME.primary, color: "#ffffff" }}
                            >
                              Saved
                            </div>

                            <div
                              className="absolute right-4 top-4 z-10 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm"
                              style={{ backgroundColor: "rgba(255,255,255,0.92)", color: THEME.text }}
                            >
                              <Heart className="h-3.5 w-3.5 fill-[#316249] text-[#316249]" />
                              Save
                            </div>

                            <img
                              src={safeImage(property)}
                              alt={property.title ?? "Property image"}
                              className="h-[220px] w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                            />
                          </div>

                          <div className="space-y-4 p-5">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="line-clamp-2 text-[19px] font-bold leading-7" style={{ color: THEME.text }}>
                                  {property.title}
                                </div>
                                <div className="mt-2 flex items-center gap-1 text-[15px] leading-6" style={{ color: THEME.textSoft }}>
                                  <MapPin className="h-4 w-4" />
                                  <span className="line-clamp-1">{formatLocation(property)}</span>
                                </div>
                              </div>
                              <div className="text-right text-2xl font-bold tracking-tight" style={{ color: THEME.text }}>
                                {formatPrice(property)}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {[
                                `${property.beds ?? "-"} beds`,
                                `${property.baths ?? "-"} baths`,
                                `${property.sqft ?? "-"} sq ft`,
                              ].map((item) => (
                                <span
                                  key={item}
                                  className="rounded-full px-3 py-1.5 text-xs font-semibold"
                                  style={{ backgroundColor: THEME.primarySoft, color: THEME.primaryDark }}
                                >
                                  {item}
                                </span>
                              ))}
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                              <Link
                                href={`/buyer/property/${property._id}`}
                                className="inline-flex items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold transition sm:col-span-1"
                                style={{
                                  backgroundColor: "#ffffff",
                                  borderColor: THEME.border,
                                  color: THEME.text,
                                }}
                              >
                                View
                              </Link>

                              <button
                                type="button"
                                onClick={() => toggleCompare(property._id)}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition sm:col-span-1"
                                style={{
                                  backgroundColor: compareOn ? THEME.primarySoft : "#ffffff",
                                  borderColor: compareOn ? THEME.primaryBorder : THEME.border,
                                  color: compareOn ? THEME.primaryDark : THEME.text,
                                }}
                              >
                                <Scale className="h-4 w-4" />
                                {compareOn ? "Comparing" : "Compare"}
                              </button>

                              <button
                                type="button"
                                onClick={() => removeOne(property._id)}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition sm:col-span-1"
                                style={{
                                  backgroundColor: "#ffffff",
                                  borderColor: THEME.border,
                                  color: THEME.text,
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </section>
                ) : null}

                <section
                  className="mt-6 flex flex-col gap-4 border-t px-1 pt-6 lg:flex-row lg:items-center lg:justify-between"
                  style={{ borderColor: "#e7ece9" }}
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

                    <div className="max-w-xl text-[15px] leading-7" style={{ color: THEME.textSoft }}>
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
