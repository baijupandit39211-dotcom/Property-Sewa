"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import CountUp from "react-countup";
import {
  Activity,
  ArrowRight,
  CalendarClock,
  ChevronRight,
  Eye,
  Home,
  LoaderCircle,
  MapPin,
  MessageSquare,
  Percent,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { apiFetch } from "@/app/lib/api";
import { useSellerAuth } from "@/app/seller/SellerAuthContext";
import { typography } from "@/app/lib/typography";
import {
  CARD,
  DEFER,
  PAGE_BG,
  SOFT_CARD,
  LoadingSkeleton,
  HeaderSearch,
  MetricCard,
  TrendChartCard,
  DistributionCard,
  PropertyCard,
  cn,
  fmtDateTime,
  fmtNum,
  fmtPct,
  getSignedDelta,
} from "./dashboard-ui";

type RangeOption = "7d" | "30d" | "90d";
type Summary = {
  totalListings: number;
  activeListings: number;
  pendingListings: number;
  rejectedListings: number;
  views: number;
  leads: number;
  visits: number;
  completedVisits: number;
  lifetimeViews: number;
  lifetimeLeads: number;
  conversionRate: number;
  visitCompletionRate: number;
  averageDailyViews: number;
  viewsDelta: number;
  leadsDelta: number;
  conversionDelta: number;
};
type ActivityItem = {
  id: string;
  type: "lead" | "visit";
  status: string;
  occurredAt: string;
  propertyTitle: string;
  actorName: string;
  href: string;
  requestedDate: string | null;
  preferredTime: string | null;
  message: string;
};
type Listing = {
  id: string;
  title: string;
  location: string;
  status: string;
  listingType: string;
  price: number;
  currency: string;
  image: string;
  views: number;
  leads: number;
  visits: number;
};
type Trend = { label: string; views: number; leads: number; visits: number };
type Analytics = {
  filters: { startDate: string; endDate: string };
  summary: Summary;
  trends: Trend[];
  funnel: Array<{ label: string; value: number; ratio: number }>;
  breakdowns: {
    listings: Array<{ label: string; count: number }>;
    leads: Array<{ label: string; count: number }>;
    visits: Array<{ label: string; count: number }>;
  };
  propertyPerformance: Listing[];
  recentActivity: ActivityItem[];
};

const statusTone = (s: string) =>
  s === "active" || s === "completed"
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : s === "pending" || s === "requested" || s === "new"
      ? "bg-amber-50 text-amber-700 ring-amber-200"
      : s === "confirmed" || s === "contacted"
        ? "bg-sky-50 text-sky-700 ring-sky-200"
        : s === "rejected"
          ? "bg-rose-50 text-rose-700 ring-rose-200"
          : "bg-slate-100 text-slate-700 ring-slate-200";

const titleCase = (s: string) =>
  String(s || "")
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");

export default function SellerDashboardPage() {
  const { user } = useSellerAuth();
  const reduceMotion = useReducedMotion();
  const [range, setRange] = useState<RangeOption>("30d");
  const [search, setSearch] = useState("");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");

  async function loadDashboard(signal?: AbortSignal) {
    const res = await apiFetch<{ data: Analytics }>(
      `/analytics/seller?range=${range}`,
      signal ? { signal } : undefined
    );

    if (signal?.aborted) return;

    setAnalytics(res.data);
    setLastUpdatedAt(new Date().toISOString());
    setError("");
  }

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      try {
        await loadDashboard(controller.signal);
      } catch (err: any) {
        if (!controller.signal.aborted) setError(err?.message || "Failed to load seller dashboard");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [range]);

  const summary = analytics?.summary || null;
  const deferredSearch = useDeferredValue(search);
  const normalizedSearch = deferredSearch.trim().toLowerCase();
  const filteredPropertyPerformance = useMemo(() => {
    const items = analytics?.propertyPerformance || [];
    if (!normalizedSearch) return items;
    return items.filter((item) =>
      [item.title, item.location, item.status, item.listingType, item.currency]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch))
    );
  }, [analytics?.propertyPerformance, normalizedSearch]);
  const filteredRecentActivity = useMemo(() => {
    const items = analytics?.recentActivity || [];
    if (!normalizedSearch) return items;
    return items.filter((item) =>
      [item.actorName, item.propertyTitle, item.status, item.message, item.type]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch))
    );
  }, [analytics?.recentActivity, normalizedSearch]);
  const topListing = useMemo(() => {
    const items = filteredPropertyPerformance;
    return items.find((x) => x.views > 0 || x.leads > 0 || x.visits > 0) || items[0] || null;
  }, [filteredPropertyPerformance]);
  const recentActivity = filteredRecentActivity.slice(0, 5);
  const featuredListings = filteredPropertyPerformance.slice(0, 4);
  const isSearching = normalizedSearch.length > 0;
  const userName = user?.name || "";
  const userEmail = user?.email || "";

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await loadDashboard();
    } catch (err: any) {
      setError(err?.message || "Failed to refresh dashboard");
    } finally {
      setRefreshing(false);
    }
  };

  if (loading && !analytics) return <LoadingSkeleton />;

  return (
    <main className={PAGE_BG}>
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <header className="seller-reveal overflow-hidden rounded-[34px] border border-emerald-200/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-6 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:px-8 sm:py-7">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-50">
                  <Sparkles className="h-3.5 w-3.5" />
                  Seller Dashboard
                </span>
                <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-white md:text-4xl">
                  {`Welcome back, ${userName || userEmail || "Seller"}`}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/90">
                  Get a clear view of your real estate portfolio.
                </p>
                <Link href="/" className={`mt-4 inline-flex items-center gap-1.5 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-white backdrop-blur-sm transition hover:bg-white/15 ${typography.buttonText}`}>
                  Back to Home
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap xl:w-auto xl:flex-nowrap xl:items-center xl:justify-end">
                <HeaderSearch value={search} onChange={setSearch} />

                <Link href="/seller/add-property" className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-6 text-white shadow-sm backdrop-blur-sm transition hover:bg-white/15 ${typography.buttonText}`}>
                  <Plus className="h-4 w-4" />
                  Add Property
                </Link>

                <button type="button" onClick={refresh} disabled={refreshing} className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white shadow-sm backdrop-blur-sm transition hover:bg-white/15 disabled:opacity-60" aria-label="Refresh dashboard">
                  <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                </button>

              </div>
            </div>
          </header>

          {error ? (
            <section className="rounded-[18px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
              {error}
            </section>
          ) : null}

          {normalizedSearch ? (
            <section className={cn(CARD, "seller-reveal seller-delay-1 seller-hover-card p-5 sm:p-6")}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className={typography.sectionTitle}>
                    Search Results
                  </h2>
                  <p className={`mt-1 ${typography.pageSubtitle}`}>
                    {filteredPropertyPerformance.length > 0
                      ? `${filteredPropertyPerformance.length} matching properties for "${search.trim()}".`
                      : `No properties matched "${search.trim()}".`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className={`inline-flex h-10 items-center justify-center rounded-2xl border border-[#e8ece9] bg-white px-4 text-slate-700 transition hover:bg-slate-50 ${typography.buttonTextMuted}`}
                >
                  Clear Search
                </button>
              </div>

              {filteredPropertyPerformance.length > 0 ? (
                <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                  {filteredPropertyPerformance.slice(0, 4).map((listing) => (
                    <PropertyCard key={`search-${listing.id}`} listing={listing} />
                  ))}
                </div>
              ) : null}

              <div className="mt-6 rounded-[18px] border border-[#e8ece9] bg-[#fafcfb] p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className={typography.sectionTitle}>
                      Matching Buyer Activity
                    </h3>
                    <p className={`mt-1 ${typography.pageSubtitle}`}>
                      {filteredRecentActivity.length > 0
                        ? `${filteredRecentActivity.length} activity items matched your search.`
                        : "No buyer activity matched your search."}
                    </p>
                  </div>
                  {filteredRecentActivity.length > 0 ? (
                    <Link href="/seller/leads" className={`text-[#316249] transition hover:text-[#28513D] ${typography.buttonTextMuted}`}>
                      Open Inbox
                    </Link>
                  ) : null}
                </div>

                {filteredRecentActivity.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {filteredRecentActivity.slice(0, 3).map((item) => (
                      <Link key={`search-activity-${item.type}-${item.id}`} href={item.href} className={cn(SOFT_CARD, "seller-soft-hover block p-4 hover:border-emerald-200 hover:bg-white")}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ring-1", statusTone(item.status))}>
                                {titleCase(item.status)}
                              </span>
                              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                {item.type}
                              </span>
                            </div>
                            <div className="mt-2 text-sm font-medium tracking-tight text-slate-950">
                              {item.actorName} {item.type === "lead" ? "sent a lead" : `${titleCase(item.status)} a visit`}
                            </div>
                            <div className={`mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 ${typography.pageSubtitle}`}>
                              <span className="inline-flex items-center gap-1.5">
                                <MapPin className="h-4 w-4 text-slate-400" />
                                {item.propertyTitle}
                              </span>
                              <span>{fmtDateTime(item.occurredAt)}</span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 flex-none text-slate-400" />
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {!isSearching ? (
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px]" style={DEFER}>
            <div className="space-y-6">
              <motion.section
                className="grid gap-4 md:grid-cols-3"
                initial={reduceMotion ? false : "hidden"}
                animate={reduceMotion ? undefined : "show"}
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.12, delayChildren: 0.04 } },
                }}
              >
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 18, scale: 0.98 },
                      show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.42, ease: EASE_OUT } },
                    }}
                  >
                  <MetricCard
                    title="Total Properties"
                    value={<CountUp end={Number(summary?.totalListings || 0)} duration={0.9} separator="," preserveValue />}
                    helper={`${fmtNum(summary?.pendingListings || 0)} pending approvals`}
                    icon={Home}
                    positive={(summary?.pendingListings || 0) === 0}
                  />
                </motion.div>
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 18, scale: 0.98 },
                      show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.42, ease: EASE_OUT } },
                    }}
                  >
                  <MetricCard
                    title="Avg. Commission"
                    value={
                      <CountUp
                        end={Number(summary?.conversionRate || 0)}
                        duration={0.95}
                        decimals={1}
                        suffix="%"
                        preserveValue
                      />
                    }
                    helper={`${getSignedDelta(summary?.conversionDelta || 0)} from last month`}
                    icon={Percent}
                    positive={(summary?.conversionDelta || 0) >= 0}
                  />
                </motion.div>
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 18, scale: 0.98 },
                      show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.42, ease: EASE_OUT } },
                    }}
                  >
                  <MetricCard
                    title="Property Views"
                    value={<CountUp end={Number(summary?.views || 0)} duration={0.9} separator="," preserveValue />}
                    helper={`${getSignedDelta(summary?.viewsDelta || 0)} from last month`}
                    icon={Eye}
                    positive={(summary?.viewsDelta || 0) >= 0}
                  />
                </motion.div>
              </motion.section>

              <TrendChartCard trends={analytics?.trends || []} range={range} setRange={setRange} />
            </div>

            <div className="space-y-6">
              <motion.section
                className={cn(CARD, "seller-hover-card p-5 sm:p-6")}
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.48, ease: EASE_OUT }}
              >
                <div className="flex items-center justify-between">
                  <h2 className={typography.sectionTitle}>
                    Live Snapshot
                  </h2>
                  <span className={typography.helperText}>
                    {lastUpdatedAt ? fmtDateTime(lastUpdatedAt) : "Just now"}
                  </span>
                </div>

                <motion.div
                  className="mt-4 grid grid-cols-2 gap-3"
                  initial={reduceMotion ? false : "hidden"}
                  whileInView={reduceMotion ? undefined : "show"}
                  viewport={{ once: true, amount: 0.25 }}
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
                  }}
                >
                  <motion.div
                    className={cn(SOFT_CARD, "p-4")}
                    variants={{
                      hidden: { opacity: 0, y: 12, scale: 0.99 },
                      show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.38, ease: EASE_OUT } },
                    }}
                  >
                    <div className="text-sm text-slate-500">Active Listings</div>
                    <div className={`mt-2 ${typography.statValue}`}>
                      <CountUp end={Number(summary?.activeListings || 0)} duration={0.9} separator="," preserveValue />
                    </div>
                  </motion.div>
                  <motion.div
                    className={cn(SOFT_CARD, "p-4")}
                    variants={{
                      hidden: { opacity: 0, y: 12, scale: 0.99 },
                      show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.38, ease: EASE_OUT } },
                    }}
                  >
                    <div className="text-sm text-slate-500">Fresh Leads</div>
                    <div className={`mt-2 ${typography.statValue}`}>
                      <CountUp end={Number(summary?.leads || 0)} duration={0.9} separator="," preserveValue />
                    </div>
                  </motion.div>
                  <motion.div
                    className={cn(SOFT_CARD, "p-4")}
                    variants={{
                      hidden: { opacity: 0, y: 12, scale: 0.99 },
                      show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.38, ease: EASE_OUT } },
                    }}
                  >
                    <div className="text-sm text-slate-500">Visit Requests</div>
                    <div className={`mt-2 ${typography.statValue}`}>
                      <CountUp end={Number(summary?.visits || 0)} duration={0.9} separator="," preserveValue />
                    </div>
                  </motion.div>
                  <motion.div
                    className={cn(SOFT_CARD, "p-4")}
                    variants={{
                      hidden: { opacity: 0, y: 12, scale: 0.99 },
                      show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.38, ease: EASE_OUT } },
                    }}
                  >
                    <div className="text-sm text-slate-500">Completion Rate</div>
                    <div className={`mt-2 ${typography.statValue}`}>
                      <CountUp
                        end={Number(summary?.visitCompletionRate || 0)}
                        duration={0.95}
                        decimals={1}
                        suffix="%"
                        preserveValue
                      />
                    </div>
                  </motion.div>
                </motion.div>

                {topListing ? (
                  <motion.div
                    className="mt-4 rounded-[18px] bg-[linear-gradient(135deg,#316249_0%,#28513D_100%)] p-4 text-white shadow-[0_12px_28px_rgba(49,98,73,0.24)]"
                    initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                    whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.04 }}
                    whileHover={reduceMotion ? undefined : { y: -4, scale: 1.01 }}
                  >
                    <div className="text-xs uppercase tracking-[0.18em] text-white/75">Top Listing</div>
                    <div className="mt-2 text-lg font-semibold">{topListing.title}</div>
                    <div className="mt-1 text-sm text-white/80">{topListing.location}</div>
                    <motion.div
                      className="mt-4 flex flex-wrap gap-2 text-xs"
                      initial={reduceMotion ? false : "hidden"}
                      whileInView={reduceMotion ? undefined : "show"}
                      viewport={{ once: true, amount: 0.35 }}
                      variants={{
                        hidden: {},
                        show: { transition: { staggerChildren: 0.08, delayChildren: 0.06 } },
                      }}
                    >
                      {[
                        { label: `${fmtNum(topListing.views)} views`, key: "views" },
                        { label: `${fmtNum(topListing.leads)} leads`, key: "leads" },
                        { label: `${fmtNum(topListing.visits)} visits`, key: "visits" },
                      ].map((chip) => (
                        <motion.span
                          key={chip.key}
                          className="rounded-full bg-white/15 px-3 py-1"
                          variants={{
                            hidden: { opacity: 0, y: 10, scale: 0.98 },
                            show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: EASE_OUT } },
                          }}
                        >
                          {chip.label}
                        </motion.span>
                      ))}
                    </motion.div>
                  </motion.div>
                ) : null}
              </motion.section>

              <DistributionCard items={analytics?.breakdowns.listings || []} />
            </div>
          </section>
          ) : null}

          {!isSearching ? (
          <section className="seller-reveal seller-delay-2" style={DEFER}>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                  Featured Properties
                </h2>
                <p className="mt-2 text-base text-slate-600">
                  Your best performing and recent listings.
                </p>
              </div>

              <Link href="/seller/my-properties" className={`text-[#316249] transition hover:text-[#28513D] ${typography.buttonTextMuted}`}>
                View All
              </Link>
            </div>

            {featuredListings.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {featuredListings.map((listing) => <PropertyCard key={listing.id} listing={listing} />)}
              </div>
            ) : (
              <div className={cn(CARD, "px-6 py-16 text-center")}>
                <div className="mx-auto max-w-md">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-[#316249]">
                    <Home className="h-6 w-6" />
                  </div>
                  <h3 className={typography.sectionTitle}>
                    {normalizedSearch ? "No matching properties" : "No listings yet"}
                  </h3>
                  <p className={`mt-2 ${typography.pageSubtitle}`}>
                    {normalizedSearch
                      ? `Nothing matched "${search.trim()}". Try a property title, location, or client name.`
                      : "Add your first property to start seeing portfolio insights."}
                  </p>
                  {!normalizedSearch ? (
                    <Link href="/seller/add-property" className={`mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#316249] px-5 text-white transition hover:bg-[#28513D] ${typography.buttonTextMuted}`}>
                      <Plus className="h-4 w-4" />
                      Add Property
                    </Link>
                  ) : null}
                </div>
              </div>
            )}
          </section>
          ) : null}

          {!isSearching ? (
            <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-stretch" style={DEFER}>
              <section className={cn(CARD, "seller-reveal seller-delay-3 seller-hover-card border-[#e9efeb] p-5 shadow-[0_10px_26px_rgba(15,23,42,0.06)] xl:flex xl:h-full xl:flex-col xl:overflow-hidden")}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className={typography.sectionTitle}>
                      Recent Buyer Movement
                    </h2>
                    <p className={`mt-1 ${typography.pageSubtitle}`}>
                      Latest lead and visit activity across your properties.
                    </p>
                  </div>
                  <Link href="/seller/leads" className={`text-[#316249] transition hover:text-[#28513D] ${typography.buttonTextMuted}`}>
                    Open Inbox
                  </Link>
                </div>
                <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1 xl:min-h-0 xl:flex-1">
                  {recentActivity.length === 0 ? <div className="rounded-[16px] border border-dashed border-[#d9e2dc] bg-[#fafcfb] px-5 py-10 text-center text-sm text-slate-500">{normalizedSearch ? `No buyer activity matched "${search.trim()}".` : "No lead or visit activity has been recorded yet."}</div> : null}
                  {recentActivity.map((item) => (
                    <Link key={`${item.type}-${item.id}`} href={item.href} className={cn(SOFT_CARD, "group seller-soft-hover block border-[#e9efeb] p-3.5 hover:border-emerald-200 hover:bg-white")}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ring-1", statusTone(item.status))}>{titleCase(item.status)}</span>
                            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{item.type}</span>
                          </div>
                          <div className="mt-1.5 text-[16px] font-semibold tracking-tight text-slate-900">{item.actorName} {item.type === "lead" ? "sent a lead" : `${titleCase(item.status)} a visit`}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] leading-5 text-slate-500">
                            <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" />{item.propertyTitle}</span>
                            <span>{fmtDateTime(item.occurredAt)}</span>
                          </div>
                          {item.message ? (
                            <p className="mt-1.5 line-clamp-1 text-[12px] leading-5 text-slate-500">
                              {item.message}
                            </p>
                          ) : null}
                        </div>
                        <ChevronRight className="h-4 w-4 flex-none text-slate-400" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              <div className="space-y-6 xl:h-full">
                <section className={cn(CARD, "seller-reveal seller-delay-4 seller-hover-card border-[#e9efeb] p-6 shadow-[0_10px_26px_rgba(15,23,42,0.06)] xl:h-full")}>
                  <div className="flex items-center justify-between">
                    <h2 className={typography.sectionTitle}>
                      Quick Actions
                    </h2>
                    <Sparkles className="h-4 w-4 text-[#316249]" />
                  </div>

                  <div className="mt-5 grid gap-3">
                    {[
                      { href: "/seller/my-properties", label: "Manage Listings", desc: "Update your property inventory", icon: Home },
                      { href: "/seller/leads", label: "Respond to Leads", desc: `${fmtNum(summary?.leads || 0)} lead opportunities`, icon: MessageSquare },
                      { href: "/seller/visit-scheduling", label: "Schedule Visits", desc: `${fmtNum(Math.max((summary?.visits || 0) - (summary?.completedVisits || 0), 0))} open visits`, icon: CalendarClock },
                      { href: "/seller/analytics", label: "Full Analytics", desc: "Open the detailed performance view", icon: Activity },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link key={item.href} href={item.href} className={cn(SOFT_CARD, "group seller-soft-hover flex items-center justify-between gap-3 border-[#e9efeb] p-4 hover:border-emerald-200 hover:bg-white")}>
                          <div className="flex items-center gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-[#316249] ring-1 ring-emerald-100">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="text-[17px] font-semibold tracking-tight text-slate-900">{item.label}</div>
                              <div className="text-[14px] leading-5 text-slate-500">{item.desc}</div>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </Link>
                      );
                    })}
                  </div>
                </section>
              </div>
            </section>
          ) : null}

          {refreshing ? <div className="fixed bottom-6 right-6 inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg"><LoaderCircle className="h-4 w-4 animate-spin" />Refreshing dashboard</div> : null}
          <style jsx global>{`
            @keyframes sellerFadeUp {
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }

            .seller-reveal {
              animation: sellerFadeUp 0.55s ease-out both;
            }

            .seller-delay-1 {
              animation-delay: 0.06s;
            }

            .seller-delay-2 {
              animation-delay: 0.12s;
            }

            .seller-delay-3 {
              animation-delay: 0.18s;
            }

            .seller-delay-4 {
              animation-delay: 0.24s;
            }

            .seller-delay-5 {
              animation-delay: 0.3s;
            }

            .seller-hover-card:hover {
              transform: translateY(-4px);
              box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
              border-color: #d9e7de;
            }

            .seller-soft-hover:hover {
              transform: translateY(-2px);
              box-shadow: 0 12px 24px rgba(15, 23, 42, 0.05);
            }
          `}</style>
        </div>
      </div>
    </main>
  );
}
  const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];
