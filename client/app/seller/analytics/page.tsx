"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";
const AUTO_REFRESH_MS = 60_000;
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

function chartGeometry(values: number[], width = 720, height = 260, maxScale?: number) {
  const safeValues = values.length ? values : [0];
  const padTop = 24;
  const padRight = 18;
  const padBottom = 52;
  const padLeft = 48;
  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;
  const maxValue = Math.max(maxScale ?? Math.max(...safeValues, 0), 1);
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

function hasTrendData(trends: TrendPoint[]) {
  return trends.some((point) => point.views > 0 || point.leads > 0 || point.visits > 0);
}

function formatAxisLabel(value: number) {
  if (Number.isInteger(value)) return formatCompact(value);
  return value.toFixed(1).replace(/\.0$/, "");
}

function getChartAxisConfig(maxValue: number) {
  if (maxValue <= 1) {
    return { axisMax: 1, ticks: [0, 0.5, 1] };
  }

  if (maxValue <= 2) {
    return { axisMax: 2, ticks: [0, 1, 2] };
  }

  if (maxValue <= 5) {
    return { axisMax: 5, ticks: [0, 1, 2, 3, 4, 5] };
  }

  const roughStep = maxValue / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;
  const niceStep = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = niceStep * magnitude;
  const axisMax = Math.ceil(maxValue / step) * step;

  return {
    axisMax,
    ticks: Array.from({ length: 5 }, (_, index) => (axisMax * index) / 4),
  };
}

function getChartXAxisLabels(trends: TrendPoint[], sparseData: boolean) {
  if (trends.length <= 7) {
    return trends.map((point) => point.label);
  }

  const targetCount = sparseData ? 6 : 7;
  const step = Math.max(1, Math.ceil((trends.length - 1) / Math.max(targetCount - 1, 1)));

  return trends.map((point, index) => {
    const shouldShow =
      index === 0 ||
      index === trends.length - 1 ||
      index % step === 0;

    if (!shouldShow) return "";
    return sparseData ? point.label : point.shortLabel || point.label;
  });
}

function smoothPathFromPoints(points: Array<{ x: number; y: number }>) {
  if (points.length <= 1) {
    return points.length ? `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}` : "";
  }

  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const controlX = ((current.x + next.x) / 2).toFixed(2);

    path += ` C ${controlX} ${current.y.toFixed(2)}, ${controlX} ${next.y.toFixed(2)}, ${next.x.toFixed(2)} ${next.y.toFixed(2)}`;
  }

  return path;
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
  headerText = "vs last period",
  footer,
}: {
  title: string;
  value: string;
  detail: string;
  delta: string;
  deltaValue: number;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
  inverted?: boolean;
  headerText?: string;
  footer?: ReactNode;
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
          {headerText}
        </div>
      </div>

      <div className={cn("mt-2.5 text-[12px] font-medium", inverted ? "text-white/72" : "text-slate-500")}>{title}</div>
      <div className={cn("mt-0.5 text-[22px] font-semibold tracking-tight", inverted ? "text-white" : "text-slate-950")}>
        {value}
      </div>
      {footer ? (
        <div className={cn("mt-2 text-[12px]", inverted ? "text-white/72" : "text-slate-500")}>{footer}</div>
      ) : (
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
      )}
    </motion.article>
  );
}

