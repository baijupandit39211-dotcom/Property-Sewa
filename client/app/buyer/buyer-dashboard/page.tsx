"use client";

import dynamic from "next/dynamic";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  Bath,
  Bell,
  BookmarkCheck,
  CalendarDays,
  ChevronRight,
  Clock3,
  Compass,
  Eye,
  Heart,
  Mail,
  MapPin,
  Ruler,
  Scale,
  Search,
  Sparkles,
  TrendingUp,
  UserRound,
} from "lucide-react";

import { apiFetch } from "../../lib/api";
import { typography } from "../../lib/typography";
import type { Property } from "../../lib/property.types";
import AdActionsMenu from "@/app/property/[id]/_components/AdActionsMenu";
import { useBuyerAuth } from "@/app/buyer/BuyerAuthContext";
import OfferBadge from "@/components/offers/OfferBadge";

const ReportAdModal = dynamic(() => import("@/app/property/[id]/_components/ReportAdModal"), {
  ssr: false,
});

type ListResponse = {
  success: boolean;
  items: Property[];
};

type ToastState = { show: boolean; text: string };

const BRAND = "#1f6b58";
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
                  className={`inline-flex h-12 items-center gap-3 rounded-2xl px-6 text-white shadow-[0_12px_30px_rgba(31,107,88,0.22)] transition hover:-translate-y-0.5 ${typography.buttonText}`}
                  style={{ backgroundColor: BRAND }}
                >
                  <Search className="h-4 w-4" />
                  Find Properties
                </Link>
              </div>

              <div className="mt-7 grid gap-4 xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(280px,1fr)]">
                <OverviewCard
                  icon={<Heart className="h-5 w-5 text-[#1f6b58]" />}
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

function PageSearchBar({
  searchText,
  setSearchText,
  userName,
  wishlistCount,
}: {
  searchText: string;
  setSearchText: React.Dispatch<React.SetStateAction<string>>;
  userName: string;
  wishlistCount: number;
}) {
  const searchHref = searchText.trim()
    ? `/buyer/search-properties?q=${encodeURIComponent(searchText.trim())}`
    : "/buyer/search-properties";

  return (
    <div className="rounded-[28px] border border-white/80 bg-white/90 px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.035)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <label className="flex h-14 flex-1 items-center gap-3 rounded-full border border-[#ece8e0] bg-[#fbfaf7] px-5">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search location, city, or property type..."
            className={`w-full bg-transparent outline-none ${typography.inputText}`}
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <TopRoundIcon href="/buyer/notifications" icon={<Bell className="h-4 w-4" />} />
          <TopRoundIcon href="/buyer/wishlist" icon={<Heart className="h-4 w-4" />} />
          <Link
            href={searchHref}
            className={`inline-flex h-11 items-center rounded-full border border-[#d7ddd4] bg-white px-4 text-slate-700 transition hover:-translate-y-0.5 hover:shadow-sm ${typography.buttonText}`}
          >
            Search
          </Link>
          <div className="flex items-center gap-3 rounded-full border border-[#e1e4df] bg-white px-3 py-1.5 shadow-sm">
            <span
              className="grid h-10 w-10 place-items-center rounded-full text-sm font-semibold text-white"
              style={{ backgroundColor: BRAND }}
            >
              {firstName(userName).slice(0, 1).toUpperCase()}
            </span>
            <div className="pr-2">
              <p className={typography.profileName}>{userName}</p>
              <p className={typography.profileMeta}>Buyer</p>
            </div>
          </div>
          <div className={`rounded-full bg-[#eff4f1] px-4 py-2 text-[#0d5c45] ${typography.buttonText}`}>
            {wishlistCount} saved
          </div>
        </div>
      </div>
    </div>
  );
}

function TopRoundIcon({ href, icon }: { href: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="grid h-11 w-11 place-items-center rounded-full border border-[#d9dfd8] bg-white text-slate-600 transition hover:-translate-y-0.5 hover:shadow-sm"
    >
      {icon}
    </Link>
  );
}

function OverviewCard({
  icon,
  label,
  value,
  meta,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  meta: string;
  accent: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.18 }}
      className="rounded-[24px] border border-[#ece8e0] bg-white p-5 shadow-[0_12px_24px_rgba(15,23,42,0.03)]"
    >
      <div
        className="grid h-12 w-12 place-items-center rounded-2xl"
        style={{ backgroundColor: accent }}
      >
        {icon}
      </div>
      <p className={`mt-5 ${typography.cardTitle}`}>{label}</p>
      <div className={`mt-2 ${typography.statValue}`}>
        {value}
      </div>
      <p className={`mt-1 ${typography.helperText}`}>{meta}</p>
    </motion.div>
  );
}

