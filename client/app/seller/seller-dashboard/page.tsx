"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
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
  Search,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { apiFetch } from "@/app/lib/api";
import { typography } from "@/app/lib/typography";

type RangeOption = "7d" | "30d" | "90d";
type Summary = {
  totalListings: number; activeListings: number; pendingListings: number; rejectedListings: number;
  views: number; leads: number; visits: number; completedVisits: number; lifetimeViews: number;
  lifetimeLeads: number; conversionRate: number; visitCompletionRate: number; averageDailyViews: number;
  viewsDelta: number; leadsDelta: number; conversionDelta: number;
};
type Breakdown = { label: string; count: number };
type ActivityItem = {
  id: string; type: "lead" | "visit"; status: string; occurredAt: string; propertyTitle: string;
  actorName: string; href: string; requestedDate: string | null; preferredTime: string | null; message: string;
};
type Listing = {
  id: string; title: string; location: string; status: string; listingType: string; price: number;
  currency: string; image: string; views: number; leads: number; visits: number;
};
type Trend = { label: string; views: number; leads: number; visits: number };
type Analytics = {
  filters: { startDate: string; endDate: string };
  summary: Summary;
  trends: Trend[];
  funnel: Array<{ label: string; value: number; ratio: number }>;
  breakdowns: { listings: Breakdown[]; leads: Breakdown[]; visits: Breakdown[] };
  propertyPerformance: Listing[];
  recentActivity: ActivityItem[];
};

const PAGE_BG = "min-h-screen bg-[#f4f6f3]";
const CARD = "rounded-[20px] border border-[#e7ece8] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition-[transform,box-shadow,border-color] duration-300";
const SOFT_CARD = "rounded-[16px] border border-[#edf1ee] bg-[#fafcfb] transition-[transform,box-shadow,border-color,background-color] duration-300";
const DEFER = { contentVisibility: "auto", containIntrinsicSize: "1000px" } as const;

const fmtNum = (n: number) => new Intl.NumberFormat().format(Number(n || 0));
const fmtCompact = (n: number) => new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: n >= 1000 ? 1 : 0 }).format(Number(n || 0));
const fmtPct = (n: number) => `${Number(n || 0).toFixed(1)}%`;
const fmtDate = (v?: string | null, fb = "No activity yet") => {
  if (!v) return fb;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? fb : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};
const fmtDateTime = (v?: string | null, fb = "Unknown") => {
  if (!v) return fb;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? fb : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};
const fmtCurrency = (n: number, c: string) => `${c} ${fmtNum(n)}`;
const titleCase = (s: string) => String(s || "").split("_").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
const cn = (...v: Array<string | false | null | undefined>) => v.filter(Boolean).join(" ");
const getSignedDelta = (n: number) => `${n > 0 ? "+" : ""}${Number(n || 0).toFixed(1)}%`;
const getImageSrc = (src?: string) => {
  const value = String(src || "").trim();
  if (!value) return "/images/property-placeholder.jpg";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return value;
  return `/${value}`;
};
const statusTone = (s: string) =>
  s === "active" || s === "completed" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" :
  s === "pending" || s === "requested" || s === "new" ? "bg-amber-50 text-amber-700 ring-amber-200" :
  s === "confirmed" || s === "contacted" ? "bg-sky-50 text-sky-700 ring-sky-200" :
  s === "rejected" ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-slate-100 text-slate-700 ring-slate-200";

function LoadingSkeleton() {
  return (
    <main className={PAGE_BG}>
      <div className="mx-auto max-w-[1420px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="space-y-5">
        <div className="h-20 animate-pulse rounded-[20px] bg-white" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_360px]">
          <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-[150px] animate-pulse rounded-[20px] bg-white" />)}
          </div>
          <div className="h-[370px] animate-pulse rounded-[20px] bg-white" />
          </div>
          <div className="h-[525px] animate-pulse rounded-[20px] bg-white" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-[340px] animate-pulse rounded-[20px] bg-white" />
          <div className="h-[340px] animate-pulse rounded-[20px] bg-white" />
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[330px] animate-pulse rounded-[20px] bg-white" />)}
        </div>
        </div>
      </div>
    </main>
  );
}

function HeaderSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative w-full xl:w-[360px]">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-700" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by property, location, or client"
        className={`h-12 w-full rounded-2xl border-2 border-emerald-200 bg-[#fcfffd] pl-11 pr-4 shadow-[0_8px_20px_rgba(16,185,129,0.08)] outline-none focus:border-emerald-500 focus:bg-white ${typography.inputText}`}
      />
    </div>
  );
}

function MetricCard({
  title,
  value,
  helper,
  icon: Icon,
  positive = true,
}: {
  title: string;
  value: string;
  helper: string;
  icon: React.ComponentType<{ className?: string }>;
  positive?: boolean;
}) {
  return (
    <article className={cn(CARD, "seller-reveal seller-hover-card min-h-[150px] p-6")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={typography.cardTitle}>{title}</div>
          <div className={`mt-6 ${typography.statValue}`}>{value}</div>
          <div className={cn(`mt-5 inline-flex items-center gap-2 ${typography.helperText}`, positive ? "text-emerald-600" : "text-rose-500")}>
            <TrendingUp className={cn("h-4 w-4", !positive && "rotate-180")} />
            {helper}
          </div>
        </div>
        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-700 shadow-[0_6px_16px_rgba(16,185,129,0.10)]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}

function TrendChartCard({
  trends,
  range,
  setRange,
}: {
  trends: Trend[];
  range: RangeOption;
  setRange: (v: RangeOption) => void;
}) {
  const labels = trends.length ? trends.map((t, i) => String(t.label || `P${i + 1}`)) : range === "7d" ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] : range === "30d" ? ["Week 1", "Week 2", "Week 3", "Week 4"] : ["Jan", "Feb", "Mar"];
  const views = trends.length ? trends.map((t) => Number(t.views || 0)) : [0, 0, 0];
  const leads = trends.length ? trends.map((t) => Number(t.leads || 0)) : [0, 0, 0];
  const hasData = trends.some((t) => Number(t.views || 0) > 0 || Number(t.leads || 0) > 0);
  const width = 920;
  const height = 320;
  const left = 62;
  const right = 26;
  const top = 26;
  const bottom = 44;
  const maxValue = Math.max(...views, ...leads, 1);

  const points = (values: number[]) =>
    values.map((value, index) => {
      const x = left + (index / Math.max(values.length - 1, 1)) * (width - left - right);
      const y = height - bottom - (value / maxValue) * (height - top - bottom);
      return { x, y };
    });

  const linePath = (values: number[]) => {
    const coords = points(values);
    if (!coords.length) return "";
    if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;

    return coords
      .map((point, index, arr) => {
        if (index === 0) return `M ${point.x} ${point.y}`;
        const prev = arr[index - 1];
        const cx = (prev.x + point.x) / 2;
        return `C ${cx} ${prev.y}, ${cx} ${point.y}, ${point.x} ${point.y}`;
      })
      .join(" ");
  };

  const areaPath = `${linePath(views)} L ${width - right} ${height - bottom} L ${left} ${height - bottom} Z`;
  const peakIndex = views.indexOf(Math.max(...views));
  const peakX = left + (peakIndex / Math.max(views.length - 1, 1)) * (width - left - right);
  const peakY = height - bottom - ((views[peakIndex] || 0) / maxValue) * (height - top - bottom);
  const visibleLabelIndexes = labels
    .map((_, i) => i)
    .filter((i) => {
      if (labels.length <= 8) return true;
      const step = Math.ceil(labels.length / 7);
      return i % step === 0 || i === labels.length - 1;
    });

  return (
    <section className={cn(CARD, "seller-reveal seller-delay-1 seller-hover-card p-5 sm:p-6")}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className={typography.sectionTitle}>Market Activity Trends</h2>
          <div className="mt-3 flex flex-wrap items-center gap-6 text-sm text-slate-500">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
              Property Views
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              Lead Activity
            </span>
          </div>
        </div>

        <div className="inline-flex items-center gap-1 rounded-full bg-[#f4f6f5] p-1">
          {([{ value: "7d", label: "7D" }, { value: "30d", label: "30D" }, { value: "90d", label: "90D" }] as Array<{ value: RangeOption; label: string }>).map((option) => (
            <button key={option.value} type="button" onClick={() => setRange(option.value)} className={cn(`rounded-full px-4 py-2 transition ${typography.buttonTextMuted}`, range === option.value ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:bg-white hover:text-slate-900")}>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="mt-6 flex h-[308px] items-center justify-center rounded-[18px] bg-[#fafcfb] text-sm text-slate-500">
          Trend analytics will appear once your listings start getting views and leads.
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-[18px] border border-[#eef3ef] bg-[linear-gradient(180deg,#fcfefd_0%,#f6fbf8_100%)]">
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${width} ${height}`} className="h-[308px] min-w-[760px] w-full" fill="none">
              <defs>
                <linearGradient id="trendAreaFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {Array.from({ length: 5 }).map((_, i) => {
                const y = top + (i / 4) * (height - top - bottom);
                const value = Math.round(maxValue - (i / 4) * maxValue);
                return (
                  <g key={i}>
                    <line x1={left} y1={y} x2={width - right} y2={y} stroke="#e8eeea" strokeDasharray="4 6" />
                    <text x="12" y={y + 4} fontSize="12" fill="#7b8794">{fmtCompact(value)}</text>
                  </g>
                );
              })}
              {labels.map((label, i) => {
                if (!visibleLabelIndexes.includes(i)) return null;
                const x = left + (i / Math.max(labels.length - 1, 1)) * (width - left - right);
                return <text key={`${label}-${i}`} x={x} y={height - 12} textAnchor="middle" fontSize="12" fill="#7b8794">{label}</text>;
              })}
              <path d={areaPath} fill="url(#trendAreaFill)" />
              <path d={linePath(views)} stroke="#12996b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <path d={linePath(leads)} stroke="#ef476f" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 5" />
              <line x1={peakX} y1={top} x2={peakX} y2={height - bottom} stroke="#cfd8d3" strokeDasharray="4 6" />
              <circle cx={peakX} cy={peakY} r="6" fill="#12996b" stroke="#ffffff" strokeWidth="3" />
              <g transform={`translate(${peakX - 31}, ${peakY - 36})`}>
                <rect width="62" height="30" rx="15" fill="#111827" />
                <text x="31" y="19" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">{fmtCompact(views[peakIndex] || 0)}</text>
              </g>
            </svg>
          </div>
        </div>
      )}
    </section>
  );
}

function DistributionCard({ items }: { items: Breakdown[] }) {
  const palette = ["#2f8f4e", "#62b33d", "#8fd672", "#b7e59f", "#d8f1cd", "#edf8e8"];
  const sortedItems = [...items].sort((a, b) => b.count - a.count);
  const cleanItems = sortedItems.slice(0, 5);
  const total = sortedItems.reduce((sum, item) => sum + item.count, 0) || 1;
  const visibleItems = cleanItems.filter((item) => item.count > 0);
  const chartItems = visibleItems.length > 0 ? visibleItems : cleanItems;
  let offset = 0;
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const leadPct = sortedItems[0] ? Math.round((sortedItems[0].count / total) * 100) : 0;
  const leadLabel = sortedItems[0]?.label || "No data";
  const isSingleFullRing = chartItems.length === 1 && leadPct === 100;

  return (
    <section className={cn(CARD, "seller-reveal seller-delay-2 seller-hover-card h-full p-5 sm:p-6")}>
      <h2 className={typography.sectionTitle}>Property Type Distribution</h2>
      <div className="mt-5 grid gap-5 md:grid-cols-[140px_minmax(0,1fr)] md:items-center">
        <div className="flex justify-center">
          <div className="relative h-[148px] w-[148px]">
            <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90">
              <circle cx="110" cy="110" r={radius} stroke="#eef2ef" strokeWidth="24" fill="none" />
              {isSingleFullRing ? (
                <circle
                  cx="110"
                  cy="110"
                  r={radius}
                  stroke={palette[0]}
                  strokeWidth="24"
                  fill="none"
                />
              ) : chartItems.map((item, index) => {
                const fraction = item.count / total;
                const dash = circumference * fraction;
                const gap = circumference - dash;
                const dashOffset = -offset * circumference;
                offset += fraction;
                return (
                  <circle
                    key={item.label}
                    cx="110"
                    cy="110"
                    r={radius}
                    stroke={palette[index % palette.length]}
                    strokeWidth="24"
                    fill="none"
                    strokeDasharray={`${dash} ${gap}`}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="butt"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-[34px] rounded-full bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]" />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className={typography.statValue}>
                {leadPct}%
              </div>
              <div className={`mt-1 ${typography.helperText}`}>
                {leadLabel}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {cleanItems.map((item, index) => {
            const pct = Math.round((item.count / total) * 100);
            return (
              <div key={item.label} className="flex items-center justify-between gap-3 border-b border-[#edf2ef] pb-3 last:border-b-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <span className="inline-block h-4 w-4 rounded-[4px]" style={{ backgroundColor: palette[index % palette.length] }} />
                  <span className={typography.tableCell}>{item.label}</span>
                </div>
                <span className={typography.tableCellStrong}>{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PropertyCard({ listing }: { listing: Listing }) {
  return (
    <Link href={`/seller/property/${listing.id}`} className={cn(CARD, "seller-hover-card group overflow-hidden hover:shadow-[0_18px_40px_rgba(15,23,42,0.10)]")}>
      <div className="relative h-[184px] overflow-hidden rounded-t-[20px]">
        <img src={getImageSrc(listing.image)} alt={listing.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
        <div className="absolute left-3 top-3 inline-flex rounded-full bg-white/20 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          {titleCase(listing.listingType || listing.status)}
        </div>
        <div className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1">
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
      <div className="p-4">
        <h3 className={typography.sectionTitle}>
          {listing.title}
        </h3>
        <div className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500">
          <MapPin className="h-4 w-4" />
          {listing.location}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className={`rounded-full bg-[#f6f7f7] px-3 py-1 ${typography.helperText}`}>
            {fmtNum(listing.views)} Views
          </span>
          <span className={`rounded-full bg-[#f6f7f7] px-3 py-1 ${typography.helperText}`}>
            {fmtNum(listing.leads)} Leads
          </span>
          <span className={`rounded-full bg-[#f6f7f7] px-3 py-1 ${typography.helperText}`}>
            {fmtNum(listing.visits)} Visits
          </span>
        </div>
        <div className="mt-5 flex items-center justify-between gap-3">
          <div className={typography.statValue}>
            {fmtCurrency(listing.price, listing.currency)}
          </div>
          <span className={cn("inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ring-1", statusTone(listing.status))}>
            {titleCase(listing.status)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function SellerDashboardPage() {
  const [range, setRange] = useState<RangeOption>("30d");
  const [search, setSearch] = useState("");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");

  async function loadDashboard(signal?: AbortSignal) {
    const [me, res] = await Promise.all([
      apiFetch<{ user?: { name?: string; email?: string } }>("/auth/me", signal ? { signal } : undefined),
      apiFetch<{ data: Analytics }>(`/analytics/seller?range=${range}`, signal ? { signal } : undefined),
    ]);

    if (signal?.aborted) return;

    setUserName(me?.user?.name || "");
    setUserEmail(me?.user?.email || "");
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
  const latestTrend = analytics?.trends[analytics.trends.length - 1] || null;
  const recentActivity = filteredRecentActivity.slice(0, 5);
  const featuredListings = filteredPropertyPerformance.slice(0, 4);
  const isSearching = normalizedSearch.length > 0;

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
      <div className="mx-auto max-w-[1420px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="space-y-5">
          <header className={cn(CARD, "seller-reveal px-5 py-4 sm:px-6")}>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <h1 className={typography.pageTitle}>
                  {`Welcome back, ${userName || userEmail || "Seller"}`} <span aria-hidden="true">👋</span>
                </h1>
                <p className={`mt-1.5 ${typography.pageSubtitle}`}>
                  Get a clear view of your real estate portfolio.
                </p>
                <Link href="/" className={`mt-2.5 inline-flex items-center gap-1 text-emerald-700 transition duration-300 hover:translate-x-1 hover:text-emerald-800 ${typography.buttonTextMuted}`}>
                  Back to Home
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="flex flex-col gap-3 xl:min-w-[780px] xl:flex-row xl:items-center xl:justify-end">
                <HeaderSearch value={search} onChange={setSearch} />

                <Link href="/seller/add-property" className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 text-white shadow-[0_10px_24px_rgba(16,185,129,0.20)] transition duration-300 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-[0_16px_28px_rgba(16,185,129,0.28)] ${typography.buttonTextMuted}`}>
                  <Plus className="h-4 w-4" />
                  Add Property
                </Link>

                <button type="button" onClick={refresh} disabled={refreshing} className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-emerald-200 bg-[#fcfffd] text-emerald-700 shadow-[0_8px_20px_rgba(16,185,129,0.08)] transition duration-300 hover:-translate-y-0.5 hover:border-emerald-400 hover:bg-white hover:shadow-[0_14px_24px_rgba(16,185,129,0.15)] disabled:opacity-60" aria-label="Refresh dashboard">
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
                    <Link href="/seller/leads" className={`text-emerald-700 transition hover:text-emerald-800 ${typography.buttonTextMuted}`}>
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
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_360px]" style={DEFER}>
            <div className="space-y-5">
              <section className="grid gap-4 md:grid-cols-3">
                <MetricCard
                  title="Total Properties"
                  value={fmtNum(summary?.totalListings || 0)}
                  helper={`${fmtNum(summary?.pendingListings || 0)} pending approvals`}
                  icon={Home}
                  positive={(summary?.pendingListings || 0) === 0}
                />
                <MetricCard
                  title="Avg. Commission"
                  value={fmtPct(summary?.conversionRate || 0)}
                  helper={`${getSignedDelta(summary?.conversionDelta || 0)} from last month`}
                  icon={Percent}
                  positive={(summary?.conversionDelta || 0) >= 0}
                />
                <MetricCard
                  title="Property Views"
                  value={fmtNum(summary?.views || 0)}
                  helper={`${getSignedDelta(summary?.viewsDelta || 0)} from last month`}
                  icon={Eye}
                  positive={(summary?.viewsDelta || 0) >= 0}
                />
              </section>

              <TrendChartCard trends={analytics?.trends || []} range={range} setRange={setRange} />
            </div>

            <div className="space-y-5">
              <section className={cn(CARD, "seller-reveal seller-delay-2 seller-hover-card p-5 sm:p-6")}>
                <div className="flex items-center justify-between">
                  <h2 className="text-[20px] font-semibold tracking-tight text-slate-900">
                    Live Snapshot
                  </h2>
                  <span className={typography.helperText}>
                    {lastUpdatedAt ? fmtDateTime(lastUpdatedAt) : "Just now"}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className={cn(SOFT_CARD, "p-4")}>
                    <div className="text-sm text-slate-500">Active Listings</div>
                    <div className="mt-2 text-[28px] font-semibold tracking-tight text-slate-950">{fmtNum(summary?.activeListings || 0)}</div>
                  </div>
                  <div className={cn(SOFT_CARD, "p-4")}>
                    <div className="text-sm text-slate-500">Fresh Leads</div>
                    <div className="mt-2 text-[28px] font-semibold tracking-tight text-slate-950">{fmtNum(summary?.leads || 0)}</div>
                  </div>
                  <div className={cn(SOFT_CARD, "p-4")}>
                    <div className="text-sm text-slate-500">Visit Requests</div>
                    <div className="mt-2 text-[28px] font-semibold tracking-tight text-slate-950">{fmtNum(summary?.visits || 0)}</div>
                  </div>
                  <div className={cn(SOFT_CARD, "p-4")}>
                    <div className="text-sm text-slate-500">Completion Rate</div>
                    <div className="mt-2 text-[28px] font-semibold tracking-tight text-slate-950">{fmtPct(summary?.visitCompletionRate || 0)}</div>
                  </div>
                </div>

                {topListing ? (
                  <div className="mt-4 rounded-[18px] bg-[linear-gradient(135deg,#0d8d63_0%,#0f7a65_100%)] p-4 text-white shadow-[0_12px_28px_rgba(15,122,101,0.24)]">
                    <div className="text-xs uppercase tracking-[0.18em] text-white/75">Top Listing</div>
                    <div className="mt-2 text-lg font-semibold">{topListing.title}</div>
                    <div className="mt-1 text-sm text-white/80">{topListing.location}</div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-white/15 px-3 py-1">{fmtNum(topListing.views)} views</span>
                      <span className="rounded-full bg-white/15 px-3 py-1">{fmtNum(topListing.leads)} leads</span>
                      <span className="rounded-full bg-white/15 px-3 py-1">{fmtNum(topListing.visits)} visits</span>
                    </div>
                  </div>
                ) : null}
              </section>

              <DistributionCard items={analytics?.breakdowns.listings || []} />
            </div>
          </section>
          ) : null}

          {!isSearching ? (
          <section className="seller-reveal seller-delay-2" style={DEFER}>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className={typography.sectionTitle}>
                  Featured Properties
                </h2>
                <p className={`mt-1.5 ${typography.pageSubtitle}`}>
                  Your best performing and recent listings.
                </p>
              </div>

              <Link href="/seller/my-properties" className={`text-emerald-700 transition hover:text-emerald-800 ${typography.buttonTextMuted}`}>
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
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
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
                    <Link href="/seller/add-property" className={`mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 text-white transition hover:bg-emerald-700 ${typography.buttonTextMuted}`}>
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
            <section className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]" style={DEFER}>
              <section className={cn(CARD, "seller-reveal seller-delay-3 seller-hover-card p-5 sm:p-6")}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className={typography.sectionTitle}>
                      Recent Buyer Movement
                    </h2>
                    <p className={`mt-1 ${typography.pageSubtitle}`}>
                      Latest lead and visit activity across your properties.
                    </p>
                  </div>
                  <Link href="/seller/leads" className={`text-emerald-700 transition hover:text-emerald-800 ${typography.buttonTextMuted}`}>
                    Open Inbox
                  </Link>
                </div>
                <div className="mt-5 space-y-3">
                  {recentActivity.length === 0 ? <div className="rounded-[16px] border border-dashed border-[#d9e2dc] bg-[#fafcfb] px-5 py-10 text-center text-sm text-slate-500">{normalizedSearch ? `No buyer activity matched "${search.trim()}".` : "No lead or visit activity has been recorded yet."}</div> : null}
                  {recentActivity.map((item) => (
                    <Link key={`${item.type}-${item.id}`} href={item.href} className={cn(SOFT_CARD, "seller-soft-hover block p-4 hover:border-emerald-200 hover:bg-white")}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ring-1", statusTone(item.status))}>{titleCase(item.status)}</span>
                            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{item.type}</span>
                          </div>
                          <div className="mt-2 text-sm font-medium tracking-tight text-slate-950">{item.actorName} {item.type === "lead" ? "sent a lead" : `${titleCase(item.status)} a visit`}</div>
                          <div className={`mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 ${typography.pageSubtitle}`}>
                            <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" />{item.propertyTitle}</span>
                            <span>{fmtDateTime(item.occurredAt)}</span>
                          </div>
                          {item.message ? (
                            <p className={`mt-2 line-clamp-2 ${typography.pageSubtitle}`}>
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

              <div className="space-y-5">
                <section className={cn(CARD, "seller-reveal seller-delay-4 seller-hover-card p-5 sm:p-6")}>
                  <div className="flex items-center justify-between">
                    <h2 className={typography.sectionTitle}>
                      Quick Actions
                    </h2>
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                  </div>

                  <div className="mt-4 grid gap-3">
                    {[
                      { href: "/seller/my-properties", label: "Manage Listings", desc: "Update your property inventory", icon: Home },
                      { href: "/seller/leads", label: "Respond to Leads", desc: `${fmtNum(summary?.leads || 0)} lead opportunities`, icon: MessageSquare },
                      { href: "/seller/visit-scheduling", label: "Schedule Visits", desc: `${fmtNum(Math.max((summary?.visits || 0) - (summary?.completedVisits || 0), 0))} open visits`, icon: CalendarClock },
                      { href: "/seller/analytics", label: "Full Analytics", desc: "Open the detailed performance view", icon: Activity },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link key={item.href} href={item.href} className={cn(SOFT_CARD, "seller-soft-hover flex items-center justify-between gap-3 p-4 hover:border-emerald-200 hover:bg-white")}>
                          <div className="flex items-center gap-3">
                            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-slate-900">{item.label}</div>
                              <div className={typography.pageSubtitle}>{item.desc}</div>
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
