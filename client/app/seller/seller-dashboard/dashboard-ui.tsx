"use client";

import Link from "next/link";
import React from "react";
import { Search, TrendingUp, MapPin, ArrowRight, ChevronRight, Home } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import CountUp from "react-countup";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { typography } from "@/app/lib/typography";

export const PAGE_BG = "bg-[#f4f6f3]";
export const CARD =
  "rounded-2xl border border-[#e5ebe7] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition-[transform,box-shadow,border-color] duration-300";
export const SOFT_CARD =
  "rounded-2xl border border-[#e9efeb] bg-[#fafcfb] shadow-[0_6px_16px_rgba(15,23,42,0.04)] transition-[transform,box-shadow,border-color,background-color] duration-300";
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
          <div className="h-20 animate-pulse rounded-2xl bg-white" />
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_360px]">
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-[150px] animate-pulse rounded-2xl bg-white" />
                ))}
              </div>
              <div className="h-[370px] animate-pulse rounded-2xl bg-white" />
            </div>
            <div className="h-[525px] animate-pulse rounded-2xl bg-white" />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-[340px] animate-pulse rounded-2xl bg-white" />
            <div className="h-[340px] animate-pulse rounded-2xl bg-white" />
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[330px] animate-pulse rounded-2xl bg-white" />
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
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#316249]" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by property, location, or client"
        className={`h-12 w-full rounded-2xl border-2 border-emerald-200 bg-[#fcfffd] pl-11 pr-4 shadow-[0_8px_20px_rgba(16,185,129,0.08)] outline-none focus:border-[#316249] focus:bg-white ${typography.inputText}`}
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
  value: React.ReactNode;
  helper: string;
  icon: React.ComponentType<{ className?: string }>;
  positive?: boolean;
}) {
  const numericValue = React.useMemo(() => {
    if (typeof value !== "string") return null;
    const raw = String(value || "").trim();
    if (!raw) return null;
    if (!/^[0-9,]+$/.test(raw)) return null;
    const parsed = Number(raw.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }, [value]);

  return (
    <article className={cn(CARD, "seller-reveal seller-hover-card min-h-[150px] p-6")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={typography.cardTitle}>{title}</div>
          <div className={`mt-6 ${typography.statValue}`}>
            {numericValue === null ? value : (
              <CountUp end={numericValue} duration={0.9} separator="," preserveValue />
            )}
          </div>
          <div
            className={cn(
              `mt-5 inline-flex items-center gap-2 ${typography.helperText}`,
              positive ? "text-[#316249]" : "text-rose-500"
            )}
          >
            <TrendingUp className={cn("h-4 w-4", !positive && "rotate-180")} />
            {helper}
          </div>
        </div>
        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-emerald-100 bg-emerald-50 text-[#316249] shadow-[0_6px_16px_rgba(16,185,129,0.10)]">
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
  const chartData = React.useMemo(() => {
    if (trends.length) {
      return trends.map((t, i) => ({
        label: String(t.label || `P${i + 1}`),
        views: Number(t.views || 0),
        leads: Number(t.leads || 0),
      }));
    }

    const fallbackLabels =
      range === "7d"
        ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        : range === "30d"
          ? ["Week 1", "Week 2", "Week 3", "Week 4"]
          : ["Jan", "Feb", "Mar"];

    return fallbackLabels.map((label) => ({ label, views: 0, leads: 0 }));
  }, [trends, range]);

  const hasData = React.useMemo(
    () => chartData.some((t) => Number(t.views || 0) > 0 || Number(t.leads || 0) > 0),
    [chartData]
  );
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      className={cn(CARD, "seller-reveal seller-delay-1 seller-hover-card p-5 sm:p-6")}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className={typography.sectionTitle}>Market Activity Trends</h2>
          <div className="mt-3 flex flex-wrap items-center gap-6 text-sm text-slate-500">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#316249]" />
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
                  ? "bg-[#316249] text-white shadow-sm hover:bg-[#28513D]"
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
          <div className="h-[308px] w-full p-3 sm:p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 14, bottom: 6, left: 0 }}>
                <defs>
                  <linearGradient id="viewsAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#316249" stopOpacity={0.28} />
                    <stop offset="65%" stopColor="#316249" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="#316249" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e6ece8" strokeDasharray="3 6" vertical={false} opacity={0.8} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#8a96a3", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  tickMargin={10}
                />
                <YAxis
                  tick={{ fill: "#8a96a3", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => fmtCompact(Number(v || 0))}
                  tickMargin={8}
                  width={46}
                />
                <Tooltip content={<TrendTooltip />} cursor={{ stroke: "#cfd8d3", strokeDasharray: "4 6" }} />
                <Area
                  type="monotone"
                  dataKey="views"
                  name="Views"
                  stroke="#316249"
                  strokeWidth={3}
                  fill="url(#viewsAreaGradient)"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "#ffffff", fill: "#316249" }}
                  isAnimationActive={!reduceMotion}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
                <Line
                  type="monotone"
                  dataKey="leads"
                  name="Leads"
                  stroke="#ec6f8f"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "#ffffff", fill: "#ec6f8f" }}
                  isAnimationActive={!reduceMotion}
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </motion.section>
  );
}

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const views = payload.find((p) => p.name === "Views")?.value ?? payload[0]?.value ?? 0;
  const leads = payload.find((p) => p.name === "Leads")?.value ?? payload[1]?.value ?? 0;
  const safeLabel = label || "";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${safeLabel}-${String(views)}-${String(leads)}`}
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.98 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl border border-emerald-100/80 bg-white/96 px-4 py-3 shadow-[0_16px_40px_rgba(15,23,42,0.12)] backdrop-blur"
      >
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{safeLabel}</div>
        <div className="mt-2 grid gap-1 text-sm">
          <div className="flex items-center justify-between gap-6">
            <span className="inline-flex items-center gap-2 text-slate-700">
              <span className="h-2.5 w-2.5 rounded-full bg-[#316249]" />
              Views
            </span>
            <span className="font-semibold text-slate-900">{fmtNum(Number(views || 0))}</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="inline-flex items-center gap-2 text-slate-700">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              Leads
            </span>
            <span className="font-semibold text-slate-900">{fmtNum(Number(leads || 0))}</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function DistributionCard({ items }: { items: Breakdown[] }) {
  const reduceMotion = useReducedMotion();
  const palette = ["#316249", "#62b33d", "#8fd672", "#b7e59f", "#d8f1cd", "#edf8e8"];
  const sortedItems = [...items].sort((a, b) => b.count - a.count);
  const cleanItems = sortedItems
    .slice(0, 5)
    .map((item) => ({ label: titleCase(item.label), count: Number(item.count || 0) }))
    .filter((item) => item.count > 0);
  const total = cleanItems.reduce((sum, item) => sum + item.count, 0);
  const leadPct = total ? Math.round((cleanItems[0]?.count / total) * 100) : 0;
  const leadLabel = cleanItems[0]?.label || "No data";

  return (
    <section className={cn(CARD, "seller-reveal seller-delay-2 seller-hover-card h-full p-5 sm:p-6")}>
      <h2 className={typography.sectionTitle}>Property Type Distribution</h2>
      <div className="mt-5 grid gap-5 md:grid-cols-[140px_minmax(0,1fr)] md:items-center">
        <div className="flex justify-center">
          <div className="relative h-[148px] w-[148px]">
            {total > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={cleanItems}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={68}
                    paddingAngle={1.5}
                    stroke="transparent"
                    isAnimationActive={!reduceMotion}
                    animationDuration={900}
                  >
                    {cleanItems.map((entry, index) => (
                      <Cell key={`${entry.label}-${index}`} fill={palette[index % palette.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p: any = payload[0]?.payload;
                      return (
                        <div className="rounded-2xl border border-emerald-100 bg-white/95 px-4 py-3 text-sm shadow-[0_18px_50px_rgba(15,23,42,0.14)] backdrop-blur">
                          <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                            {String(p?.label || "")}
                          </div>
                          <div className="mt-2 font-semibold text-slate-900">{fmtNum(Number(p?.count || 0))}</div>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full rounded-full border border-[#eef2ef]" />
            )}

            <div className="pointer-events-none absolute inset-[34px] rounded-full bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]" />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className={typography.statValue}>
                <CountUp end={leadPct} duration={0.9} suffix="%" preserveValue />
              </div>
              <div className={`mt-1 ${typography.helperText}`}>{leadLabel}</div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {cleanItems.length ? (
            cleanItems.map((item, index) => {
              const pct = total ? Math.round((item.count / total) * 100) : 0;
              return (
                <div key={item.label} className="flex items-center justify-between gap-3 border-b border-[#edf2ef] pb-3 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="inline-block h-4 w-4 rounded-[4px]" style={{ backgroundColor: palette[index % palette.length] }} />
                    <span className={typography.tableCell}>{item.label}</span>
                  </div>
                  <span className={typography.tableCellStrong}>{pct}%</span>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-[#d9e2dc] bg-[#fafcfb] px-5 py-10 text-center text-sm text-slate-500">
              No distribution data yet.
            </div>
          )}
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
        <div className="absolute left-3 top-3 inline-flex rounded-full bg-white/22 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
          {titleCase(listing.listingType || listing.status)}
        </div>
        <div className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full bg-white/35 text-white ring-1 ring-white/55 backdrop-blur-sm transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1">
          <ArrowRight className="h-5 w-5" />
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-xl font-semibold tracking-tight text-slate-900">{listing.title}</h3>
        <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[#e3ebe6] text-[#2f4158] ring-1 ring-[#d3ddd7]">
            <MapPin className="h-4 w-4" />
          </span>
          {listing.location}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-[#f6f7f7] px-3 py-1 text-[13px] font-semibold text-slate-600">{fmtNum(listing.views)} Views</span>
          <span className="rounded-full bg-[#f6f7f7] px-3 py-1 text-[13px] font-semibold text-slate-600">{fmtNum(listing.leads)} Leads</span>
          <span className="rounded-full bg-[#f6f7f7] px-3 py-1 text-[13px] font-semibold text-slate-600">{fmtNum(listing.visits)} Visits</span>
        </div>
        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="text-xl font-semibold tracking-tight text-slate-900">{fmtCurrency(listing.price, listing.currency)}</div>
          <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1", statusTone(listing.status))}>
            {titleCase(listing.status)}
          </span>
        </div>
      </div>
    </Link>
  );
}