function DiscoveryCard({ property }: { property: Property | null }) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-[#ece8e0] bg-[linear-gradient(135deg,#eef3f1_0%,#f8f7f4_45%,#eef3f1_100%)] p-5 shadow-[0_12px_24px_rgba(15,23,42,0.03)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(31,107,88,0.08),transparent_28%),radial-gradient(circle_at_70%_30%,rgba(31,107,88,0.06),transparent_24%)]" />
      <div className="relative flex h-full items-center justify-between gap-4">
        <div className="max-w-[180px]">
          <p className={typography.pageEyebrow}>
            Market Spotlight
          </p>
          <h3 className={`mt-3 ${typography.sectionTitle}`}>
            {property?.title || "Luxury Buyer Match"}
          </h3>
          <p className={`mt-2 ${typography.pageSubtitle}`}>
            {property?.location || "A curated property snapshot is ready for you."}
          </p>
        </div>

        <div className="relative mx-auto h-[150px] w-[200px] max-w-full rounded-[26px] bg-white/70 p-3 shadow-[0_20px_40px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="absolute -left-3 top-8 h-4 w-4 rounded-full bg-[#1f6b58] shadow-sm" />
          <div className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white text-rose-500 shadow-sm">
            <Heart className="h-4 w-4 fill-rose-500" />
          </div>
          <div className="h-full overflow-hidden rounded-[20px]">
            <img
              src={property?.images?.[0]?.url || fallbackImage({ title: "Luxury Buyer Match", location: "Property Sewa" } as Property)}
              alt={property?.title || "Luxury property"}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  title,
  actionHref,
  actionText,
}: {
  title: string;
  actionHref: string;
  actionText: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className={typography.sectionTitle}>{title}</h2>
      <Link
        href={actionHref}
        className={`inline-flex items-center gap-2 text-[#1f6b58] transition hover:opacity-80 ${typography.buttonText}`}
      >
        {actionText}
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function RecommendationCard({
  property,
  label,
  wishSaved,
  wishPop,
  onToggleWish,
  compareOn,
  comparePop,
  onToggleCompare,
  onReport,
}: {
  property: Property;
  label: string;
  wishSaved: boolean;
  wishPop: boolean;
  onToggleWish: () => void;
  compareOn: boolean;
  comparePop: boolean;
  onToggleCompare: () => void;
  onReport: (input: { adId?: string | null; title?: string; location?: string }) => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.18 }}
      className="overflow-hidden rounded-[24px] border border-[#ece8e0] bg-white shadow-[0_14px_28px_rgba(15,23,42,0.04)]"
    >
      <div className="relative h-[190px] overflow-hidden bg-slate-100">
        <img
          src={property.images?.[0]?.url || fallbackImage(property)}
          alt={property.title}
          className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
        />
        <div className="absolute left-4 top-4 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-900 shadow-sm">
          {label}
        </div>
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleWish();
            }}
            className={[
              "grid h-10 w-10 place-items-center rounded-full bg-white text-slate-700 shadow-sm transition",
              wishPop ? "scale-110" : "",
            ].join(" ")}
          >
            <Heart className={["h-4 w-4", wishSaved ? "fill-rose-500 text-rose-500" : ""].join(" ")} />
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className={typography.statValue}>
          {formatPrice(property)}
        </div>
        <Link href={`/buyer/property/${property._id}`} className="mt-2 block text-sm font-medium text-slate-900">
          {property.title}
        </Link>
        <div className={`mt-2 flex items-center gap-1 ${typography.helperText}`}>
          <MapPin className="h-3.5 w-3.5 text-rose-400" />
          {property.location || property.address}
        </div>
        <div className={`mt-4 flex flex-wrap gap-3 ${typography.helperText}`}>
          <InlineSpec icon={<Compass className="h-3.5 w-3.5" />} text={`${property.beds || 0} Beds`} />
          <InlineSpec icon={<Bath className="h-3.5 w-3.5" />} text={`${property.baths || 0} Baths`} />
          <InlineSpec icon={<Ruler className="h-3.5 w-3.5" />} text={`${numberCompact(property.sqft)} sqft`} />
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onToggleCompare}
            className={[
              `inline-flex h-9 items-center rounded-full px-3 transition ${typography.buttonText}`,
              compareOn ? "bg-slate-900 text-white" : "border border-[#dfe5df] bg-white text-slate-700",
              comparePop ? "scale-105" : "",
            ].join(" ")}
          >
            Compare
          </button>
          <div
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            <AdActionsMenu
              adId={property._id}
              title={property.title}
              location={property.location || property.address}
              variant="icon"
              onReport={onReport}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SavedPropertyCard({
  property,
  wishSaved,
  wishPop,
  onToggleWish,
  compareOn,
  comparePop,
  onToggleCompare,
  onReport,
}: {
  property: Property;
  wishSaved: boolean;
  wishPop: boolean;
  onToggleWish: () => void;
  compareOn: boolean;
  comparePop: boolean;
  onToggleCompare: () => void;
  onReport: (input: { adId?: string | null; title?: string; location?: string }) => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.18 }}
      className="overflow-hidden rounded-[24px] border border-[#ece8e0] bg-white shadow-[0_14px_28px_rgba(15,23,42,0.04)]"
    >
      <div className="relative h-[170px] overflow-hidden bg-slate-100">
        <img
          src={property.images?.[0]?.url || fallbackImage(property)}
          alt={property.title}
          className="h-full w-full object-cover"
        />
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleWish();
          }}
          className={[
            "absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white text-slate-700 shadow-sm transition",
            wishPop ? "scale-110" : "",
          ].join(" ")}
        >
          <Heart className={["h-4 w-4", wishSaved ? "fill-rose-500 text-rose-500" : ""].join(" ")} />
        </button>
      </div>

      <div className="p-4">
        <div className={typography.statValue}>
          {formatPrice(property)}
        </div>
        <Link href={`/buyer/property/${property._id}`} className="mt-2 block text-sm font-medium text-slate-900">
          {property.title}
        </Link>
        <div className={`mt-2 ${typography.pageSubtitle}`}>
          {property.location || property.address}
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onToggleCompare}
            className={[
              `inline-flex h-9 items-center rounded-full px-3 transition ${typography.buttonText}`,
              compareOn ? "bg-slate-900 text-white" : "border border-[#dfe5df] bg-white text-slate-700",
              comparePop ? "scale-105" : "",
            ].join(" ")}
          >
            Compare
          </button>
          <div
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            <AdActionsMenu
              adId={property._id}
              title={property.title}
              location={property.location || property.address}
              variant="icon"
              onReport={onReport}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function InlineSpec({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {icon}
      {text}
    </span>
  );
}

