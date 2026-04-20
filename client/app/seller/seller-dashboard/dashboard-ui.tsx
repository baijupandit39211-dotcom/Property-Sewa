"use client";

import Link from "next/link";
import type React from "react";
import { Search, TrendingUp, MapPin, ArrowRight, ChevronRight, Home } from "lucide-react";
import { typography } from "@/app/lib/typography";

export const PAGE_BG = "min-h-screen bg-[#f4f6f3]";
export const CARD =
  "rounded-[20px] border border-[#e7ece8] bg-white shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition-[transform,box-shadow,border-color] duration-300";
export const SOFT_CARD =
  "rounded-[16px] border border-[#edf1ee] bg-[#fafcfb] transition-[transform,box-shadow,border-color,background-color] duration-300";
export const DEFER = { contentVisibility: "auto", containIntrinsicSize: "1000px" } as const;

export const fmtNum = (n: number) => new Intl.NumberFormat().format(Number(n || 0));
const fmtCompact = (n: number) =>
  new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: n >= 1000 ? 1 : 0,
  }).format(Number(n || 0));
export const fmtPct = (n: number) => `${Number(n || 0).toFixed(1)}%`;
export const fmtDateTime = (v?: string | null, fb = "Unknown") => {
  if (!v) return fb;
  const d = new Date(v);
  return Number.isNaN(d.getTime())
    ? fb
    : d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
};
const fmtCurrency = (n: number, c: string) => `${c} ${fmtNum(n)}`;
const titleCase = (s: string) =>
  String(s || "")
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
export const cn = (...v: Array<string | false | null | undefined>) => v.filter(Boolean).join(" ");
const getImageSrc = (src?: string) => {
  const value = String(src || "").trim();
  if (!value) return "/images/property-placeholder.jpg";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return value;
  return `/${value}`;
};
export const getSignedDelta = (n: number) => `${n > 0 ? "+" : ""}${Number(n || 0).toFixed(1)}%`;
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

type RangeOption = "7d" | "30d" | "90d";
type Breakdown = { label: string; count: number };
type Trend = { label: string; views: number; leads: number; visits: number };
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

export function LoadingSkeleton() {
  return (
    <main className={PAGE_BG}>
      <div className="mx-auto max-w-[1420px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="space-y-5">
          <div className="h-20 animate-pulse rounded-[20px] bg-white" />
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_360px]">
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-[150px] animate-pulse rounded-[20px] bg-white" />
                ))}
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
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[330px] animate-pulse rounded-[20px] bg-white" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

export function HeaderSearch({
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

export function MetricCard({
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
          <div
            className={cn(
              `mt-5 inline-flex items-center gap-2 ${typography.helperText}`,
              positive ? "text-emerald-600" : "text-rose-500"
            )}
          >
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

export function TrendChartCard({
  trends,
  range,
  setRange,
}: {
  trends: Trend[];
  range: RangeOption;
  setRange: (v: RangeOption) => void;
}) {
  const labels = trends.length
    ? trends.map((t, i) => String(t.label || `P${i + 1}`))
    : range === "7d"
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : range === "30d"
        ? ["Week 1", "Week 2", "Week 3", "Week 4"]
        : ["Jan", "Feb", "Mar"];
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
          {([
            { value: "7d", label: "7D" },
            { value: "30d", label: "30D" },
            { value: "90d", label: "90D" },
          ] as Array<{ value: RangeOption; label: string }>).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRange(option.value)}
              className={cn(
                `rounded-full px-4 py-2 transition ${typography.buttonTextMuted}`,
                range === option.value
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-white hover:text-slate-900"
              )}
            >
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
                    <text x="12" y={y + 4} fontSize="12" fill="#7b8794">
                      {fmtCompact(value)}
                    </text>
                  </g>
                );
              })}
              {labels.map((label, i) => {
                if (!visibleLabelIndexes.includes(i)) return null;
                const x = left + (i / Math.max(labels.length - 1, 1)) * (width - left - right);
                return (
                  <text key={`${label}-${i}`} x={x} y={height - 12} textAnchor="middle" fontSize="12" fill="#7b8794">
                    {label}
                  </text>
                );
              })}
              <path d={areaPath} fill="url(#trendAreaFill)" />
              <path d={linePath(views)} stroke="#12996b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <path
                d={linePath(leads)}
                stroke="#ef476f"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="4 5"
              />
              <line x1={peakX} y1={top} x2={peakX} y2={height - bottom} stroke="#cfd8d3" strokeDasharray="4 6" />
              <circle cx={peakX} cy={peakY} r="6" fill="#12996b" stroke="#ffffff" strokeWidth="3" />
              <g transform={`translate(${peakX - 31}, ${peakY - 36})`}>
                <rect width="62" height="30" rx="15" fill="#111827" />
                <text x="31" y="19" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">
                  {fmtCompact(views[peakIndex] || 0)}
                </text>
              </g>
            </svg>
          </div>
        </div>
      )}
    </section>
  );
}

export function DistributionCard({ items }: { items: Breakdown[] }) {
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
                <circle cx="110" cy="110" r={radius} stroke={palette[0]} strokeWidth="24" fill="none" />
              ) : (
                chartItems.map((item, index) => {
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
                })
              )}
            </svg>
            <div className="absolute inset-[34px] rounded-full bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]" />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className={typography.statValue}>{leadPct}%</div>
              <div className={`mt-1 ${typography.helperText}`}>{leadLabel}</div>
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

export function PropertyCard({ listing }: { listing: Listing }) {
  return (
    <Link href={`/seller/property/${listing.id}`} className={cn(CARD, "seller-hover-card group overflow-hidden hover:shadow-[0_18px_40px_rgba(15,23,42,0.10)]")}>
      <div className="relative h-[184px] overflow-hidden rounded-t-[20px]">
        <img
          src={getImageSrc(listing.image)}
          alt={listing.title}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
        <div className="absolute left-3 top-3 inline-flex rounded-full bg-white/20 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          {titleCase(listing.listingType || listing.status)}
        </div>
        <div className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1">
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
      <div className="p-4">
        <h3 className={typography.sectionTitle}>{listing.title}</h3>
        <div className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500">
          <MapPin className="h-4 w-4" />
          {listing.location}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className={`rounded-full bg-[#f6f7f7] px-3 py-1 ${typography.helperText}`}>{fmtNum(listing.views)} Views</span>
          <span className={`rounded-full bg-[#f6f7f7] px-3 py-1 ${typography.helperText}`}>{fmtNum(listing.leads)} Leads</span>
          <span className={`rounded-full bg-[#f6f7f7] px-3 py-1 ${typography.helperText}`}>{fmtNum(listing.visits)} Visits</span>
        </div>
        <div className="mt-5 flex items-center justify-between gap-3">
          <div className={typography.statValue}>{fmtCurrency(listing.price, listing.currency)}</div>
          <span className={cn("inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ring-1", statusTone(listing.status))}>
            {titleCase(listing.status)}
          </span>
        </div>
      </div>
    </Link>
  );
}
