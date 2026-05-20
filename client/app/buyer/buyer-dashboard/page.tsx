"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import { Bell, CalendarDays, Eye, Heart, Search } from "lucide-react";
import { Sparkles } from "lucide-react";

import { apiFetch } from "../../lib/api";
import { typography } from "../../lib/typography";
import type { Property } from "../../lib/property.types";
import { useBuyerAuth } from "@/app/buyer/BuyerAuthContext";
import {
  BUYER_CACHE_KEYS,
  readFreshBuyerCache,
  writeBuyerCache,
} from "@/app/buyer/prefetchCache";
import {
  AlertsCard,
  BudgetOverviewCard,
  EmptyState,
  MessagesCard,
  OverviewCard,
  PageSearchBar,
  RecentSearchesCard,
  SectionHeading,
  Toast,
  UpcomingVisitsCard,
  firstName,
} from "./dashboard-ui";
import PropertyCard from "@/components/property/PropertyCard";


type ListResponse = {
  success: boolean;
  items: Property[];
};

type ToastState = { show: boolean; text: string };
type DashboardMessageItem = { sender: string; body: string; time: string };

const BRAND = "#316249";
const PAGE_BG =
  "min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(49,98,73,0.10),transparent_26%),radial-gradient(circle_at_top_right,rgba(49,98,73,0.06),transparent_22%),linear-gradient(180deg,#F7FCFA_0%,#EEF8EB_100%)] p-4 sm:p-6";
const COMPARE_KEY = "property-sewa:compare:v1";
const MAX_COMPARE = 2;

const pageEnter: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  },
};

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

function dedupeProperties(items: Property[]) {
  const seen = new Set<string>();
  const result: Property[] = [];
  for (const property of items) {
    const fallbackKey = `${String(property.title || "").trim().toLowerCase()}|${Number(property.price || 0)}|${String(
      property.location || property.address || ""
    )
      .trim()
      .toLowerCase()}`;
    const key = property._id || fallbackKey;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(property);
  }
  return result;
}