function BudgetOverviewCard({
  budget,
}: {
  budget: { current: number; target: number; percent: number };
}) {
  return (
    <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_14px_35px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className={typography.sectionTitle}>
            Budget Overview
          </h3>
          <p className={`mt-1 ${typography.helperText}`}>Set your preferred range</p>
          <div className="mt-6 text-2xl font-semibold tracking-tight text-[#1f6b58] md:text-3xl">
            {formatCompactCurrency(budget.current)}
          </div>
          <p className={`mt-2 ${typography.helperText}`}>of {formatCompactCurrency(budget.target)}</p>
        </div>

        <div
          className="grid h-24 w-24 place-items-center rounded-full"
          style={{
            background: `conic-gradient(${BRAND} 0 ${budget.percent}%, #d9e6df ${budget.percent}% 100%)`,
          }}
        >
          <div className="grid h-[76px] w-[76px] place-items-center rounded-full bg-white text-xl font-semibold text-slate-900">
            {budget.percent}%
          </div>
        </div>
      </div>

      <Link
        href="/buyer/profile"
        className={`mt-6 inline-flex h-11 w-full items-center justify-center rounded-2xl text-white transition hover:-translate-y-0.5 ${typography.buttonText}`}
        style={{ backgroundColor: BRAND }}
      >
        Edit Budget
      </Link>
    </div>
  );
}

