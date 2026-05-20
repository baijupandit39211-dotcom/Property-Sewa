"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Heart,
  MapPin,
  MessageCircle,
  RefreshCcw,
  Scale,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { apiFetch } from "../../lib/api";
import type { Property } from "../../lib/property.types";
import {
  addWishlistIdToCache,
  BUYER_CACHE_KEYS,
  writeWishlistIdsToCache,
  readFreshBuyerCache,
  writeBuyerCache,
} from "@/app/buyer/prefetchCache";

type PropertyListResponse = { items: Property[] };
type WishlistResponse = { items: Array<{ propertyId?: string | { _id?: string } }> };
type InquiryLead = {
  _id: string;
  propertyId?: string | { _id?: string; title?: string; location?: string };
  status?: string;
  createdAt?: string;
};
type InquiryResponse = { success: boolean; items: InquiryLead[] };

type CompareRow = {
  label: string;
  left: ReactNode;
  right: ReactNode;
  different: boolean;
};

const COMPARE_KEY = "property-sewa:compare:v1";
const LEGACY_COMPARE_KEY = "property_compare_ids";
const MAX_COMPARE = 2;
const ComparePropertyPanel = dynamic(() => import("./ComparePropertyPanel"), {
  ssr: false,
  loading: () => <div className="min-h-[540px] rounded-[28px] border border-[#D1D5DB] bg-white shadow-sm" />,
});

const THEME = {
  primary: "#316249",
  primaryDark: "#274f3a",
  primarySoft: "#EEF8EB",
  primaryBorder: "#D1D5DB",
  text: "#0D1C12",
  textSoft: "#618975",
  border: "#E5E7EB",
};

function readIdsFromStorage(raw: string | null): string[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((value): value is string => typeof value === "string");
    }

    if (Array.isArray(parsed?.ids)) {
      return parsed.ids.filter((value: unknown): value is string => typeof value === "string");
    }
  } catch {
    return [];
  }

  return [];
}

function readCompareIds(): string[] {
  if (typeof window === "undefined") return [];

  const current = readIdsFromStorage(window.localStorage.getItem(COMPARE_KEY));
  if (current.length) return current.slice(0, MAX_COMPARE);

  const legacy = readIdsFromStorage(window.localStorage.getItem(LEGACY_COMPARE_KEY)).slice(
    0,
    MAX_COMPARE
  );

  if (legacy.length) {
    writeCompareIds(legacy);
    window.localStorage.removeItem(LEGACY_COMPARE_KEY);
  }

  return legacy;
}

function writeCompareIds(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COMPARE_KEY, JSON.stringify({ ids: ids.slice(0, MAX_COMPARE) }));
}

function sameValue(left: unknown, right: unknown) {
  return String(left ?? "").trim().toLowerCase() === String(right ?? "").trim().toLowerCase();
}

function yesNo(value: boolean) {
  return value ? (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{
        backgroundColor: "#EEF8EB",
        color: THEME.primaryDark,
        border: "1px solid #D1D5DB",
      }}
    >
      <Check className="h-3.5 w-3.5" /> Yes
    </span>
  ) : (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{
        backgroundColor: "#E8F2EB",
        color: "#618975",
        border: "1px solid #D1D5DB",
      }}
    >
      <X className="h-3.5 w-3.5" /> No
    </span>
  );
}

function formatPrice(property?: Property) {
  if (!property) return "-";
  const currency = property.currency || "NPR";
  const price = Number(property.price) || 0;
  return `${currency} ${price.toLocaleString()}`;
}

function formatLocation(property?: Property) {
  if (!property) return "-";
  return property.address || property.location || "-";
}

function getListingType(property?: Property) {
  return String((property as any)?.listingType || "-");
}

function getPropertyType(property?: Property) {
  return String((property as any)?.propertyType || "-");
}

function getMessageHref(propertyId: string, leadId?: string) {
  return leadId ? `/buyer/messages/${leadId}` : `/buyer/property/${propertyId}`;
}

