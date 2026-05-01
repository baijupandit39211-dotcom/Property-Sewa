"use client";

import dynamic from "next/dynamic";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import { Bell, CalendarDays, Eye, Heart, Search } from "lucide-react";

import { apiFetch } from "../../lib/api";
import { typography } from "../../lib/typography";
import type { Property } from "../../lib/property.types";
import { useBuyerAuth } from "@/app/buyer/BuyerAuthContext";
import {
  BudgetOverviewCard,
  DiscoveryCard,
  EmptyState,
  LiveActivityCard,
  MessagesCard,
  OverviewCard,
  PageSearchBar,
  RecommendationCard,
  RecentSearchesCard,
  SavedPropertyCard,
  SectionHeading,
  Toast,
  UpcomingVisitsCard,
  firstName,
} from "./dashboard-ui";

const ReportAdModal = dynamic(() => import("@/app/property/[id]/_components/ReportAdModal"), {
  ssr: false,
});

type ListResponse = {
  success: boolean;
  items: Property[];
};

type ToastState = { show: boolean; text: string };

const BRAND = "#316249";
const PAGE_BG = "#f3f4f6";
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

export default function BuyerDashboardPage() {
  const { user } = useBuyerAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [offerProperties, setOfferProperties] = useState<Property[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [reportModal, setReportModal] = useState<{ open: boolean; adId: string | null }>({
    open: false,
    adId: null,
  });
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
      const [wishlistResult, propertiesResult, offersResult] = await Promise.allSettled([
        apiFetch<{ items: Array<{ propertyId?: string | { _id?: string } }> }>("/wishlist", {
          signal: controller.signal,
        }),
        apiFetch<ListResponse>("/properties?limit=12&sort=latest", {
          signal: controller.signal,
        }),
        apiFetch<ListResponse>("/properties?limit=6&sort=latest&offersOnly=true", {
          signal: controller.signal,
        }),
      ]);

      if (cancelled) {
        return;
      }

      if (wishlistResult.status === "fulfilled") {
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
        setProperties(propertiesResult.value.items || []);
      } else {
        console.error(propertiesResult.reason);
        setProperties([]);
      }

      if (offersResult.status === "fulfilled") {
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

  const recommendedListings = useMemo(
    () => (offerProperties.length ? offerProperties : properties).slice(0, 4),
    [offerProperties, properties]
  );

  const savedCollection = useMemo(() => {
    const savedMatches = properties.filter((property) => wishlistSet.has(property._id));
    return (savedMatches.length ? savedMatches : properties).slice(0, 4);
  }, [properties, wishlistSet]);

  const upcomingVisitListings = useMemo(
    () => (savedCollection.length ? savedCollection : recommendedListings).slice(0, 3),
    [recommendedListings, savedCollection]
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
    () => (offerProperties.length ? offerProperties : properties).slice(0, 5),
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
    const portfolio = [...savedCollection, ...recommendedListings];
    const total = portfolio.reduce((sum, property) => sum + (Number(property.price) || 0), 0);
    const average = portfolio.length ? total / portfolio.length : 0;
    return { total, average, count: portfolio.length };
  }, [recommendedListings, savedCollection]);

  const budgetOverview = useMemo(() => {
    const current = summaryValue.average || summaryValue.total || 0;
    const target = current ? current * 1.25 : 1;
    const percent = Math.max(8, Math.min(92, Math.round((current / target) * 100)));
    return { current, target, percent };
  }, [summaryValue]);

  const messageItems = useMemo(
    () => [
      {
        sender: "Aarav Shrestha",
        body: `${savedCollection[0]?.title || "A saved property"} is ready for review.`,
        time: "10:24 AM",
      },
      {
        sender: "Real Estate Agent",
        body: `${recommendedListings[0]?.location || "A new listing"} has a fresh update.`,
        time: "Yesterday",
      },
      {
        sender: "Property Sewa Team",
        body: `${wishlistIds.length} saved homes are synced to your dashboard.`,
        time: "2 days ago",
      },
    ],
    [recommendedListings, savedCollection, wishlistIds.length]
  );

  const heroSummary = `Find your next dream property from ${properties.length || 0} active listings and ${offerProperties.length || 0} curated offer matches.`;

  const handleOpenReport = (input: { adId?: string | null }) => {
    setReportModal({ open: true, adId: input.adId || null });
  };

  return (
    <motion.main initial="hidden" animate="show" variants={pageEnter} className="min-w-0">
      <ReportAdModal
        adId={reportModal.adId}
        open={reportModal.open}
        onClose={() => setReportModal({ open: false, adId: null })}
      />
      <Toast show={toast.show} text={toast.text} />

      <div
        className="rounded-[32px] border border-[#e7e5df] px-4 py-4 shadow-[0_24px_70px_rgba(15,23,42,0.06)] sm:px-6 lg:px-8 lg:py-7"
        style={{ backgroundColor: PAGE_BG }}
      >
        <PageSearchBar
          searchText={searchText}
          setSearchText={setSearchText}
          userName={userName}
          wishlistCount={wishlistIds.length}
        />

        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_292px]">
          <div className="space-y-8">
            <section className="rounded-[30px] border border-white/80 bg-white/90 px-6 py-6 shadow-[0_14px_35px_rgba(15,23,42,0.04)] sm:px-8">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                <div className="max-w-3xl">
                  <p className={typography.pageEyebrow}>
                    Buyer Dashboard
                  </p>
                  <h1 className={`mt-3 ${typography.pageTitle}`}>
                    Good morning, {firstName(userName)}!
                  </h1>
                  <p className={`mt-3 max-w-2xl ${typography.pageSubtitle}`}>
                    {heroSummary}
                  </p>
                </div>

                <Link
                  href={searchText.trim() ? `/buyer/search-properties?q=${encodeURIComponent(searchText.trim())}` : "/buyer/search-properties"}
                  className={`inline-flex h-12 items-center gap-3 rounded-2xl bg-[#316249] px-6 text-white shadow-[0_12px_30px_rgba(49,98,73,0.22)] transition hover:-translate-y-0.5 hover:bg-[#28513D] ${typography.buttonText}`}
                >
                  <Search className="h-4 w-4" />
                  Find Properties
                </Link>
              </div>

              <div className="mt-7 grid gap-4 xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(280px,1fr)]">
                <OverviewCard
                  icon={<Heart className="h-5 w-5 text-[#316249]" />}
                  label="Saved Homes"
                  value={wishlistIds.length}
                  meta="View all"
                  accent="#e8f5ef"
                />
                <OverviewCard
                  icon={<Eye className="h-5 w-5 text-[#2e6fe3]" />}
                  label="Recent Views"
                  value={properties.length}
                  meta="This week"
                  accent="#edf3ff"
                />
                <OverviewCard
                  icon={<CalendarDays className="h-5 w-5 text-[#2b7f6c]" />}
                  label="Upcoming Visits"
                  value={upcomingVisitListings.length}
                  meta="Next 7 days"
                  accent="#eaf6f2"
                />
                <OverviewCard
                  icon={<Bell className="h-5 w-5 text-[#d0a044]" />}
                  label="Price Alerts"
                  value={offerProperties.length}
                  meta="Active alerts"
                  accent="#fff4dc"
                />

                <DiscoveryCard property={recommendedListings[0] || savedCollection[0] || properties[0] || null} />
              </div>
            </section>

            <section className="rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_14px_35px_rgba(15,23,42,0.04)] sm:p-7">
              <SectionHeading
                title="Recommended for You"
                actionHref="/buyer/search-properties"
                actionText="See all"
              />

              <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                {recommendedListings.length ? (
                  recommendedListings.map((property) => (
                    <RecommendationCard
                      key={property._id}
                      property={property}
                      label={property.offerActive ? "For Sale" : "Recommended"}
                      wishSaved={wishlistSet.has(property._id)}
                      wishPop={!!wishPopIds[property._id]}
                      onToggleWish={() => toggleWishlist(property._id)}
                      compareOn={compareSet.has(property._id)}
                      comparePop={!!comparePopIds[property._id]}
                      onToggleCompare={() => toggleCompare(property._id)}
                      onReport={handleOpenReport}
                    />
                  ))
                ) : (
                  <EmptyState message="Recommended listings will appear here when properties load." />
                )}
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_316px]">
              <section className="rounded-[30px] border border-white/80 bg-white/90 p-6 shadow-[0_14px_35px_rgba(15,23,42,0.04)] sm:p-7">
                <SectionHeading
                  title="Saved Properties"
                  actionHref="/buyer/wishlist"
                  actionText="See all"
                />

                <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                  {savedCollection.length ? (
                    savedCollection.map((property) => (
                      <SavedPropertyCard
                        key={property._id}
                        property={property}
                        wishSaved={wishlistSet.has(property._id)}
                        wishPop={!!wishPopIds[property._id]}
                        onToggleWish={() => toggleWishlist(property._id)}
                        compareOn={compareSet.has(property._id)}
                        comparePop={!!comparePopIds[property._id]}
                        onToggleCompare={() => toggleCompare(property._id)}
                        onReport={handleOpenReport}
                      />
                    ))
                  ) : (
                    <EmptyState message="Saved homes will show here once wishlist data is available." />
                  )}
                </div>
              </section>

              <section className="space-y-6">
                <RecentSearchesCard searches={recentSearches} />
                <LiveActivityCard
                  items={[
                    {
                      label: "Wishlist Sync",
                      text: `${wishlistIds.length} saved homes preserved in your shortlist.`,
                    },
                    {
                      label: "Market Scan",
                      text: `${marketStats.totalTracked} listings are contributing to live average PSF.`,
                    },
                    {
                      label: "Compare Ready",
                      text: `${compareIds.length} properties are pinned for side-by-side review.`,
                    },
                  ]}
                />
              </section>
            </div>
          </div>

          <aside className="space-y-6">
            <BudgetOverviewCard budget={budgetOverview} />
            <UpcomingVisitsCard items={upcomingVisitListings} />
            <MessagesCard items={messageItems} />
          </aside>
        </div>
      </div>
    </motion.main>
  );
}