function PerformanceOverview({
  trends,
}: {
  trends: TrendPoint[];
}) {
  const trendSeries = [
    {
      key: "views" as const,
      label: "Views",
      color: "#11875d",
      strokeWidth: 2.8,
      values: trends.map((point) => point.views),
    },
    {
      key: "leads" as const,
      label: "Inquiries",
      color: "#2f80ed",
      strokeWidth: 2.4,
      values: trends.map((point) => point.leads),
    },
    {
      key: "visits" as const,
      label: "Visits",
      color: "#f79009",
      strokeWidth: 2.4,
      values: trends.map((point) => point.visits),
    },
  ];
  const hasAnyTrendData = hasTrendData(trends);
  const visibleSeries = trendSeries.filter((series) => series.values.some((value) => value > 0));
  const seriesMax = Math.max(...trendSeries.flatMap((series) => series.values), 0);
  const { axisMax, ticks } = getChartAxisConfig(seriesMax);
  const isSparseData = seriesMax <= 2;
  const xAxisLabels = getChartXAxisLabels(trends, isSparseData);
  const baseGeometry = chartGeometry(trendSeries[0].values, 720, 260, axisMax);
  const seriesGeometry = trendSeries.map((series) => ({
    ...series,
    geometry: chartGeometry(series.values, 720, 260, axisMax),
  }));
  const chartBottom = baseGeometry.height - baseGeometry.padBottom;

  return (
    <Card className="h-[430px] p-5">
      <SectionHeader
        title="Performance Overview"
        info
        right={
          <div
            className="inline-flex items-center gap-2 rounded-xl border border-[#e2e8e3] bg-[#f8faf8] px-3 py-2 text-sm font-medium text-slate-500"
            aria-label="Chart granularity"
            title="Daily view"
          >
            Daily view
          </div>
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-6 text-[13px]">
        {trendSeries.map((series) => {
          const active = visibleSeries.some((item) => item.key === series.key);
          return (
            <div
              key={series.key}
              className={cn("inline-flex items-center gap-2.5 transition", active ? "text-slate-600" : "text-slate-400")}
            >
              <span
                className={cn("h-2.5 w-2.5 rounded-full ring-2 ring-white", active ? "opacity-100" : "opacity-35")}
                style={{ backgroundColor: series.color }}
              />
              {series.label}
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-[22px] bg-[linear-gradient(180deg,#ffffff_0%,#f7faf8_100%)] p-4 ring-1 ring-[#edf2ee]">
        {hasAnyTrendData ? (
          <svg viewBox={`0 0 ${baseGeometry.width} ${baseGeometry.height}`} className="h-[300px] w-full">
            <defs>
              <linearGradient id="overviewViewsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#11875d" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#11875d" stopOpacity="0.01" />
              </linearGradient>
              <linearGradient id="overviewPlotGlow" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#f4f8f5" stopOpacity="0.7" />
              </linearGradient>
              <filter id="overviewSoftShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#0f172a" floodOpacity="0.06" />
              </filter>
            </defs>

            <rect
              x={baseGeometry.padLeft}
              y={baseGeometry.padTop}
              width={baseGeometry.width - baseGeometry.padLeft - baseGeometry.padRight}
              height={baseGeometry.height - baseGeometry.padTop - baseGeometry.padBottom}
              rx="18"
              fill="url(#overviewPlotGlow)"
              stroke="#eef3ef"
            />

            {ticks.map((tick) => {
              const y =
                baseGeometry.padTop +
                (1 - tick / axisMax) * (baseGeometry.height - baseGeometry.padTop - baseGeometry.padBottom);
              return (
                <g key={tick}>
                  <line
                    x1={baseGeometry.padLeft}
                    x2={baseGeometry.width - baseGeometry.padRight}
                    y1={y}
                    y2={y}
                    stroke="#e5ece7"
                    strokeDasharray="3 6"
                  />
                  <text x="0" y={y + 4} fill="#334155" fontSize="12" fontWeight="600">
                    {formatAxisLabel(tick)}
                  </text>
                </g>
              );
            })}

            {visibleSeries.some((series) => series.key === "views") &&
            trendSeries[0].values.filter((value) => value > 0).length > 1 ? (
              <path
                d={`${smoothPathFromPoints(seriesGeometry[0].geometry.points)} L ${seriesGeometry[0].geometry.points[seriesGeometry[0].geometry.points.length - 1]?.x || 0} ${chartBottom} L ${seriesGeometry[0].geometry.points[0]?.x || 0} ${chartBottom} Z`}
                fill="url(#overviewViewsFill)"
              />
            ) : null}

            {seriesGeometry
              .filter((series) => visibleSeries.some((item) => item.key === series.key))
              .map((series) => {
                const positivePoints = series.geometry.points.filter((point) => point.value > 0);
                return (
                  <g key={series.key} filter="url(#overviewSoftShadow)">
                    {positivePoints.length > 1 ? (
                      <path
                        d={smoothPathFromPoints(series.geometry.points)}
                        fill="none"
                        stroke={series.color}
                        strokeWidth={series.strokeWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ) : null}
                    {series.geometry.points.map((point, index) => (
                      <circle
                        key={`${series.key}-${index}`}
                        cx={point.x}
                        cy={point.y}
                        r={point.value > 0 ? 3.9 : 2.2}
                        fill={series.color}
                        stroke="white"
                        strokeWidth="2"
                        opacity={point.value > 0 ? 1 : 0.42}
                      />
                    ))}
                  </g>
                );
              })}

            {trends.map((point, index) => (
              xAxisLabels[index] ? (
                <text
                  key={point.key}
                  x={baseGeometry.points[index]?.x || 0}
                  y={baseGeometry.height - 14}
                  fill="#334155"
                  fontSize="13"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {xAxisLabels[index]}
                </text>
              ) : null
            ))}
          </svg>
        ) : (
          <div className="flex h-[300px] items-center justify-center rounded-[16px] border border-dashed border-[#dbe4de] bg-white/70 text-center">
            <div>
              <div className="text-sm font-semibold text-slate-700">No performance data yet</div>
              <div className="mt-1 text-sm text-slate-500">
                Change the date range or wait for listing activity to appear here.
              </div>
            </div>
          </div>
        )}
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
                  <th className={`${typography.tableHeader} px-2`}>Value</th>
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

function TrafficSourcesCard({ items }: { items: BreakdownItem[] }) {
  const total = items.reduce((sum, item) => sum + item.count, 0) || 1;
  const itemMeta: Record<string, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
    Active: { color: "#11875d", icon: LayoutGrid },
    Pending: { color: "#f79009", icon: CalendarClock },
    Rejected: { color: "#ef4444", icon: Activity },
    Draft: { color: "#64748b", icon: Home },
  };
  return (
    <Card className="min-h-[300px] p-5">
      <SectionHeader
        title="Listing Status Summary"
        right={
          <Link href="/seller/my-properties" className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-800">
            View all
          </Link>
        }
      />
      <div className="mt-5 grid content-start gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const meta = itemMeta[item.label] || { color: "#11875d", icon: LayoutGrid };
          const Icon = meta.icon;
          const percentage = (item.count / total) * 100;
          return (
            <div key={item.label} className="rounded-[16px] border border-[#e6ece8] bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-[14px] bg-[#f8faf8] ring-1 ring-[#dfe8e2]" style={{ color: meta.color }}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-[13px] font-medium leading-5 text-slate-700">{item.label}</div>
              <div className="mt-1 flex items-center gap-2">
                <div className="text-[18px] font-semibold tracking-tight text-slate-900">{formatNumber(item.count)}</div>
                <div className="text-[11px] font-semibold text-slate-500">
                  {percentage.toFixed(0)}% of listings
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#edf2ee]">
                <div className="h-full rounded-full" style={{ width: `${Math.max(percentage, item.count > 0 ? 8 : 0)}%`, background: `linear-gradient(90deg, ${meta.color} 0%, ${meta.color}CC 100%)` }} />
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

function DeviceBreakdownCard({ items }: { items: BreakdownItem[] }) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const segments = donutSegments(items);
  return (
    <Card className="min-h-[300px] p-5">
      <SectionHeader title="Visit Status Breakdown" />
      <div className="mt-5 grid min-h-[220px] gap-5 lg:grid-cols-[140px_minmax(0,1fr)] lg:items-center">
        <div className="relative mx-auto flex h-[136px] w-[136px] items-center justify-center">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r="36" fill="none" stroke="#eef2ef" strokeWidth="16" />
            {segments.map((segment) => (
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
          {segments.map((item) => {
            return (
              <div key={item.label} className="flex items-center justify-between gap-4">
                <div className="inline-flex items-center gap-3 text-sm text-slate-700">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.label}
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900">{item.percentage.toFixed(0)}%</div>
                  <div className="text-xs text-slate-500">{formatNumber(item.count)}</div>
                </div>
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
    const triggerRefresh = () => {
      if (document.hidden) return;
      setRefreshToken((value) => value + 1);
    };

    const intervalId = window.setInterval(triggerRefresh, AUTO_REFRESH_MS);
    document.addEventListener("visibilitychange", triggerRefresh);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", triggerRefresh);
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
  const isRefreshing = isFetching && !!analytics;
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
  const listingBreakdown = analytics.breakdowns.listings;
  const visitBreakdown = analytics.breakdowns.visits;
  const portfolioCurrency = dominantCurrency(analytics.propertyPerformance);
  const portfolioValue = analytics.propertyPerformance.reduce(
    (sum, property) => sum + Number(property.price || 0),
    0
  );

  return (
    <motion.main
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      aria-busy={isRefreshing}
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
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-[20px] w-[20px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 20V13.5" />
                <path d="M8.5 20V11" />
                <path d="M13 20V8" />
                <path d="M17.5 20V5.5" />
                <path d="M3 20h16.5" />
                <path d="M4.5 10.5 8 7l2.6 2.2L17.8 2" />
                <path d="m15.8 2 2 0 0 2" />
              </svg>
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
              <button
                type="button"
                disabled
                title="Comparison mode is not available for seller analytics yet"
                className="inline-flex h-11 w-full cursor-not-allowed items-center justify-between rounded-xl border border-[#dde5df] bg-[#f8faf8] px-4 pr-10 text-sm font-medium text-slate-500"
              >
                Compare unavailable
              </button>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>

            <div
              className={cn(
                "inline-flex h-11 min-w-[120px] items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium transition",
                isRefreshing
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 opacity-100"
                  : "pointer-events-none border-transparent bg-transparent text-transparent opacity-0"
              )}
              aria-live="polite"
            >
              <LoaderCircle className={cn("h-4 w-4", isRefreshing ? "animate-spin" : "")} />
              Updating...
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
          detail=""
          delta=""
          deltaValue={0}
          icon={Home}
          tint="bg-emerald-50 text-emerald-700"
          headerText="inventory"
          footer="All current seller listings"
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
          title="Portfolio Value"
          value={formatCompactCurrency(portfolioValue, portfolioCurrency)}
          detail=""
          delta=""
          deltaValue={0}
          icon={CircleDollarSign}
          tint="bg-emerald-50 text-emerald-700"
          inverted
          headerText="listed value"
          footer="Based on current listing prices"
        />
        <KpiCard
          title="Active Listings"
          value={formatNumber(summary.activeListings)}
          detail=""
          delta=""
          deltaValue={0}
          icon={LayoutGrid}
          tint="bg-amber-50 text-amber-700"
          headerText="current status"
          footer={`${formatNumber(summary.pendingListings)} pending approval`}
        />
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.55fr)_0.88fr_0.95fr]">
        <PerformanceOverview trends={analytics.trends} />
        <DonutCard
          title="Lead Status Breakdown"
          items={inquiryBreakdown}
          totalLabel="Current lead-status mix in the selected range"
        />
        <RecentActivityCard items={analytics.recentActivity} />
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_0.9fr_0.95fr]">
        <TopListingsCard
          properties={analytics.propertyPerformance}
          hasListings={hasListings}
        />
        <FunnelCard
          funnel={(analytics.funnel || []).map((step) =>
            step.label === "Completed" ? { ...step, label: "Completed Visits" } : step
          )}
        />
        <InsightsCard topProperty={topProperty} bestDay={bestDay} nextAction={nextAction} summary={summary} />
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.05fr)_0.95fr_0.9fr]">
        <TrafficSourcesCard items={listingBreakdown} />
        <TopLocationsCard properties={analytics.propertyPerformance} />
        <DeviceBreakdownCard items={visitBreakdown} />
      </section>
    </motion.main>
  );
}
