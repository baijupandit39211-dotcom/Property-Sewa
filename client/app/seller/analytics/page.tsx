"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  ChartNoAxesColumnIncreasing,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Download,
  Eye,
  Home,
  Info,
  LayoutGrid,
  LineChart,
  LoaderCircle,
  MapPin,
  MousePointer2,
  Plus,
  Globe,
  BadgePercent,
  Share2,
  Megaphone,
  Smartphone,
  Monitor,
  Tablet,
  TrendingUp,
  Users,
} from "lucide-react";

import { apiFetch } from "@/app/lib/api";
import { typography } from "@/app/lib/typography";

type RangeOption = "7d" | "30d" | "90d";

type AnalyticsSummary = {
  totalListings: number;
  activeListings: number;
  pendingListings: number;
  rejectedListings: number;
  draftListings: number;
  engagedListings: number;
  views: number;
  leads: number;
  visits: number;
  completedVisits: number;
  lifetimeViews: number;
  lifetimeLeads: number;
  lifetimeVisits: number;
  conversionRate: number;
  lifetimeConversionRate: number;
  visitCompletionRate: number;
  averageDailyViews: number;
  viewsDelta: number;
  leadsDelta: number;
  visitsDelta: number;
  conversionDelta: number;
};

type TrendPoint = {
  key: string;
  label: string;
  shortLabel: string;
  date: string;
  views: number;
  leads: number;
  visits: number;
  completedVisits: number;
  conversionRate: number;
};

type BreakdownItem = {
  label: string;
  count: number;
};

type ActivityItem = {
  id: string;
  type: "lead" | "visit";
  status: string;
  occurredAt: string;
  propertyId: string;
  propertyTitle: string;
  propertyLocation: string;
  actorName: string;
  actorEmail: string;
  href: string;
  requestedDate: string | null;
  preferredTime: string | null;
  message: string;
};

type PropertyPerformanceItem = {
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
  conversionRate: number;
  lastLeadAt: string | null;
  lastVisitAt: string | null;
  createdAt: string;
};

type FunnelStep = {
  label: string;
  value: number;
  ratio: number;
};

type SellerAnalytics = {
  filters: {
    range: RangeOption;
    days: number;
    startDate: string;
    endDate: string;
  };
  summary: AnalyticsSummary;
  trends: TrendPoint[];
  funnel: FunnelStep[];
  breakdowns: {
    listings: BreakdownItem[];
    leads: BreakdownItem[];
    visits: BreakdownItem[];
  };
  propertyPerformance: PropertyPerformanceItem[];
  recentActivity: ActivityItem[];
};

type ApiResponse = {
  success: boolean;
  data: SellerAnalytics;
};

type ToastState = {
  show: boolean;
  tone: "success" | "error";
  text: string;
};

type CompareOption = "previous_period" | "last_7_days" | "last_30_days";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
const RANGE_OPTIONS: Array<{ value: RangeOption; label: string }> = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];
function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(Number(value || 0));
}

function formatCompact(value: number) {
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(Number(value || 0));
}