export default function BuyerDashboardPage() {
  const { user } = useBuyerAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [offerProperties, setOfferProperties] = useState<Property[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [messageItems, setMessageItems] = useState<DashboardMessageItem[]>([]);
  const [searchText, setSearchText] = useState("");
  const [toast, setToast] = useState<ToastState>({ show: false, text: "" });
  const [wishPopIds, setWishPopIds] = useState<Record<string, boolean>>({});
  const [comparePopIds, setComparePopIds] = useState<Record<string, boolean>>({});
  const toastTimer = useRef<number | null>(null);
  const userName = user?.name?.trim() || "Buyer";

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    setCompareIds(readIds(COMPARE_KEY));

    (async () => {
      const cachedWishlist = readFreshBuyerCache<{ items: Array<{ propertyId?: string | { _id?: string } }> }>(
        BUYER_CACHE_KEYS.wishlist
      );
      const cachedProperties = readFreshBuyerCache<ListResponse>(BUYER_CACHE_KEYS.propertiesDashboard);
      const cachedOffers = readFreshBuyerCache<ListResponse>(BUYER_CACHE_KEYS.offersDashboard);
      if (cachedWishlist?.items) {
        const ids = (cachedWishlist.items || [])
          .map((item) =>
            typeof item.propertyId === "string" ? item.propertyId : item.propertyId?._id
          )
          .filter((id): id is string => Boolean(id));
        setWishlistIds(ids);
      }
      if (cachedProperties?.items) setProperties(cachedProperties.items || []);
      if (cachedOffers?.items) setOfferProperties(cachedOffers.items || []);

      const hasFreshCoreCache = !!(cachedWishlist && cachedProperties && cachedOffers);
      if (hasFreshCoreCache) return;

      const [wishlistResult, propertiesResult, offersResult] = await Promise.allSettled([
        apiFetch<{ items: Array<{ propertyId?: string | { _id?: string } }> }>("/wishlist", {
          signal: controller.signal,
        }),
        apiFetch<ListResponse>("/properties?limit=12&sort=latest&dashboard=true", {
          signal: controller.signal,
        }),
        apiFetch<ListResponse>("/properties?limit=6&sort=latest&offersOnly=true&dashboard=true", {
          signal: controller.signal,
        }),
      ]);

      if (cancelled) {
        return;
      }

      if (wishlistResult.status === "fulfilled") {
        writeBuyerCache(BUYER_CACHE_KEYS.wishlist, wishlistResult.value);
        const ids = (wishlistResult.value.items || [])
          .map((item) =>
            typeof item.propertyId === "string" ? item.propertyId : item.propertyId?._id
          )
          .filter((id): id is string => Boolean(id));
        setWishlistIds(ids);
      } else {
        setWishlistIds([]);
      }

      if (propertiesResult.status === "fulfilled") {
        writeBuyerCache(BUYER_CACHE_KEYS.propertiesDashboard, propertiesResult.value);
        setProperties(propertiesResult.value.items || []);
      } else {
        console.error(propertiesResult.reason);
        setProperties([]);
      }

      if (offersResult.status === "fulfilled") {
        writeBuyerCache(BUYER_CACHE_KEYS.offersDashboard, offersResult.value);
        setOfferProperties(offersResult.value.items || []);
      } else {
        console.error(offersResult.reason);
        setOfferProperties([]);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    function formatMessageTime(value?: string | Date | null) {
      if (!value) return "";
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return "";
      return new Intl.DateTimeFormat("en-NP", {
        month: "short",
        day: "2-digit",
      }).format(date);
    }

    (async () => {
      const cachedLeads = readFreshBuyerCache<{ items?: Array<{ _id?: string }> }>(
        BUYER_CACHE_KEYS.leads
      );
      const leads = cachedLeads
        ? cachedLeads
        : await apiFetch<{ items?: Array<{ _id?: string }> }>("/leads/my-inquiries", {
            signal: controller.signal,
          }).catch(() => null);
      if (leads) writeBuyerCache(BUYER_CACHE_KEYS.leads, leads);
      if (cachedLeads?.items?.length) return;

      if (cancelled) return;

      const leadIds =
        leads?.items
          ?.map((lead) => lead._id)
          .filter((id): id is string => typeof id === "string" && id.length > 0) || [];

      if (!leadIds.length) {
        setMessageItems([]);
        return;
      }

      const topLeadIds = leadIds.slice(0, 3);
      const results = await Promise.allSettled(
        topLeadIds.map((leadId) =>
          apiFetch<{ items?: Array<any> }>(`/messages/${leadId}`, { signal: controller.signal })
        )
      );

      if (cancelled) return;

      const nextItems: DashboardMessageItem[] = results
        .map((result) => {
          if (result.status !== "fulfilled") return null;
          const messages = result.value.items || [];
          if (!messages.length) return null;
          const last = messages[messages.length - 1];
          const senderName =
            last?.senderId?.name ||
            (last?.senderRole === "seller" ? "Seller" : last?.senderRole === "buyer" ? "You" : "Message");
          const body = String(last?.text || "").trim();
          if (!body) return null;
          return {
            sender: senderName,
            body,
            time: formatMessageTime(last?.createdAt) || "",
          };
        })
        .filter((item): item is DashboardMessageItem => Boolean(item));

      setMessageItems(nextItems);
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        window.clearTimeout(toastTimer.current);
      }
    };
  }, []);

  const wishlistSet = useMemo(() => new Set(wishlistIds), [wishlistIds]);
  const compareSet = useMemo(() => new Set(compareIds), [compareIds]);

  function showToast(text: string) {
    setToast({ show: true, text });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => {
      setToast((current) => ({ ...current, show: false }));
    }, 1400);
  }

  function pop(
    id: string,
    setMap: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  ) {
    setMap((state) => ({ ...state, [id]: true }));
    window.setTimeout(() => {
      setMap((state) => {
        const next = { ...state };
        delete next[id];
        return next;
      });
    }, 240);
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
      pop(id, setWishPopIds);
    } catch (error) {
      console.error(error);
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

  const recommendedListings = useMemo(() => {
    const source = offerProperties.length ? offerProperties : properties;
    return dedupeProperties(source).slice(0, 4);
  }, [offerProperties, properties]);

  const savedProperties = useMemo(
    () => properties.filter((property) => wishlistSet.has(property._id)).slice(0, 6),
    [properties, wishlistSet]
  );

  const upcomingVisitListings = useMemo(
    () => (savedProperties.length ? savedProperties : recommendedListings).slice(0, 3),
    [recommendedListings, savedProperties]
  );

  const recentSearches = useMemo(() => {
    const queries = properties
      .flatMap((property) => [
        property.location ? `${property.location} homes` : null,
        property.title ? `${property.title.split(" ")[0]} listings` : null,
      ])
      .filter((item): item is string => Boolean(item));

    return Array.from(new Set(queries)).slice(0, 4);
  }, [properties]);

  const marketListings = useMemo(
    () => dedupeProperties(offerProperties.length ? offerProperties : properties).slice(0, 5),
    [offerProperties, properties]
  );

  const marketStats = useMemo(() => {
    const valid = marketListings.filter((property) => property.price && property.sqft);
    const avgPsf = valid.length
      ? valid.reduce((sum, property) => sum + property.price / property.sqft, 0) / valid.length
      : 0;
    const highest = valid.reduce((max, property) => Math.max(max, property.price), 0);
    const lowest =
      valid.reduce(
        (min, property) => (property.price ? Math.min(min, property.price) : min),
        Number.POSITIVE_INFINITY
      ) || 0;
    const trend =
      highest && lowest !== Number.POSITIVE_INFINITY ? ((highest - lowest) / highest) * 100 : 0;

    return {
      avgPsf,
      trend,
      totalTracked: valid.length,
    };
  }, [marketListings]);

  const summaryValue = useMemo(() => {
    const portfolio = [...savedProperties, ...recommendedListings];
    const total = portfolio.reduce((sum, property) => sum + (Number(property.price) || 0), 0);
    const average = portfolio.length ? total / portfolio.length : 0;
    return { total, average, count: portfolio.length };
  }, [recommendedListings, savedProperties]);

  const budgetOverview = useMemo(() => {
    const current = summaryValue.average || summaryValue.total || 0;
    const target = current ? current * 1.25 : 1;
    const percent = Math.max(8, Math.min(92, Math.round((current / target) * 100)));
    return { current, target, percent };
  }, [summaryValue]);

  const heroSummary = `Find your next dream property from ${properties.length || 0} active listings and ${offerProperties.length || 0} curated offer matches.`;

  return (
    <motion.main initial="hidden" animate="show" variants={pageEnter} className={`min-w-0 ${PAGE_BG}`}>
      <Toast show={toast.show} text={toast.text} />

      <div className="mx-auto max-w-7xl rounded-[28px] border border-[#E5E7EB] bg-white/70 px-4 py-4 shadow-[0_20px_50px_rgba(13,28,18,0.06)] backdrop-blur-[1px] sm:px-6 lg:px-8 lg:py-7">
        <PageSearchBar
          searchText={searchText}
          setSearchText={setSearchText}
          userName={userName}
          wishlistCount={wishlistIds.length}
        />

        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-10">
            <section className="overflow-hidden rounded-[32px] border border-[#D1D5DB]/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-6 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:px-8 sm:py-7">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-3xl">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/90">
                    <Sparkles className="h-3.5 w-3.5" />
                    Buyer Control Center
                  </span>
                  <h1 className={`mt-4 ${typography.pageTitle} text-white`}>
                    Good morning, {firstName(userName)}!
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
                    {heroSummary}
                  </p>
                </div>

                <Link prefetch={true} href="/buyer/search-properties" className={`inline-flex h-12 items-center gap-3 self-start rounded-xl border border-white/15 bg-white/10 px-6 text-sm font-semibold text-white transition hover:bg-white/15`}>
                  <Search className="h-4 w-4" />
                  Search Properties
                </Link>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <OverviewCard
                icon={<Heart className="h-5 w-5 text-[#316249]" />}
                label="Saved Homes"
                value={wishlistIds.length}
                meta="View all"
                accent="#e8f5ef"
              />
              <OverviewCard
                icon={<Eye className="h-5 w-5 text-[#316249]" />}
                label="Recent Views"
                value={properties.length}
                meta="This week"
                accent="#edf3ff"
              />
              <OverviewCard
                icon={<CalendarDays className="h-5 w-5 text-[#316249]" />}
                label="Upcoming Visits"
                value={upcomingVisitListings.length}
                meta="Next 7 days"
                accent="#eaf6f2"
              />
              <OverviewCard
                icon={<Bell className="h-5 w-5 text-[#13EC80]" />}
                label="Price Alerts"
                value={offerProperties.length}
                meta="Active alerts"
                accent="#fff4dc"
              />
            </section>

            <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-6 shadow-[0_10px_24px_rgba(13,28,18,0.05)] sm:p-7">
              <SectionHeading
                title="Recommended for You"
                actionHref="/buyer/search-properties"
                actionText="See all"
              />

              <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                {recommendedListings.length ? (
                  recommendedListings.map((property) => (
                    <PropertyCard
                      key={property._id}
                      property={property}
                      variant="compact"
                      saved={wishlistSet.has(property._id)}
                      compareOn={compareSet.has(property._id)}
                      heartPop={!!wishPopIds[property._id]}
                      comparePop={!!comparePopIds[property._id]}
                      onToggleWishlist={toggleWishlist}
                      onToggleCompare={() => toggleCompare(property._id)}
                      isOfferActive={() => false}
                    />
                  ))
                ) : (
                  <EmptyState message="Recommended listings will appear here when properties load." />
                )}
              </div>
            </section>

            <div className="grid gap-6">
              <section className="rounded-[24px] border border-[#E5E7EB] bg-white p-6 shadow-[0_10px_24px_rgba(13,28,18,0.05)] sm:p-7">
                <SectionHeading
                  title="Saved Properties"
                  actionHref="/buyer/wishlist"
                  actionText="See all"
                />

                <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                  {savedProperties.length ? (
                    savedProperties.map((property) => (
                      <PropertyCard
                        key={property._id}
                        property={property}
                        variant="compact"
                        saved={wishlistSet.has(property._id)}
                        compareOn={compareSet.has(property._id)}
                        heartPop={!!wishPopIds[property._id]}
                        comparePop={!!comparePopIds[property._id]}
                        onToggleWishlist={toggleWishlist}
                        onToggleCompare={() => toggleCompare(property._id)}
                        isOfferActive={() => false}
                      />
                    ))
                  ) : (
                    <EmptyState message="No saved homes yet. Save properties to keep them here for quick access." />
                  )}
                </div>
              </section>
            </div>

            <UpcomingVisitsCard items={upcomingVisitListings} />
          </div>

          <aside className="space-y-6">
            <RecentSearchesCard searches={recentSearches} />
            <AlertsCard
              alerts={[
                `${offerProperties.length} listings currently match your alert criteria.`,
                `${compareIds.length} properties pinned for compare.`,
                `${marketStats.totalTracked} listings analyzed for buyer insights.`,
              ]}
            />
            <MessagesCard items={messageItems} />
            <BudgetOverviewCard budget={budgetOverview} />
          </aside>
        </div>
      </div>
    </motion.main>
  );
}