function UpcomingVisitsCard({ items }: { items: Property[] }) {
  return (
    <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_14px_35px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-4">
        <h3 className={typography.sectionTitle}>
          Upcoming Visits
        </h3>
        <Link href="/buyer/search-properties" className={`text-[#1f6b58] ${typography.buttonText}`}>
          View all
        </Link>
      </div>

      <div className="mt-5 space-y-4">
        {items.length ? (
          items.map((property, index) => (
            <Link
              key={property._id}
              href={`/buyer/property/${property._id}`}
              className="flex items-center gap-4 rounded-[22px] border border-[#ece8e0] bg-[#fbfaf7] p-3 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
            >
              <div className="h-16 w-16 overflow-hidden rounded-2xl bg-slate-100">
                <img
                  src={property.images?.[0]?.url || fallbackImage(property)}
                  alt={property.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{property.title}</p>
                <p className={`mt-1 ${typography.pageSubtitle}`}>{property.location || property.address}</p>
                <div className={`mt-2 flex items-center gap-2 ${typography.helperText}`}>
                  <CalendarDays className="h-3.5 w-3.5 text-rose-400" />
                  {derivedVisitDate(index)}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <EmptyState message="Upcoming property visits will appear here." />
        )}
      </div>
    </div>
  );
}

function MessagesCard({
  items,
}: {
  items: Array<{ sender: string; body: string; time: string }>;
}) {
  return (
    <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_14px_35px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-4">
        <h3 className={typography.sectionTitle}>Messages</h3>
        <Link href="/buyer/messages" className={`text-[#1f6b58] ${typography.buttonText}`}>
          View all
        </Link>
      </div>

      <div className="mt-5 space-y-4">
        {items.map((item, index) => (
          <Link
            key={`${item.sender}-${index}`}
            href="/buyer/messages"
            className="flex items-start gap-4 rounded-[22px] border border-[#ece8e0] bg-[#fbfaf7] p-3 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
          >
            <div
              className="grid h-12 w-12 place-items-center rounded-full text-white"
              style={{ backgroundColor: index === 2 ? BRAND : "#d8e6df" }}
            >
              {index === 2 ? <BookmarkCheck className="h-5 w-5" /> : <UserRound className="h-5 w-5 text-[#1f6b58]" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-900">{item.sender}</p>
                <span className={`shrink-0 ${typography.helperText}`}>{item.time}</span>
              </div>
              <p className={`mt-2 line-clamp-2 ${typography.pageSubtitle}`}>{item.body}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function RecentSearchesCard({ searches }: { searches: string[] }) {
  return (
    <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_14px_35px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-4">
        <h3 className={typography.sectionTitle}>
          Recent Searches
        </h3>
        <button className={typography.buttonTextMuted}>Clear all</button>
      </div>

      <div className="mt-5 space-y-3">
        {searches.length ? (
          searches.map((search) => (
            <Link
              key={search}
              href={`/buyer/search-properties?q=${encodeURIComponent(search)}`}
              className={`flex items-center gap-3 rounded-full border border-[#ece8e0] bg-[#fbfaf7] px-4 py-3 text-slate-700 transition hover:bg-white hover:shadow-sm ${typography.buttonTextMuted}`}
            >
              <Clock3 className="h-4 w-4 text-[#7f8a84]" />
              {search}
            </Link>
          ))
        ) : (
          <EmptyState message="Search history will appear here once you explore listings." />
        )}
      </div>
    </div>
  );
}

function LiveActivityCard({
  items,
}: {
  items: Array<{ label: string; text: string }>;
}) {
  return (
    <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_14px_35px_rgba(15,23,42,0.04)]">
      <h3 className={typography.sectionTitle}>Live Activity</h3>

      <div className="mt-5 space-y-5">
        {items.map((item, index) => (
          <div key={item.label} className="relative pl-11">
            {index !== items.length - 1 ? (
              <span className="absolute left-[14px] top-8 h-[calc(100%-8px)] w-px bg-[#d9e3dc]" />
            ) : null}
            <span className="absolute left-0 top-0 grid h-7 w-7 place-items-center rounded-full bg-[#edf5f0] text-[#1f6b58]">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <p className={typography.pageEyebrow}>
              {item.label}
            </p>
            <p className={`mt-1.5 ${typography.pageSubtitle}`}>{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#d9dfd8] bg-[#faf8f4] px-5 py-10 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || "Buyer";
}

function numberCompact(value: number) {
  return new Intl.NumberFormat("en-US").format(Number(value) || 0);
}

function formatCompactCurrency(value: number) {
  if (!value) return "$0";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 100_000) return `Rs. ${(value / 100_000).toFixed(1)} L`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${Math.round(value).toLocaleString()}`;
}

function formatPrice(property: Property) {
  const currency = property.currency || "USD";
  const price = Number(property.price) || 0;
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

function derivedVisitDate(index: number) {
  const now = new Date();
  const next = new Date(now);
  next.setDate(now.getDate() + index + 2);
  return next.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fallbackImage(property: Property) {
  const title = property.title || property.location || "Luxury Estate";
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#eef3f1"/>
          <stop offset="100%" stop-color="#dfe8e1"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="800" fill="url(#g)"/>
      <text x="50%" y="48%" text-anchor="middle" fill="#0f172a" font-family="Arial, sans-serif" font-size="56" font-weight="700">${title}</text>
      <text x="50%" y="57%" text-anchor="middle" fill="#1f6b58" font-family="Arial, sans-serif" font-size="24" letter-spacing="6">PROPERTY SEWA</text>
    </svg>`
  )}`;
}