type ToastState = { show: boolean; text: string };

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
      className="rounded-[28px] border p-10 text-center shadow-sm"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(248,251,249,1) 100%)",
        borderColor: THEME.primaryBorder,
      }}
    >
      <div
        className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-[20px] border"
        style={{
          backgroundColor: THEME.primarySoft,
          borderColor: THEME.primaryBorder,
        }}
      >
        <Scale className="h-7 w-7" style={{ color: THEME.primary }} />
      </div>

      <h2 className="text-2xl font-bold tracking-tight" style={{ color: THEME.text }}>
        No properties to compare
      </h2>

      <p className="mx-auto mt-3 max-w-xl text-base leading-7" style={{ color: THEME.textSoft }}>
        Add properties from search results, the dashboard, or the listing detail page to build a
        side-by-side shortlist.
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

export default function BuyerComparePage() {
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [leadIdsByProperty, setLeadIdsByProperty] = useState<Record<string, string>>({});
  const [showDifferencesOnly, setShowDifferencesOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<ToastState>({ show: false, text: "" });

  const toastTimer = useRef<number | null>(null);
  const wishlistSet = useMemo(() => new Set(wishlistIds), [wishlistIds]);

  function showToast(text: string) {
    setToast({ show: true, text });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => {
      setToast((current) => ({ ...current, show: false }));
    }, 1400);
  }

  async function refresh(showRefreshToast = true) {
    setLoading(true);
    setError("");

    try {
      const nextCompareIds = readCompareIds();
      setCompareIds(nextCompareIds);

      const cachedWishlist = readFreshBuyerCache<WishlistResponse>(BUYER_CACHE_KEYS.wishlist);
      const cachedLeads = readFreshBuyerCache<InquiryResponse>(BUYER_CACHE_KEYS.leads);
      if (cachedWishlist && cachedLeads && !showRefreshToast) {
        const nextWishlistIds = (cachedWishlist.items || [])
          .map((item) =>
            typeof item.propertyId === "string" ? item.propertyId : item.propertyId?._id
          )
          .filter((id): id is string => Boolean(id));
        setWishlistIds(nextWishlistIds);
        const leadMap = (cachedLeads.items || []).reduce<Record<string, string>>((acc, lead) => {
          const propertyId =
            typeof lead.propertyId === "string" ? lead.propertyId : lead.propertyId?._id;
          if (propertyId && !acc[propertyId]) acc[propertyId] = lead._id;
          return acc;
        }, {});
        setLeadIdsByProperty(leadMap);
        setLoading(false);
        return;
      }

      const [wishlistResponse, inquiryResponse] = await Promise.all([
        (cachedWishlist ? Promise.resolve(cachedWishlist) : apiFetch<WishlistResponse>("/wishlist")).catch(() => ({ items: [] })),
        (cachedLeads ? Promise.resolve(cachedLeads) : apiFetch<InquiryResponse>("/leads/my-inquiries")).catch(() => ({ success: false, items: [] })),
      ]);
      writeBuyerCache(BUYER_CACHE_KEYS.wishlist, wishlistResponse);
      writeBuyerCache(BUYER_CACHE_KEYS.leads, inquiryResponse);

      const nextWishlistIds = (wishlistResponse.items || [])
        .map((item) =>
          typeof item.propertyId === "string" ? item.propertyId : item.propertyId?._id
        )
        .filter((id): id is string => Boolean(id));
      setWishlistIds(nextWishlistIds);

      const leadMap = (inquiryResponse.items || []).reduce<Record<string, string>>((acc, lead) => {
        const propertyId =
          typeof lead.propertyId === "string" ? lead.propertyId : lead.propertyId?._id;
        if (propertyId && !acc[propertyId]) acc[propertyId] = lead._id;
        return acc;
      }, {});
      setLeadIdsByProperty(leadMap);

      if (!nextCompareIds.length) {
        setProperties([]);
        if (showRefreshToast) showToast("Comparison refreshed");
        return;
      }

      const response = await apiFetch<PropertyListResponse>(
        `/properties?ids=${nextCompareIds.join(",")}`
      );
      setProperties(response.items || []);

      if (showRefreshToast) showToast("Comparison refreshed");
    } catch (err) {
      console.error(err);
      setError("Failed to load compare data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh(false);

    const handleStorage = (event: StorageEvent) => {
      if (event.key === COMPARE_KEY || event.key === LEGACY_COMPARE_KEY) {
        refresh(false);
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const compareItems = useMemo(() => {
    const propertyMap = new Map(properties.map((property) => [property._id, property]));
    return compareIds.map((id) => propertyMap.get(id)).filter(Boolean) as Property[];
  }, [properties, compareIds]);

  const left = compareItems[0];
  const right = compareItems[1];

  function updateCompare(nextIds: string[], toastText?: string) {
    setCompareIds(nextIds);
    writeCompareIds(nextIds);
    if (toastText) showToast(toastText);
  }

  function removeFromCompare(id: string) {
    updateCompare(
      compareIds.filter((currentId) => currentId !== id),
      "Removed from compare"
    );
  }

  function clearCompare() {
    updateCompare([], "Compare cleared");
  }

  async function addToWishlist(id: string) {
    if (wishlistSet.has(id)) {
      showToast("Already saved");
      return;
    }

    try {
      await apiFetch("/wishlist", {
        method: "POST",
        body: JSON.stringify({ propertyId: id }),
      });
      setWishlistIds((current) => [id, ...current]);
      addWishlistIdToCache(id);
      showToast("Saved to wishlist");
    } catch (err) {
      console.error(err);
      showToast("Failed to save");
    }
  }

  async function saveAllToWishlist() {
    const pendingIds = compareItems
      .map((property) => property._id)
      .filter((id) => !wishlistSet.has(id));

    if (!pendingIds.length) {
      showToast("Compared properties already saved");
      return;
    }

    try {
      await Promise.all(
        pendingIds.map((propertyId) =>
          apiFetch("/wishlist", {
            method: "POST",
            body: JSON.stringify({ propertyId }),
          })
        )
      );
      setWishlistIds((current) => {
        const next = [...pendingIds, ...current];
        writeWishlistIdsToCache(Array.from(new Set(next)));
        return next;
      });
      showToast("Compared properties saved");
    } catch (err) {
      console.error(err);
      showToast("Failed to save all");
    }
  }

  const rows = useMemo<CompareRow[]>(() => {
    const nextRows: CompareRow[] = [
      {
        label: "Price",
        left: formatPrice(left),
        right: formatPrice(right),
        different: !sameValue(left?.price, right?.price) || !sameValue(left?.currency, right?.currency),
      },
      {
        label: "Listing Type",
        left: getListingType(left),
        right: getListingType(right),
        different: !sameValue(getListingType(left), getListingType(right)),
      },
      {
        label: "Property Type",
        left: getPropertyType(left),
        right: getPropertyType(right),
        different: !sameValue(getPropertyType(left), getPropertyType(right)),
      },
      {
        label: "Location",
        left: formatLocation(left),
        right: formatLocation(right),
        different: !sameValue(formatLocation(left), formatLocation(right)),
      },
      {
        label: "Beds",
        left: left?.beds ?? "-",
        right: right?.beds ?? "-",
        different: !sameValue(left?.beds, right?.beds),
      },
      {
        label: "Baths",
        left: left?.baths ?? "-",
        right: right?.baths ?? "-",
        different: !sameValue(left?.baths, right?.baths),
      },
      {
        label: "Sqft",
        left: left?.sqft ?? "-",
        right: right?.sqft ?? "-",
        different: !sameValue(left?.sqft, right?.sqft),
      },
      {
        label: "Offer Active",
        left: yesNo(!!left?.offerActive),
        right: yesNo(!!right?.offerActive),
        different: !sameValue(!!left?.offerActive, !!right?.offerActive),
      },
      {
        label: "Has Images",
        left: yesNo(!!left?.images?.length),
        right: yesNo(!!right?.images?.length),
        different: !sameValue(!!left?.images?.length, !!right?.images?.length),
      },
    ];

    return showDifferencesOnly ? nextRows.filter((row) => row.different) : nextRows;
  }, [left, right, showDifferencesOnly]);

  const differenceCount = rows.filter((row) => row.different).length;
  const missingCount = MAX_COMPARE - compareItems.length;
  const primaryProperty = compareItems[0];
  const primaryMessageHref = primaryProperty
    ? getMessageHref(primaryProperty._id, leadIdsByProperty[primaryProperty._id])
    : "/buyer/messages";

  return (
    <main
      className="min-h-screen bg-[#F7FCFA] p-3 sm:p-5 lg:p-7"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(49,98,73,0.12), transparent 18%), linear-gradient(180deg, #F7FCFA 0%, #EEF8EB 100%)",
      }}
    >
      <Toast show={toast.show} text={toast.text} />

      <div className="mx-auto max-w-[1450px]">
        <div
          className="overflow-hidden rounded-[30px] border shadow-[0_24px_80px_rgba(15,23,42,0.08)]"
          style={{ backgroundColor: "#E8F2EB", borderColor: "#E5E7EB" }}
        >
          <header className="overflow-hidden rounded-[32px] border border-[#D1D5DB]/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-6 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:px-8 sm:py-7">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="max-w-3xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/90">
                  <Scale className="h-3.5 w-3.5 text-[#13EC80]" />
                  Buyer compare
                </span>
                <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Compare Properties
                </h1>
                <p className="mt-3 text-sm leading-6 text-white/90 sm:text-base">
                  Review your shortlist side by side, save the strongest options, and jump back into
                  inquiry flow when you are ready.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm"
                >
                  <Scale className="h-4 w-4 text-[#13EC80]" />
                  {compareItems.length}/{MAX_COMPARE} selected
                </div>

                <Link
                  href="/buyer/search-properties"
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white transition backdrop-blur-sm hover:bg-white/15"
                >
                  <Search className="h-4 w-4" />
                  Search Properties
                </Link>

                <button
                  type="button"
                  onClick={() => refresh()}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white transition backdrop-blur-sm hover:bg-white/15"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Refresh
                </button>
              </div>
            </div>
          </header>

          <div className="px-4 py-4 sm:px-6 lg:px-8">
            {loading ? (
              <div
                className="rounded-[28px] border p-10 shadow-sm"
                style={{ backgroundColor: "#fff", borderColor: THEME.primaryBorder }}
              >
                <div className="flex flex-col items-center justify-center text-center">
                  <div
                    className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border"
                    style={{
                      backgroundColor: THEME.primarySoft,
                      borderColor: THEME.primaryBorder,
                    }}
                  >
                    <RefreshCcw className="h-5 w-5 animate-spin" style={{ color: THEME.primary }} />
                  </div>
                  <div className="text-lg font-semibold tracking-tight" style={{ color: THEME.text }}>
                    Loading compare data
                  </div>
                  <p className="mt-2 text-sm leading-6" style={{ color: THEME.textSoft }}>
                    Pulling your selected properties, wishlist state, and inquiry links.
                  </p>
                </div>
              </div>
            ) : error ? (
              <div
                className="rounded-[28px] border p-10 text-center shadow-sm"
                style={{ backgroundColor: "#fff", borderColor: "#fecaca" }}
              >
                <div className="text-lg font-semibold tracking-tight text-rose-700">{error}</div>
                <p className="mt-2 text-sm leading-6" style={{ color: THEME.textSoft }}>
                  Try refreshing the page to reload the comparison workspace.
                </p>
                <button
                  type="button"
                  onClick={() => refresh()}
                  className="mt-6 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white"
                  style={{ backgroundColor: THEME.primary }}
                >
                  Refresh <RefreshCcw className="h-4 w-4" />
                </button>
              </div>
            ) : compareItems.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
                <aside
                  className="h-fit rounded-[26px] border p-4 shadow-sm"
                  style={{ backgroundColor: "#ffffff", borderColor: THEME.primaryBorder }}
                >
                  <div
                    className="rounded-2xl border p-4"
                    style={{ backgroundColor: THEME.primarySoft, borderColor: THEME.primaryBorder }}
                  >
                    <div className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: THEME.primaryDark }}>
                      Comparison status
                    </div>
                    <div className="mt-3 text-3xl font-semibold tracking-tight" style={{ color: THEME.text }}>
                      {compareItems.length}/{MAX_COMPARE}
                    </div>
                    <p className="mt-2 text-sm leading-7" style={{ color: THEME.textSoft }}>
                      {missingCount === 0
                        ? `Comparison ready with ${differenceCount} highlighted differences.`
                        : `Add ${missingCount} more ${missingCount === 1 ? "property" : "properties"} to complete the side-by-side view.`}
                    </p>
                  </div>

                  <div className="mt-4 space-y-3">
                    <button
                      type="button"
                      onClick={() => setShowDifferencesOnly((current) => !current)}
                      className="flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition"
                      style={{
                        backgroundColor: showDifferencesOnly ? THEME.primarySoft : "#ffffff",
                        borderColor: showDifferencesOnly ? THEME.primaryBorder : THEME.border,
                        color: THEME.text,
                      }}
                    >
                      <span>Show Differences Only</span>
                      <span
                        className="inline-flex rounded-full px-2.5 py-1 text-xs"
                        style={{
                          backgroundColor: showDifferencesOnly ? THEME.primary : "#E8F2EB",
                          color: showDifferencesOnly ? "#ffffff" : THEME.textSoft,
                        }}
                      >
                        {showDifferencesOnly ? "On" : "Off"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={saveAllToWishlist}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition"
                      style={{
                        backgroundColor: "#ffffff",
                        borderColor: THEME.border,
                        color: THEME.text,
                      }}
                    >
                      <Heart className="h-4 w-4" />
                      Save Compared
                    </button>

                    <button
                      type="button"
                      onClick={clearCompare}
                      disabled={compareItems.length === 0}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition disabled:opacity-60"
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

                  <div
                    className="mt-4 rounded-2xl border p-4 text-sm leading-7"
                    style={{ backgroundColor: "#F7FCFA", borderColor: "#E5E7EB", color: THEME.textSoft }}
                  >
                    Compare flow is synced with buyer search, dashboard cards, and listing details.
                    Removing or adding a property here updates the shared compare state.
                  </div>
                </aside>

                <section className="min-w-0">
                  {compareItems.length === 1 ? (
                    <div
                      className="mb-5 rounded-[24px] border p-5 shadow-sm"
                      style={{ backgroundColor: "#ffffff", borderColor: THEME.primaryBorder }}
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div
                            className="inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]"
                            style={{ backgroundColor: THEME.primarySoft, color: THEME.primaryDark }}
                          >
                            1 of {MAX_COMPARE} selected
                          </div>
                          <h2 className="mt-3 text-2xl font-bold tracking-tight" style={{ color: THEME.text }}>
                            Add one more property to unlock the full comparison table
                          </h2>
                          <p className="mt-2 text-sm leading-6" style={{ color: THEME.textSoft }}>
                            The page is already synced. Pick one more listing and it will appear here
                            automatically.
                          </p>
                        </div>

                        <Link
                          href="/buyer/search-properties"
                          className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white"
                          style={{ backgroundColor: THEME.primary }}
                        >
                          Add Another Property <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-4 md:grid-cols-2">
                    {[left, right].map((property, index) =>
                      property ? (
                        <ComparePropertyPanel
                          key={property._id}
                          property={property}
                          saved={wishlistSet.has(property._id)}
                          messageHref={getMessageHref(property._id, leadIdsByProperty[property._id])}
                          onSave={() => addToWishlist(property._id)}
                          onRemove={() => removeFromCompare(property._id)}
                        />
                      ) : (
                        <Link
                          key={`empty-slot-${index}`}
                          href="/buyer/search-properties"
                          className="flex min-h-[540px] flex-col items-center justify-center rounded-[28px] border border-dashed bg-white p-8 text-center shadow-sm transition"
                          style={{ borderColor: "#D1D5DB", color: THEME.textSoft }}
                        >
                          <div className="text-6xl leading-none">+</div>
                          <div className="mt-4 text-2xl font-semibold tracking-tight" style={{ color: THEME.text }}>
                            Add another property
                          </div>
                          <p className="mt-3 max-w-xs text-sm leading-7" style={{ color: THEME.textSoft }}>
                            Select another listing from search results to complete your comparison.
                          </p>
                        </Link>
                      )
                    )}
                  </div>

                  <div
                    className="mt-6 overflow-hidden rounded-[28px] border bg-white shadow-sm"
                    style={{ borderColor: THEME.primaryBorder }}
                  >
                    <div className="border-b px-5 py-4" style={{ borderColor: "#E5E7EB" }}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h2 className="text-lg font-bold" style={{ color: THEME.text }}>
                            Comparison details
                          </h2>
                          <p className="mt-1 text-sm leading-6" style={{ color: THEME.textSoft }}>
                            {showDifferencesOnly
                              ? "Showing only rows where the selected properties differ."
                              : "Showing the full side-by-side breakdown."}
                          </p>
                        </div>

                        <div
                          className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em]"
                          style={{
                            borderColor: THEME.primaryBorder,
                            backgroundColor: THEME.primarySoft,
                            color: THEME.primaryDark,
                          }}
                        >
                          {differenceCount} differences
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full border-separate border-spacing-0 text-sm">
                        <tbody>
                          {rows.map((row, index) => (
                            <tr
                              key={row.label}
                              style={{ backgroundColor: index % 2 === 0 ? "#ffffff" : "#F7FCFA" }}
                            >
                              <td
                                className="w-[220px] border-b px-5 py-4 text-sm font-medium"
                                style={{ borderColor: "#E5E7EB", color: THEME.textSoft }}
                              >
                                {row.label}
                              </td>
                              <td
                                className="w-1/2 border-b px-5 py-4 text-sm font-semibold"
                                style={{ borderColor: "#E5E7EB", color: THEME.text }}
                              >
                                {row.left}
                              </td>
                              <td
                                className="w-1/2 border-b px-5 py-4 text-sm font-semibold"
                                style={{ borderColor: "#E5E7EB", color: THEME.text }}
                              >
                                {row.right}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div
                      className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                      style={{
                        borderColor: "#E5E7EB",
                        background:
                          "linear-gradient(180deg, rgba(250,251,252,1) 0%, rgba(255,255,255,1) 100%)",
                      }}
                    >
                      <div className="text-sm leading-7" style={{ color: THEME.textSoft }}>
                        Use compare to shortlist options, then move into wishlist or the inquiry
                        thread for the property you want to pursue.
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={saveAllToWishlist}
                          className="inline-flex items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold transition"
                          style={{
                            borderColor: "#e5e7eb",
                            backgroundColor: "#fff",
                            color: THEME.text,
                          }}
                        >
                          Save for Later
                        </button>

                        <Link
                          href="/buyer/wishlist"
                          className="inline-flex items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold transition"
                          style={{
                            borderColor: "#e5e7eb",
                            backgroundColor: "#fff",
                            color: THEME.text,
                          }}
                        >
                          Open Wishlist
                        </Link>

                        <Link
                          href={primaryMessageHref}
                          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition"
                          style={{ backgroundColor: THEME.primary }}
                        >
                          <MessageCircle className="h-4 w-4" />
                          {primaryProperty && leadIdsByProperty[primaryProperty._id]
                            ? "Continue Inquiry"
                            : "Contact Seller"}
                        </Link>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