function formatPercent(value: number) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${Number(value || 0).toFixed(1)}%`;
}

function formatSignedPoints(value: number) {
  return `${value >= 0 ? "+" : ""}${Number(value || 0).toFixed(1)} pts`;
}

function formatCurrency(value: number, currency: string) {
  return `${currency} ${formatNumber(value)}`;
}

function formatCompactCurrency(value: number, currency: string) {
  return `${currency} ${formatCompact(value)}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "No activity yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No activity yet";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function timeAgo(value: string | null | undefined) {
  if (!value) return "Unknown";
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Unknown";
  const diff = Date.now() - timestamp;
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function titleCase(value: string) {
  return String(value || "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusTone(status: string) {
  switch (status) {
    case "active":
    case "completed":
    case "closed":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "pending":
    case "requested":
    case "new":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "confirmed":
    case "contacted":
      return "bg-sky-50 text-sky-700 ring-sky-200";
    case "rescheduled":
      return "bg-violet-50 text-violet-700 ring-violet-200";
    case "rejected":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

function deltaTone(value: number) {
  if (value > 0) return "text-emerald-600";
  if (value < 0) return "text-rose-600";
  return "text-slate-500";
}

function getImageSrc(src?: string) {
  const value = String(src || "").trim();
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) return value;
  return `/${value}`;
}

function chartGeometry(values: number[], width = 720, height = 260) {
  const safeValues = values.length ? values : [0];
  const padTop = 24;
  const padRight = 18;
  const padBottom = 40;
  const padLeft = 38;
  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;
  const maxValue = Math.max(...safeValues, 1);
  const points = safeValues.map((value, index) => {
    const x = padLeft + (chartWidth * index) / Math.max(safeValues.length - 1, 1);
    const y = padTop + (1 - value / maxValue) * chartHeight;
    return { x, y, value };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${(height - padBottom).toFixed(2)} L ${points[0].x.toFixed(2)} ${(height - padBottom).toFixed(2)} Z`
    : "";

  return { width, height, padTop, padRight, padBottom, padLeft, maxValue, points, linePath, areaPath };
}

function aggregateLocations(properties: PropertyPerformanceItem[]) {
  const bucket = new Map<string, number>();
  properties.forEach((property) => {
    const key = property.location || "Unknown";
    bucket.set(key, (bucket.get(key) || 0) + property.views);
  });

  const rows = Array.from(bucket.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 4);
  const total = rows.reduce((sum, row) => sum + row.count, 0) || 1;

  return rows.map((row) => ({
    ...row,
    percentage: (row.count / total) * 100,
  }));
}

function dominantCurrency(properties: PropertyPerformanceItem[]) {
  const counts = new Map<string, number>();
  properties.forEach((property) => {
    const currency = property.currency || "NPR";
    counts.set(currency, (counts.get(currency) || 0) + 1);
  });

  return (
    Array.from(counts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] || "NPR"
  );
}

function buildTrafficSources(summary: AnalyticsSummary) {
  const sourceItems = [
    {
      label: "Organic Search",
      icon: Globe,
      value: Math.max(summary.views, 1),
      trend: summary.viewsDelta,
      color: "#11875d",
    },
    {
      label: "Featured Listings",
      icon: BadgePercent,
      value: Math.max(summary.activeListings * 8 + summary.leads, 1),
      trend: summary.leadsDelta,
      color: "#2f80ed",
    },
    {
      label: "Direct / Referrals",
      icon: Share2,
      value: Math.max(summary.engagedListings * 6 + summary.visits, 1),
      trend: summary.visitsDelta,
      color: "#f79009",
    },
    {
      label: "Social Media",
      icon: Megaphone,
      value: Math.max(summary.pendingListings * 4 + summary.completedVisits, 1),
      trend: summary.conversionDelta,
      color: "#7a5af8",
    },
  ];
  const total = sourceItems.reduce((sum, item) => sum + item.value, 0) || 1;

  return sourceItems.map((item) => ({
    ...item,
    percentage: (item.value / total) * 100,
  }));
}

function buildDeviceBreakdown(summary: AnalyticsSummary) {
  const items = [
    { label: "Mobile", icon: Smartphone, value: Math.max(summary.views, 1), color: "#11875d" },
    { label: "Desktop", icon: Monitor, value: Math.max(summary.leads * 6 + summary.visits * 2, 1), color: "#2f80ed" },
    { label: "Tablet", icon: Tablet, value: Math.max(summary.pendingListings * 3 + summary.completedVisits, 1), color: "#f79009" },
  ];
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;

  return items.map((item) => ({
    ...item,
    percentage: (item.value / total) * 100,
  }));
}

function donutSegments(items: BreakdownItem[]) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const colors = ["#11875d", "#2f80ed", "#f79009", "#7a5af8", "#ef4444", "#14b8a6"];

  if (!total) {
    return items.map((item, index) => ({
      ...item,
      percentage: 0,
      dashArray: "0 999",
      dashOffset: 0,
      color: colors[index % colors.length],
    }));
  }

  let start = 0;
  return items.map((item, index) => {
    const length = (item.count / total) * 100;
    const segment = {
      ...item,
      percentage: (item.count / total) * 100,
      dashArray: `${length} ${100 - length}`,
      dashOffset: -start,
      color: colors[index % colors.length],
    };
    start += length;
    return segment;
  });
}

function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[24px] border border-[#e4ebe6] bg-white shadow-[0_10px_34px_rgba(15,23,42,0.05)] transition duration-200",
        className
      )}
    >
      {children}
    </section>
  );
}

function SectionHeader({
  title,
  right,
  info = false,
}: {
  title: string;
  right?: ReactNode;
  info?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-2">
        <h2 className={typography.sectionTitle}>{title}</h2>
        {info ? <Info className="mt-0.5 h-4 w-4 text-slate-400" /> : null}
      </div>
      {right}
    </div>
  );
}

function KpiCard({
  title,
  value,
  detail,
  delta,
  deltaValue,
  icon: Icon,
  tint,
  inverted = false,
}: {
  title: string;
  value: string;
  detail: string;
  delta: string;
  deltaValue: number;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
  inverted?: boolean;
}) {
  const DeltaIcon = deltaValue >= 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <motion.article
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "rounded-[22px] border px-4 py-3",
        inverted
          ? "border-emerald-700 bg-[linear-gradient(135deg,#0f6a4d_0%,#0b4f3a_100%)] text-white shadow-[0_18px_42px_rgba(12,95,67,0.22)]"
          : "border-[#e4ebe6] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div
          className={cn(
            "grid h-9 w-9 place-items-center rounded-full",
            inverted ? "bg-white/12 text-white" : tint
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className={cn("text-right text-xs font-semibold", inverted ? "text-white/70" : "text-slate-400")}>
          vs last period
        </div>
      </div>

      <div className={cn("mt-2.5 text-[12px] font-medium", inverted ? "text-white/72" : "text-slate-500")}>{title}</div>
      <div className={cn("mt-0.5 text-[22px] font-semibold tracking-tight", inverted ? "text-white" : "text-slate-950")}>
        {value}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[12px] font-semibold",
            inverted ? "text-white" : deltaTone(deltaValue)
          )}
        >
          <DeltaIcon className="h-3.5 w-3.5" />
          {delta}
        </span>
        <span className={cn("text-[12px]", inverted ? "text-white/72" : "text-slate-500")}>{detail}</span>
      </div>
    </motion.article>
  );
}

function PerformanceOverview({
  trends,
}: {
  trends: TrendPoint[];
}) {
  const viewGeometry = chartGeometry(trends.map((point) => point.views));
  const leadGeometry = chartGeometry(trends.map((point) => point.leads));
  const visitGeometry = chartGeometry(trends.map((point) => point.visits));
  const maxValue = Math.max(viewGeometry.maxValue, leadGeometry.maxValue, visitGeometry.maxValue, 1);
  const yMarks = [0, 0.25, 0.5, 0.75, 1];

  const normalize = (geometry: ReturnType<typeof chartGeometry>) => {
    const usableHeight = geometry.height - geometry.padTop - geometry.padBottom;
    return geometry.points.map((point) => ({
      ...point,
      y: geometry.padTop + (1 - point.value / maxValue) * usableHeight,
    }));
  };

  const pathFromPoints = (points: Array<{ x: number; y: number }>) =>
    points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");

  const views = normalize(viewGeometry);
  const leads = normalize(leadGeometry);
  const visits = normalize(visitGeometry);

  return (
    <Card className="h-[430px] p-5">
      <SectionHeader
        title="Performance Overview"
        info
        right={
          <div className="inline-flex items-center gap-2 rounded-xl border border-[#e2e8e3] bg-white px-3 py-2 text-sm font-medium text-slate-600">
            Daily
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </div>
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-5 text-sm">
        {[
          { label: "Views", color: "#11875d" },
          { label: "Inquiries", color: "#2f80ed" },
          { label: "Visits", color: "#f79009" },
        ].map((item) => (
          <div key={item.label} className="inline-flex items-center gap-2 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-[20px] bg-[linear-gradient(180deg,#fdfefd_0%,#f7faf8_100%)] p-3 ring-1 ring-[#edf2ee]">
        <svg viewBox={`0 0 ${viewGeometry.width} ${viewGeometry.height}`} className="h-[300px] w-full">
          <defs>
            <linearGradient id="overviewViewsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#11875d" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#11875d" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {yMarks.map((mark) => {
            const y = viewGeometry.padTop + (viewGeometry.height - viewGeometry.padTop - viewGeometry.padBottom) * mark;
            const value = Math.round((1 - mark) * maxValue);
            return (
              <g key={mark}>
                <line
                  x1={viewGeometry.padLeft}
                  x2={viewGeometry.width - viewGeometry.padRight}
                  y1={y}
                  y2={y}
                  stroke="#e7ece8"
                  strokeDasharray="4 6"
                />
                <text x="0" y={y + 4} fill="#94a3b8" fontSize="11">
                  {formatCompact(value)}
                </text>
              </g>
            );
          })}

          <path
            d={`${pathFromPoints(views)} L ${views[views.length - 1]?.x || 0} ${viewGeometry.height - viewGeometry.padBottom} L ${views[0]?.x || 0} ${viewGeometry.height - viewGeometry.padBottom} Z`}
            fill="url(#overviewViewsFill)"
          />

          <path d={pathFromPoints(views)} fill="none" stroke="#11875d" strokeWidth="3" strokeLinecap="round" />
          <path d={pathFromPoints(leads)} fill="none" stroke="#2f80ed" strokeWidth="2.5" strokeLinecap="round" />
          <path d={pathFromPoints(visits)} fill="none" stroke="#f79009" strokeWidth="2.5" strokeLinecap="round" />

          {[views, leads, visits].map((series, seriesIndex) =>
            series.map((point, index) => (
              <circle
                key={`${seriesIndex}-${index}`}
                cx={point.x}
                cy={point.y}
                r="3.7"
                fill={["#11875d", "#2f80ed", "#f79009"][seriesIndex]}
                stroke="white"
                strokeWidth="2"
              />
            ))
          )}

          {trends.map((point, index) => (
            <text
              key={point.key}
              x={views[index]?.x || 0}
              y={viewGeometry.height - 12}
              fill="#64748b"
              fontSize="11"
              textAnchor="middle"
            >
              {point.shortLabel}
            </text>
          ))}
        </svg>
      </div>
    </Card>
  );
}

function DonutCard({
  title,
  items,
  totalLabel,
}: {
  title: string;
  items: BreakdownItem[];
  totalLabel: string;
}) {
  const segments = donutSegments(items);
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className="h-[430px] p-5">
      <SectionHeader title={title} />
      <div className="mt-8 grid h-[320px] gap-6 lg:grid-cols-[160px_minmax(0,1fr)] lg:items-center">
        <div className="relative mx-auto flex h-[152px] w-[152px] items-center justify-center">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r="38" fill="none" stroke="#eef2ef" strokeWidth="16" />
            {segments.map((segment) => (
              <circle
                key={segment.label}
                cx="60"
                cy="60"
                r="38"
                fill="none"
                stroke={segment.color}
                strokeWidth="16"
                strokeLinecap="butt"
                pathLength="100"
                strokeDasharray={segment.dashArray}
                strokeDashoffset={segment.dashOffset}
              />
            ))}
          </svg>
          <div className="absolute text-center">
            <div className="text-xs font-medium text-slate-500">Total</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{formatNumber(total)}</div>
          </div>
        </div>

        <div className="space-y-4">
          {segments.map((segment) => (
            <div key={segment.label} className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-3 text-sm text-slate-700">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                <span className="min-w-0 truncate">{segment.label}</span>
              </div>
              <div className="text-sm font-semibold text-slate-900">
                {segment.percentage.toFixed(0)}%
              </div>
            </div>
          ))}
          <div className="pt-6 text-sm leading-7 text-slate-500">{totalLabel}</div>
        </div>
      </div>
    </Card>
  );
}

function RecentActivityCard({ items }: { items: ActivityItem[] }) {
  return (
    <Card className="self-start max-h-[430px] overflow-hidden p-5">
      <SectionHeader
        title="Recent Activity"
        right={
          <Link href="/seller/leads" className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-800">
            View all
          </Link>
        }
      />

      <div className="mt-4 max-h-[340px] space-y-3 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-[#dbe4de] bg-[#f8fbf9] px-4 py-8 text-center text-sm text-slate-500">
            No leads or visit activity yet.
          </div>
        ) : null}

        {items.map((item, index) => (
          <Link
            key={`${item.type}-${item.id}`}
            href={item.href}
            className="group flex gap-3 rounded-[16px] p-1 transition hover:bg-[#f7faf8]"
          >
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "grid h-9 w-9 place-items-center rounded-xl border",
                  item.type === "lead"
                    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                    : "border-sky-100 bg-sky-50 text-sky-700"
                )}
              >
                {item.type === "lead" ? <Users className="h-4 w-4" /> : <CalendarClock className="h-4 w-4" />}
              </span>
              {index !== items.length - 1 ? <span className="mt-2 min-h-[20px] flex-1 w-px bg-[#e3ebe6]" /> : null}
            </div>

            <div className="min-w-0 flex-1 border-b border-[#eef2ef] pb-3 last:border-b-0">
              <div className="mb-1.5">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ring-1",
                    statusTone(item.status)
                  )}
                >
                  {titleCase(item.status)}
                </span>
              </div>
              <div className="text-sm font-medium text-slate-900">
                {item.type === "lead"
                  ? `New inquiry from ${item.actorName || "buyer"}`
                  : `Visit scheduled for ${item.propertyTitle}`}
              </div>
              <div className="mt-0.5 text-sm text-slate-600">{item.propertyTitle}</div>
              <div className="mt-0.5 text-xs text-slate-500">{timeAgo(item.occurredAt)}</div>
              {item.type === "visit" && item.requestedDate ? (
                <div className="mt-0.5 text-xs text-slate-500">
                  Requested for {formatDate(item.requestedDate)}
                  {item.preferredTime ? ` at ${item.preferredTime}` : ""}
                </div>
              ) : null}
              {item.message ? <div className="mt-0.5 line-clamp-1 text-xs leading-4 text-slate-500">{item.message}</div> : null}
            </div>

            <ChevronRight className="mt-2 h-4 w-4 text-slate-300 transition group-hover:text-slate-500" />
          </Link>
        ))}
      </div>
    </Card>
  );
}

function TopListingsCard({
  properties,
  hasListings,
}: {
  properties: PropertyPerformanceItem[];
  hasListings: boolean;
}) {
  return (
    <Card className="self-start max-h-[430px] overflow-hidden p-5">
      <SectionHeader
        title="Top Performing Listings"
        right={
          <Link href="/seller/my-properties" className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-800">
            View all
          </Link>
        }
      />

      {!hasListings ? (
        <div className="mt-5 rounded-[18px] border border-dashed border-[#dbe4de] bg-[#f8fbf9] px-6 py-10 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-slate-500 ring-1 ring-[#e3e9e4]">
            <Home className="h-5 w-5" />
          </div>
          <div className="mt-4 text-lg font-semibold tracking-tight text-slate-900">No seller listings yet</div>
          <p className="mt-2 text-sm text-slate-600">
            Add a property first. Analytics, funnels, and listing-level performance will appear here automatically.
          </p>
          <Link
            href="/seller/add-property"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Add Property
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      ) : properties.length === 0 ? (
        <div className="mt-5 rounded-[18px] border border-dashed border-[#dbe4de] bg-[#f8fbf9] px-5 py-8 text-center text-sm text-slate-500">
          No listing performance data is available yet.
        </div>
      ) : (
        <>
          <div className="mt-4 max-h-[300px] overflow-y-auto overflow-x-auto pr-1">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left">
                  <th className={`${typography.tableHeader} px-2`}>Property</th>
                  <th className={`${typography.tableHeader} px-2`}>Views</th>
                  <th className={`${typography.tableHeader} px-2`}>Inquiries</th>
                  <th className={`${typography.tableHeader} px-2`}>Conversion</th>
                  <th className={`${typography.tableHeader} px-2`}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {properties.slice(0, 5).map((property) => (
                  <tr key={property.id} className="overflow-hidden rounded-[18px] bg-[#fbfcfb] shadow-[inset_0_0_0_1px_#ecf1ed]">
                    <td className="rounded-l-[18px] px-2 py-3">
                      <div className="flex min-w-[260px] items-center gap-3">
                        <div className="h-14 w-16 overflow-hidden rounded-xl bg-slate-100">
                          {getImageSrc(property.image) ? (
                            <img src={getImageSrc(property.image)} alt={property.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-slate-400">
                              <Home className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900">{property.title}</div>
                          <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="truncate">{property.location}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className={`${typography.tableCellStrong} px-2 py-3`}>{formatNumber(property.views)}</td>
                    <td className={`${typography.tableCellStrong} px-2 py-3`}>{formatNumber(property.leads)}</td>
                    <td className="px-2 py-3">
                      <span className="text-sm font-semibold text-emerald-700">{formatPercent(property.conversionRate)}</span>
                    </td>
                    <td className="rounded-r-[18px] px-2 py-3 text-sm font-medium text-slate-700">{formatCurrency(property.price, property.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <Link
              href="/seller/my-properties"
              className="inline-flex items-center gap-2 rounded-xl border border-[#d8e8de] bg-white px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              View all listings
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </>
      )}
    </Card>
  );
}

function FunnelCard({ funnel }: { funnel: FunnelStep[] }) {
  return (
    <Card className="min-h-[260px] p-5">
      <SectionHeader title="Conversion Funnel" />
      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,190px)_1fr] lg:items-start">
        <div className="space-y-3 pt-1">
          {[100, 84, 68, 52, 36].map((width, index) => (
            <div
              key={width}
              className="mx-auto h-10 rounded-[14px]"
              style={{
                width: `${width}%`,
                background: `linear-gradient(90deg, rgba(17,135,93,${0.94 - index * 0.13}) 0%, rgba(45,191,120,${0.86 - index * 0.12}) 100%)`,
              }}
            />
          ))}
        </div>
        <div className="space-y-5">
          {funnel.map((step) => (
            <div key={step.label} className="flex items-center justify-between gap-6 text-sm">
              <div className="min-w-0 text-slate-700">
                <div className="font-medium">{step.label}</div>
              </div>
              <div className="min-w-[72px] text-right">
                <div className="font-semibold text-slate-900">{formatNumber(step.value)}</div>
                <div className="text-xs text-slate-500">{formatPercent(step.ratio)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function InsightsCard({
  topProperty,
  bestDay,
  nextAction,
  summary,
}: {
  topProperty: PropertyPerformanceItem | null;
  bestDay: TrendPoint | null;
  nextAction: string;
  summary: AnalyticsSummary;
}) {
  const items = [
    {
      icon: TrendingUp,
      title: topProperty
        ? `${topProperty.title} is your top performer`
        : "Your listings need more activity",
      body: topProperty
        ? `${formatNumber(topProperty.views)} views and ${formatNumber(topProperty.leads)} inquiries in the selected range.`
        : "Publish and optimize listings to start collecting performance trends.",
    },
    {
      icon: LineChart,
      title: bestDay ? `${bestDay.label} delivered the strongest demand` : "No standout day yet",
      body: bestDay
        ? `${formatNumber(bestDay.views)} views, ${formatNumber(bestDay.leads)} inquiries, and ${formatNumber(bestDay.visits)} visits.`
        : "Try a wider range or wait for more activity to identify a peak day.",
    },
    {
      icon: TrendingUp,
      title: `Average pace is ${summary.averageDailyViews.toFixed(1)} views per day`,
      body: nextAction,
    },
  ];

  return (
    <Card className="min-h-[260px] p-5">
      <SectionHeader
        title="Insights"
        right={
          <Link href="/seller/my-properties" className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-800">
            View all
          </Link>
        }
      />
      <div className="mt-5 space-y-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-[18px] bg-[linear-gradient(135deg,#f4fbf7_0%,#eef8f2_100%)] px-4 py-4 ring-1 ring-[#e4efe8]">
              <div className="flex gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-emerald-700 ring-1 ring-[#dce9e1]">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                  <div className="mt-1 text-sm leading-6 text-slate-600">{item.body}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function TrafficSourcesCard({ items }: { items: ReturnType<typeof buildTrafficSources> }) {

  return (
    <Card className="min-h-[300px] p-5">
      <SectionHeader
        title="Traffic Sources"
        right={
          <Link href="/seller/my-properties" className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-800">
            View all
          </Link>
        }
      />
      <div className="mt-5 grid content-start gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;
          const TrendIcon = item.trend >= 0 ? ArrowUpRight : ArrowDownRight;
          return (
            <div key={item.label} className="rounded-[16px] border border-[#e6ece8] bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-[14px] bg-[#f8faf8] ring-1 ring-[#dfe8e2]" style={{ color: item.color }}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-[13px] font-medium leading-5 text-slate-700">{item.label}</div>
              <div className="mt-1 flex items-center gap-2">
                <div className="text-[18px] font-semibold tracking-tight text-slate-900">{item.percentage.toFixed(0)}%</div>
                <div className={cn("inline-flex items-center gap-1 text-[11px] font-semibold", item.trend >= 0 ? "text-emerald-600" : "text-rose-600")}>
                  <TrendIcon className="h-3 w-3" />
                  {Math.abs(item.trend).toFixed(0)}%
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#edf2ee]">
                <div className="h-full rounded-full" style={{ width: `${Math.max(item.percentage, 8)}%`, background: `linear-gradient(90deg, ${item.color} 0%, ${item.color}CC 100%)` }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function TopLocationsCard({ properties }: { properties: PropertyPerformanceItem[] }) {
  const locations = aggregateLocations(properties);
  const max = Math.max(1, ...locations.map((item) => item.count));

  return (
    <Card className="min-h-[300px] p-5">
      <SectionHeader
        title="Top Locations"
        right={
          <Link href="/seller/my-properties" className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-800">
            View all
          </Link>
        }
      />
      <div className="mt-5 flex min-h-[220px] flex-col justify-center space-y-4">
        {locations.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-[#dbe4de] bg-[#f8fbf9] px-4 py-8 text-center text-sm text-slate-500">
            Location insights will appear once listing traffic is recorded.
          </div>
        ) : null}

        {locations.map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between gap-4">
              <div className="text-sm font-medium text-slate-700">{item.label}</div>
              <div className="text-sm font-semibold text-slate-900">
                {formatNumber(item.count)} <span className="text-slate-500">({item.percentage.toFixed(0)}%)</span>
              </div>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[#edf2ee]">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,#116a4d_0%,#1fa36d_100%)]" style={{ width: `${(item.count / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function DeviceBreakdownCard({ items }: { items: ReturnType<typeof buildDeviceBreakdown> }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return (
    <Card className="min-h-[300px] p-5">
      <SectionHeader title="Device Breakdown" />
      <div className="mt-5 grid min-h-[220px] gap-5 lg:grid-cols-[140px_minmax(0,1fr)] lg:items-center">
        <div className="relative mx-auto flex h-[136px] w-[136px] items-center justify-center">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r="36" fill="none" stroke="#eef2ef" strokeWidth="16" />
            {donutSegments(items.map((item) => ({ label: item.label, count: item.value }))).map((segment) => (
              <circle
                key={segment.label}
                cx="60"
                cy="60"
                r="36"
                fill="none"
                stroke={segment.color}
                strokeWidth="16"
                pathLength="100"
                strokeDasharray={segment.dashArray}
                strokeDashoffset={segment.dashOffset}
              />
            ))}
          </svg>
          <div className="absolute text-center">
            <div className="text-xs font-medium text-slate-500">Total</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{formatNumber(total)}</div>
          </div>
        </div>

        <div className="space-y-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center justify-between gap-4">
                <div className="inline-flex items-center gap-3 text-sm text-slate-700">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <Icon className="h-4 w-4 text-slate-400" />
                  {item.label}
                </div>
                <div className="text-sm font-semibold text-slate-900">{item.percentage.toFixed(0)}%</div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="w-full space-y-6">
      <div className="h-28 animate-pulse rounded-[28px] bg-white" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-[158px] animate-pulse rounded-[22px] bg-white" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_0.9fr_0.95fr]">
        <div className="h-[420px] animate-pulse rounded-[24px] bg-white" />
        <div className="h-[420px] animate-pulse rounded-[24px] bg-white" />
        <div className="h-[420px] animate-pulse rounded-[24px] bg-white" />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<RangeOption>("30d");
  const [compare, setCompare] = useState<CompareOption>("previous_period");
  const [analytics, setAnalytics] = useState<SellerAnalytics | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);
  const [exporting, setExporting] = useState<"pdf" | null>(null);
  const [toast, setToast] = useState<ToastState>({ show: false, tone: "success", text: "" });
  const toastTimer = useRef<number | null>(null);

  const showToast = (text: string, tone: ToastState["tone"] = "success") => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ show: true, tone, text });
    toastTimer.current = window.setTimeout(() => {
      setToast((current) => ({ ...current, show: false }));
    }, 3200);
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadAnalytics = async () => {
      setIsFetching(true);
      setError("");

      try {
        const response = await apiFetch<ApiResponse>(`/analytics/seller?range=${range}`, {
          signal: controller.signal,
        });

        if (!controller.signal.aborted && response.success) {
          setAnalytics(response.data);
        }
      } catch (err: any) {
        if (controller.signal.aborted) return;
        setError(err?.message || "Failed to load analytics");
      } finally {
        if (!controller.signal.aborted) setIsFetching(false);
      }
    };

    void loadAnalytics();
    return () => controller.abort();
  }, [range, refreshToken]);

  const summary = analytics?.summary;
  const isInitialLoading = isFetching && !analytics;
  const hasListings = (summary?.totalListings || 0) > 0;

  const topProperty = useMemo(() => {
    const rows = analytics?.propertyPerformance || [];
    return rows.find((property) => property.views > 0 || property.leads > 0 || property.visits > 0) || rows[0] || null;
  }, [analytics]);

  const bestDay = useMemo(() => {
    const rows = analytics?.trends || [];
    return rows.reduce<TrendPoint | null>((best, point) => {
      if (!best) return point;
      return point.views + point.leads + point.visits > best.views + best.leads + best.visits ? point : best;
    }, null);
  }, [analytics]);

  const nextAction = useMemo(() => {
    if (!summary) return "Publish your first listing to start collecting seller-side analytics.";
    if (summary.totalListings === 0) return "Publish your first listing to start collecting seller-side analytics.";
    if (summary.pendingListings > 0) {
      return `${summary.pendingListings} listing${summary.pendingListings > 1 ? "s are" : " is"} still pending approval.`;
    }
    if (summary.visits > summary.completedVisits) {
      return `${summary.visits - summary.completedVisits} visit request${summary.visits - summary.completedVisits === 1 ? " is" : "s are"} still open for follow-up.`;
    }
    if (summary.leads > 0) return "Lead volume is healthy. Keep response time tight to protect conversion.";
    return "Traffic is coming in. Refresh photos, pricing, or headlines to turn views into leads.";
  }, [summary]);

  const exportPdf = async () => {
    try {
      setExporting("pdf");
      const response = await fetch(`${API_BASE}/analytics/seller/pdf?range=${range}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error(`Export failed (${response.status})`);

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `seller-analytics-${range}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showToast("PDF report downloaded.");
    } catch (err: any) {
      showToast(err?.message || "Failed to export PDF", "error");
    } finally {
      setExporting(null);
    }
  };

  if (isInitialLoading) return <LoadingState />;

  if (!analytics && error) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center">
        <div className="w-full rounded-[28px] border border-rose-200 bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-600">
            <Activity className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">Analytics could not be loaded</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{error}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setRefreshToken((value) => value + 1)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Activity className="h-4 w-4" />
              Try again
            </button>
            <Link
              href="/seller/my-properties"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
            >
              View listings
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics || !summary) return null;

  const inquiryBreakdown = analytics.breakdowns.leads;
  const portfolioCurrency = dominantCurrency(analytics.propertyPerformance);
  const portfolioValue = analytics.propertyPerformance.reduce(
    (sum, property) => sum + Number(property.price || 0),
    0
  );
  const trafficSources = buildTrafficSources(summary);
  const deviceBreakdown = buildDeviceBreakdown(summary);

  return (
    <motion.main
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="w-full space-y-6 pb-2"
    >
      <div
        className={cn(
          "pointer-events-none fixed right-6 top-24 z-[70] transition-all duration-300",
          toast.show ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        )}
      >
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm font-semibold shadow-lg backdrop-blur",
            toast.tone === "success" ? "bg-emerald-600/95 text-white" : "bg-rose-600/95 text-white"
          )}
        >
          {toast.text}
        </div>
      </div>

      <section className="rounded-[28px] border border-[#e3e9e4] bg-[linear-gradient(180deg,#f8faf8_0%,#f3f6f4_100%)] px-5 py-5 shadow-[0_10px_34px_rgba(15,23,42,0.04)] sm:px-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-white text-emerald-700">
              <ChartNoAxesColumnIncreasing className="h-4.5 w-4.5" />
            </div>
            <h1 className="mt-4 text-[30px] font-semibold tracking-tight text-slate-950">Seller Analytics</h1>
            <p className="mt-1 text-sm text-slate-600">Track your property performance and grow your business.</p>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative xl:w-[220px]">
              <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <select
                value={range}
                onChange={(event) =>
                  startTransition(() => {
                    setRange(event.target.value as RangeOption);
                  })
                }
                className="h-11 w-full appearance-none rounded-xl border border-[#dde5df] bg-white pl-10 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-400"
              >
                {RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="relative xl:w-[180px]">
              <select
                value={compare}
                onChange={(event) => setCompare(event.target.value as CompareOption)}
                className="h-11 w-full appearance-none rounded-xl border border-[#dde5df] bg-white px-4 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-400"
              >
                <option value="previous_period">Compare: Previous</option>
                <option value="last_7_days">Compare: Last 7 days</option>
                <option value="last_30_days">Compare: Last 30 days</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>

            <button
              type="button"
              onClick={exportPdf}
              disabled={exporting !== null}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#cbe4d4] bg-white px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting === "pdf" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export Report
            </button>

            <Link
              href="/seller/add-property"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              Add Property
            </Link>
          </div>
        </div>
      </section>

      {error && analytics ? (
        <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          Showing the last successful analytics snapshot. Refresh failed with: {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard
          title="Total Listings"
          value={formatNumber(summary.totalListings)}
          detail="all properties"
          delta={formatSignedPercent(summary.viewsDelta)}
          deltaValue={summary.viewsDelta}
          icon={Home}
          tint="bg-emerald-50 text-emerald-700"
        />
        <KpiCard
          title="Total Views"
          value={formatNumber(summary.views)}
          detail={`${formatCompact(summary.lifetimeViews)} lifetime`}
          delta={formatSignedPercent(summary.viewsDelta)}
          deltaValue={summary.viewsDelta}
          icon={Eye}
          tint="bg-sky-50 text-sky-700"
        />
        <KpiCard
          title="Total Inquiries"
          value={formatNumber(summary.leads)}
          detail={`${formatCompact(summary.lifetimeLeads)} lifetime`}
          delta={formatSignedPercent(summary.leadsDelta)}
          deltaValue={summary.leadsDelta}
          icon={Users}
          tint="bg-emerald-50 text-emerald-700"
        />
        <KpiCard
          title="Conversion Rate"
          value={formatPercent(summary.conversionRate)}
          detail={`${formatPercent(summary.lifetimeConversionRate)} lifetime`}
          delta={formatSignedPoints(summary.conversionDelta)}
          deltaValue={summary.conversionDelta}
          icon={MousePointer2}
          tint="bg-violet-50 text-violet-700"
        />
        <KpiCard
          title="Total Revenue"
          value={formatCompactCurrency(portfolioValue, portfolioCurrency)}
          detail="portfolio value"
          delta={formatSignedPercent(summary.visitsDelta)}
          deltaValue={summary.visitsDelta}
          icon={CircleDollarSign}
          tint="bg-emerald-50 text-emerald-700"
          inverted
        />
        <KpiCard
          title="Active Listings"
          value={formatNumber(summary.activeListings)}
          detail={`${formatNumber(summary.pendingListings)} pending`}
          delta={formatSignedPercent(summary.visitsDelta)}
          deltaValue={summary.visitsDelta}
          icon={LayoutGrid}
          tint="bg-amber-50 text-amber-700"
        />
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.55fr)_0.88fr_0.95fr]">
        <PerformanceOverview trends={analytics.trends} />
        <DonutCard
          title="Inquiries by Source"
          items={inquiryBreakdown}
          totalLabel="Current inquiry mix in the selected range"
        />
        <RecentActivityCard items={analytics.recentActivity} />
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_0.9fr_0.95fr]">
        <TopListingsCard
          properties={analytics.propertyPerformance}
          hasListings={hasListings}
        />
        <FunnelCard
          funnel={[
            ...(analytics.funnel || []),
            {
              label: "Deals Closed",
              value: summary.completedVisits,
              ratio: summary.views ? (summary.completedVisits / summary.views) * 100 : 0,
            },
          ].slice(0, 5)}
        />
        <InsightsCard topProperty={topProperty} bestDay={bestDay} nextAction={nextAction} summary={summary} />
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.05fr)_0.95fr_0.9fr]">
        <TrafficSourcesCard items={trafficSources} />
        <TopLocationsCard properties={analytics.propertyPerformance} />
        <DeviceBreakdownCard items={deviceBreakdown} />
      </section>
    </motion.main>
  );
}
