"use client";

import Link from "next/link";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  FileDown,
  Home,
  LineChart,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import { apiFetch } from "@/app/lib/api";

type RangeOption = "7d" | "30d" | "90d";
type ChartMetric = "views" | "leads" | "visits" | "conversionRate";

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
const RANGE_OPTIONS: Array<{ value: RangeOption; label: string }> = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
];

const CHART_OPTIONS: Array<{
  value: ChartMetric;
  label: string;
  accent: string;
  fill: string;
  description: string;
}> = [
  {
    value: "views",
    label: "Views",
    accent: "#0f766e",
    fill: "rgba(15, 118, 110, 0.16)",
    description: "Traffic across all live seller listings",
  },
  {
    value: "leads",
    label: "Leads",
    accent: "#2563eb",
    fill: "rgba(37, 99, 235, 0.16)",
    description: "New buyer inquiries generated from listings",
  },
  {
    value: "visits",
    label: "Visits",
    accent: "#9333ea",
    fill: "rgba(147, 51, 234, 0.16)",
    description: "Visit requests that moved deeper into the funnel",
  },
  {
    value: "conversionRate",
    label: "Conversion",
    accent: "#ca8a04",
    fill: "rgba(202, 138, 4, 0.18)",
    description: "Lead-to-view conversion rate for the selected period",
  },
];

const STATUS_FILTERS = ["all", "active", "pending", "rejected", "draft"] as const;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatCompact(value: number) {
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: value < 1000 ? 0 : 1,
  }).format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatSignedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatSignedPoints(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)} pts`;
}

function formatCurrency(value: number, currency: string) {
  return `${currency} ${formatNumber(value)}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "No activity yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No activity yet";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function deltaTone(value: number) {
  if (value > 0) return "text-emerald-600";
  if (value < 0) return "text-rose-600";
  return "text-slate-500";
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

function metricValue(point: TrendPoint, metric: ChartMetric) {
  return point[metric];
}

function metricLabel(metric: ChartMetric) {
  return metric === "conversionRate" ? "conversion rate" : metric;
}

function chartGeometry(values: number[], width = 760, height = 240) {
  const safeValues = values.length ? values : [0];
  const padTop = 16;
  const padRight = 16;
  const padBottom = 22;
  const padLeft = 14;
  const chartWidth = width - padLeft - padRight;
  const chartHeight = height - padTop - padBottom;
  const maxValue = Math.max(...safeValues, 1);
  const minValue = 0;

  const points = safeValues.map((value, index) => {
    const x = padLeft + (chartWidth * index) / Math.max(safeValues.length - 1, 1);
    const y = padTop + (1 - (value - minValue) / Math.max(maxValue - minValue, 1)) * chartHeight;
    return { x, y, value };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${(height - padBottom + 4).toFixed(
        2
      )} L ${points[0].x.toFixed(2)} ${(height - padBottom + 4).toFixed(2)} Z`
    : "";

  return {
    points,
    linePath,
    areaPath,
    maxValue,
    height,
    width,
    padBottom,
    padLeft,
    padRight,
    padTop,
  };
}

function csvEscape(value: string | number) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function TrendChart({
  trends,
  metric,
  onMetricChange,
}: {
  trends: TrendPoint[];
  metric: ChartMetric;
  onMetricChange: (metric: ChartMetric) => void;
}) {
  const meta = CHART_OPTIONS.find((item) => item.value === metric) || CHART_OPTIONS[0];
  const values = trends.map((point) => metricValue(point, metric));
  const geometry = chartGeometry(values);
  const peakPoint = trends.reduce<TrendPoint | null>((best, point) => {
    if (!best) return point;
    return metricValue(point, metric) > metricValue(best, metric) ? point : best;
  }, null);
  const latestPoint = trends[trends.length - 1];

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.07)]">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
            <LineChart className="h-3.5 w-3.5" />
            Performance Trend
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950">
              {meta.label} over time
            </h2>
            <p className="mt-1 text-sm text-slate-600">{meta.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {CHART_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onMetricChange(option.value)}
              className={cn(
                "rounded-full border px-3 py-2 text-sm font-semibold transition",
                metric === option.value
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="rounded-[24px] bg-[linear-gradient(180deg,#f8fbfb_0%,#ffffff_60%)] px-4 py-4 ring-1 ring-slate-100">
          <svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} className="h-[270px] w-full">
            <defs>
              <linearGradient id="analytics-area-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={meta.accent} stopOpacity="0.32" />
                <stop offset="100%" stopColor={meta.accent} stopOpacity="0.03" />
              </linearGradient>
            </defs>

            {[0.25, 0.5, 0.75].map((step) => {
              const y = geometry.padTop + (geometry.height - geometry.padTop - geometry.padBottom) * step;
              return (
                <line
                  key={step}
                  x1={geometry.padLeft}
                  x2={geometry.width - geometry.padRight}
                  y1={y}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeDasharray="4 6"
                />
              );
            })}

            <path d={geometry.areaPath} fill="url(#analytics-area-fill)" />
            <path
              d={geometry.linePath}
              fill="none"
              stroke={meta.accent}
              strokeWidth="3"
              strokeLinecap="round"
            />

            {geometry.points.map((point, index) => (
              <circle
                key={`${metric}-${index}`}
                cx={point.x}
                cy={point.y}
                r="4.5"
                fill={meta.accent}
                stroke="white"
                strokeWidth="2"
              />
            ))}
          </svg>

          <div className="mt-1 flex items-center justify-between gap-2 overflow-hidden">
            {trends.map((point) => (
              <div
                key={point.key}
                className="min-w-0 flex-1 text-center text-[11px] font-semibold text-slate-500"
              >
                {point.shortLabel || " "}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-[22px] bg-slate-950 px-5 py-5 text-white">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
              Current snapshot
            </div>
            <div className="mt-3 text-4xl font-black tracking-tight">
              {metric === "conversionRate"
                ? formatPercent(metricValue(latestPoint || trends[0], metric) || 0)
                : formatCompact(metricValue(latestPoint || trends[0], metric) || 0)}
            </div>
            <div className="mt-2 text-sm text-white/75">
              Most recent point in the selected time window
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Peak day
            </div>
            <div className="mt-3 text-2xl font-black tracking-tight text-slate-950">
              {peakPoint?.label || "No data"}
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {peakPoint
                ? metric === "conversionRate"
                  ? `${formatPercent(metricValue(peakPoint, metric))} conversion`
                  : `${formatNumber(metricValue(peakPoint, metric))} ${meta.label.toLowerCase()}`
                : "No recorded activity"}
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-200 bg-white px-5 py-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Total in range
            </div>
            <div className="mt-3 text-2xl font-black tracking-tight text-slate-950">
              {metric === "conversionRate"
                ? formatPercent(
                    trends.length
                      ? trends.reduce((sum, point) => sum + point.conversionRate, 0) / trends.length
                      : 0
                  )
                : formatNumber(values.reduce((sum, value) => sum + value, 0))}
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {metric === "conversionRate"
                ? "Average daily conversion across the period"
                : `Aggregated ${meta.label.toLowerCase()} for all listings`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="h-56 animate-pulse rounded-[32px] bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-40 animate-pulse rounded-[28px] bg-slate-200" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_360px]">
        <div className="h-[460px] animate-pulse rounded-[28px] bg-slate-200" />
        <div className="h-[460px] animate-pulse rounded-[28px] bg-slate-200" />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<RangeOption>("30d");
  const [metric, setMetric] = useState<ChartMetric>("views");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [analytics, setAnalytics] = useState<SellerAnalytics | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);
  const [exporting, setExporting] = useState<"pdf" | "csv" | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string>("");
  const [toast, setToast] = useState<ToastState>({ show: false, tone: "success", text: "" });
  const toastTimer = useRef<number | null>(null);
  const deferredSearch = useDeferredValue(search);

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
          setLastUpdatedAt(new Date().toISOString());
        }
      } catch (err: any) {
        if (controller.signal.aborted) return;
        setError(err?.message || "Failed to load analytics");
      } finally {
        if (!controller.signal.aborted) {
          setIsFetching(false);
        }
      }
    };

    loadAnalytics();

    return () => controller.abort();
  }, [range, refreshToken]);

  const summary = analytics?.summary;
  const isInitialLoading = isFetching && !analytics;
  const isRefreshing = isFetching && !!analytics;
  const hasListings = (summary?.totalListings || 0) > 0;

  const filteredProperties = useMemo(() => {
    const rows = analytics?.propertyPerformance || [];
    const query = deferredSearch.trim().toLowerCase();

    return rows.filter((property) => {
      const matchesStatus = statusFilter === "all" || property.status === statusFilter;
      const matchesSearch =
        !query ||
        property.title.toLowerCase().includes(query) ||
        property.location.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [analytics, deferredSearch, statusFilter]);

  const topProperty = useMemo(() => {
    const rows = analytics?.propertyPerformance || [];
    return (
      rows.find((property) => property.views > 0 || property.leads > 0 || property.visits > 0) ||
      rows[0] ||
      null
    );
  }, [analytics]);

  const bestDay = useMemo(() => {
    const rows = analytics?.trends || [];
    return rows.reduce<TrendPoint | null>((best, point) => {
      if (!best) return point;
      return metricValue(point, metric) > metricValue(best, metric) ? point : best;
    }, null);
  }, [analytics, metric]);

  const nextAction = useMemo(() => {
    if (!summary) return "Publish your first listing to start collecting seller-side analytics.";
    if (summary.totalListings === 0) {
      return "Publish your first listing to start collecting seller-side analytics.";
    }
    if (summary.pendingListings > 0) {
      return `${summary.pendingListings} listing${summary.pendingListings > 1 ? "s are" : " is"} still pending approval.`;
    }
    if (summary.visits > summary.completedVisits) {
      return `${summary.visits - summary.completedVisits} visit request${summary.visits - summary.completedVisits === 1 ? " is" : "s are"} still open for follow-up.`;
    }
    if (summary.leads > 0) {
      return "Lead volume is healthy. Keep response time tight to protect conversion.";
    }
    return "Traffic is coming in. Refresh photos, pricing, or headlines to turn views into leads.";
  }, [summary]);

  const exportPdf = async () => {
    try {
      setExporting("pdf");
      const response = await fetch(`${API_BASE}/analytics/seller/pdf?range=${range}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Export failed (${response.status})`);
      }

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

  const exportCsv = () => {
    if (!analytics) return;

    try {
      setExporting("csv");
      const rows = [
        [
          "Property",
          "Status",
          "Listing Type",
          "Location",
          "Views",
          "Leads",
          "Visits",
          "Conversion Rate",
          "Last Lead",
          "Last Visit",
        ],
        ...analytics.propertyPerformance.map((property) => [
          property.title,
          titleCase(property.status),
          titleCase(property.listingType),
          property.location,
          property.views,
          property.leads,
          property.visits,
          property.conversionRate.toFixed(1),
          property.lastLeadAt ? formatDate(property.lastLeadAt) : "",
          property.lastVisitAt ? formatDate(property.lastVisitAt) : "",
        ]),
      ];

      const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `seller-analytics-${range}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showToast("CSV export generated.");
    } catch (err: any) {
      showToast(err?.message || "Failed to export CSV", "error");
    } finally {
      setExporting(null);
    }
  };

  if (isInitialLoading) {
    return <LoadingState />;
  }

  if (!analytics && error) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center px-4">
        <div className="w-full rounded-[32px] border border-rose-200 bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-600">
            <Activity className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950">
            Analytics could not be loaded
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{error}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setRefreshToken((value) => value + 1)}
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
            <Link
              href="/seller/my-properties"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
            >
              View listings
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics || !summary) {
    return null;
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="mx-auto w-full max-w-7xl space-y-6"
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
            toast.tone === "success"
              ? "bg-emerald-600/95 text-white"
              : "bg-rose-600/95 text-white"
          )}
        >
          {toast.text}
        </div>
      </div>

      <section className="relative overflow-hidden rounded-[34px] bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-6 text-white shadow-[0_28px_90px_rgba(19,74,54,0.18)] md:px-8 md:py-8">
        <div className="absolute inset-y-0 right-0 w-[42%] bg-[radial-gradient(circle_at_center,rgba(236,246,240,0.20)_0%,rgba(236,246,240,0.04)_58%,transparent_100%)]" />
        <div className="absolute -right-10 top-10 h-40 w-40 rounded-full border border-white/12" />
        <div className="absolute bottom-0 right-20 h-24 w-24 rounded-full bg-white/10 blur-2xl" />

        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
              <Sparkles className="h-4 w-4" />
              Seller intelligence workspace
              {isRefreshing && (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] tracking-[0.16em] text-white/90 ring-1 ring-white/15 backdrop-blur-sm">
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  Refreshing
                </span>
              )}
            </div>

            <div className="max-w-3xl">
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                Seller analytics built around actual listing flow.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#edf6f0]/90 sm:text-base">
                Track how listing traffic turns into leads and visit requests, spot weak inventory,
                and export a report for the exact window you care about.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    startTransition(() => {
                      setRange(option.value);
                    })
                  }
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-semibold transition",
                    range === option.value
                      ? "border-white bg-white text-slate-950"
                      : "border-white/15 bg-white/10 text-white hover:border-white/25 hover:bg-white/15"
                  )}
                >
                  {option.label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setRefreshToken((value) => value + 1)}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/15"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                Refresh
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-white/85">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/10 backdrop-blur-sm">
                <Clock3 className="h-4 w-4" />
                {formatDate(analytics.filters.startDate)} to {formatDate(analytics.filters.endDate)}
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/10 backdrop-blur-sm">
                <BarChart3 className="h-4 w-4" />
                {summary.engagedListings} engaged listing{summary.engagedListings === 1 ? "" : "s"}
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/10 backdrop-blur-sm">
                <Users className="h-4 w-4" />
                {summary.leads} lead{summary.leads === 1 ? "" : "s"} in range
              </div>
            </div>
          </div>

          <div className="relative z-10 grid gap-3 self-start rounded-[28px] bg-[rgba(218,232,223,0.12)] p-4 backdrop-blur-md ring-1 ring-[rgba(255,255,255,0.14)]">
            <button
              type="button"
              onClick={exportPdf}
              disabled={exporting !== null}
              className="inline-flex items-center justify-center gap-2 rounded-[22px] bg-white px-5 py-4 text-sm font-semibold text-[#11392f] transition hover:scale-[1.01] hover:bg-[#f5faf7] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting === "pdf" ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export PDF report
            </button>

            <button
              type="button"
              onClick={exportCsv}
              disabled={exporting !== null || !analytics.propertyPerformance.length}
              className="inline-flex items-center justify-center gap-2 rounded-[22px] border border-white/15 bg-white/10 px-5 py-4 text-sm font-semibold text-white transition hover:border-white/25 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting === "csv" ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              Export CSV listing data
            </button>

            <div className="rounded-[22px] border border-white/12 bg-[rgba(9,36,27,0.12)] p-4 text-white/90">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
                Recommended action
              </div>
              <p className="mt-2 text-sm leading-6">{nextAction}</p>
              {lastUpdatedAt && (
                <p className="mt-3 text-xs text-white/70">Updated {formatDateTime(lastUpdatedAt)}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {error && analytics && (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          Showing the last successful analytics snapshot. Refresh failed with: {error}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "Views",
            value: formatNumber(summary.views),
            delta: formatSignedPercent(summary.viewsDelta),
            deltaValue: summary.viewsDelta,
            accent: "from-emerald-500/18 via-white to-white",
            icon: Eye,
            detail: `${formatCompact(summary.lifetimeViews)} lifetime`,
          },
          {
            title: "Leads",
            value: formatNumber(summary.leads),
            delta: formatSignedPercent(summary.leadsDelta),
            deltaValue: summary.leadsDelta,
            accent: "from-sky-500/18 via-white to-white",
            icon: Users,
            detail: `${formatCompact(summary.lifetimeLeads)} lifetime`,
          },
          {
            title: "Visit requests",
            value: formatNumber(summary.visits),
            delta: formatSignedPercent(summary.visitsDelta),
            deltaValue: summary.visitsDelta,
            accent: "from-violet-500/18 via-white to-white",
            icon: CalendarClock,
            detail: `${summary.completedVisits} completed in range`,
          },
          {
            title: "Conversion rate",
            value: formatPercent(summary.conversionRate),
            delta: formatSignedPoints(summary.conversionDelta),
            deltaValue: summary.conversionDelta,
            accent: "from-amber-400/22 via-white to-white",
            icon: TrendingUp,
            detail: `${formatPercent(summary.lifetimeConversionRate)} lifetime`,
          },
        ].map((card) => {
          const Icon = card.icon;
          const DeltaIcon = card.deltaValue >= 0 ? ArrowUpRight : ArrowDownRight;

          return (
            <motion.div
              key={card.title}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.18 }}
              className={cn(
                "rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,var(--tw-gradient-stops))] p-5 shadow-[0_16px_60px_rgba(15,23,42,0.06)]",
                card.accent
              )}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-600">{card.title}</div>
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-white">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-5 text-4xl font-black tracking-tight text-slate-950">{card.value}</div>
              <div className={cn("mt-2 inline-flex items-center gap-1 text-sm font-semibold", deltaTone(card.deltaValue))}>
                <DeltaIcon className="h-4 w-4" />
                {card.delta}
              </div>
              <div className="mt-3 text-sm text-slate-500">{card.detail}</div>
            </motion.div>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_360px]">
        <TrendChart trends={analytics.trends} metric={metric} onMetricChange={setMetric} />

        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.07)]">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
              <Activity className="h-3.5 w-3.5" />
              Funnel
            </div>
            <div className="mt-4 space-y-4">
              {analytics.funnel.map((step) => (
                <div key={step.label}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-700">{step.label}</span>
                    <span className="font-semibold text-slate-950">
                      {formatNumber(step.value)}{" "}
                      <span className="text-slate-500">{step.ratio.toFixed(1)}%</span>
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#0f766e_0%,#10b981_100%)]"
                      style={{ width: `${Math.max(step.ratio, step.value > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Completion rate
              </div>
              <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                {formatPercent(summary.visitCompletionRate)}
              </div>
              <p className="mt-2 text-sm text-slate-600">
                Share of visit requests that reached completed status in the selected range.
              </p>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.07)]">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
              <Sparkles className="h-3.5 w-3.5" />
              Highlights
            </div>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Top listing
                </div>
                <div className="mt-2 text-lg font-black tracking-tight text-slate-950">
                  {topProperty?.title || "No listing data yet"}
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {topProperty
                    ? `${topProperty.views} views, ${topProperty.leads} leads, ${topProperty.visits} visits`
                    : "Add listings to start ranking performance."}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Strongest day
                </div>
                <div className="mt-2 text-lg font-black tracking-tight text-slate-950">
                  {bestDay?.label || "No recorded activity"}
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {bestDay
                    ? metric === "conversionRate"
                      ? `${formatPercent(bestDay.conversionRate)} ${metricLabel(metric)}`
                      : `${formatNumber(metricValue(bestDay, metric))} ${metricLabel(metric)}`
                    : "Try a wider range or wait for new listing activity."}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Daily pace
                </div>
                <div className="mt-2 text-lg font-black tracking-tight text-slate-950">
                  {summary.averageDailyViews.toFixed(1)} average views
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {summary.activeListings} active listing{summary.activeListings === 1 ? "" : "s"} currently contributing to seller analytics.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.07)]">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
              <Home className="h-3.5 w-3.5" />
              Distribution
            </div>

            <div className="mt-4 grid gap-5">
              {[
                { title: "Listings", items: analytics.breakdowns.listings },
                { title: "Leads", items: analytics.breakdowns.leads },
                { title: "Visits", items: analytics.breakdowns.visits },
              ].map((group) => {
                const max = Math.max(1, ...group.items.map((item) => item.count));

                return (
                  <div key={group.title}>
                    <div className="mb-3 text-sm font-bold text-slate-900">{group.title}</div>
                    <div className="space-y-3">
                      {group.items.map((item) => (
                        <div key={`${group.title}-${item.label}`}>
                          <div className="mb-1 flex items-center justify-between text-sm text-slate-600">
                            <span>{item.label}</span>
                            <span className="font-semibold text-slate-900">{item.count}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-[linear-gradient(90deg,#0f766e_0%,#10b981_100%)]"
                              style={{ width: `${(item.count / max) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_0.95fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.07)]">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                <BarChart3 className="h-3.5 w-3.5" />
                Listing performance
              </div>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                Which listings are actually driving results
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Search, filter, and jump directly into the listings that need action.
              </p>
            </div>

            <Link
              href="/seller/my-properties"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
            >
              Manage listings
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-5 flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by listing title or location"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as (typeof STATUS_FILTERS)[number])
              }
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white"
            >
              {STATUS_FILTERS.map((value) => (
                <option key={value} value={value}>
                  {value === "all" ? "All statuses" : titleCase(value)}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5 space-y-4">
            {!hasListings && (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200">
                  <Home className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-xl font-black tracking-tight text-slate-950">
                  No seller listings yet
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Add a property first. Analytics, funnels, and listing-level performance will appear here automatically.
                </p>
                <Link
                  href="/seller/add-property"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Create a listing
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            )}

            {hasListings && filteredProperties.length === 0 && (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center text-sm text-slate-600">
                No listings match the current search and status filter.
              </div>
            )}

            {filteredProperties.map((property) => (
              <motion.div
                key={property.id}
                whileHover={{ y: -2 }}
                transition={{ duration: 0.18 }}
                className="rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex gap-4">
                    <div className="h-24 w-28 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
                      {property.image ? (
                        <img
                          src={property.image}
                          alt={property.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-slate-400">
                          <Home className="h-6 w-6" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black tracking-tight text-slate-950">
                          {property.title}
                        </h3>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
                            statusTone(property.status)
                          )}
                        >
                          {titleCase(property.status)}
                        </span>
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                          {titleCase(property.listingType)}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          {property.location}
                        </span>
                        <span>{formatCurrency(property.price, property.currency)}</span>
                        <span>Listed {formatDate(property.createdAt)}</span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        {[
                          { label: "Views", value: property.views, icon: Eye },
                          { label: "Leads", value: property.leads, icon: Users },
                          { label: "Visits", value: property.visits, icon: CalendarClock },
                        ].map((item) => {
                          const Icon = item.icon;
                          return (
                            <div
                              key={`${property.id}-${item.label}`}
                              className="rounded-2xl border border-slate-200 bg-white px-3 py-3"
                            >
                              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                <Icon className="h-3.5 w-3.5" />
                                {item.label}
                              </div>
                              <div className="mt-2 text-xl font-black tracking-tight text-slate-950">
                                {formatNumber(item.value)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:w-[220px]">
                    <div className="rounded-2xl bg-slate-950 px-4 py-4 text-white">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
                        Conversion
                      </div>
                      <div className="mt-2 text-2xl font-black tracking-tight">
                        {formatPercent(property.conversionRate)}
                      </div>
                      <p className="mt-2 text-xs text-white/70">
                        Last lead {formatDate(property.lastLeadAt)}
                      </p>
                      <p className="mt-1 text-xs text-white/70">
                        Last visit {formatDate(property.lastVisitAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/seller/property/${property.id}`}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                      >
                        View
                      </Link>
                      <Link
                        href={`/seller/edit-property/${property.id}`}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.07)]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                <Activity className="h-3.5 w-3.5" />
                Recent activity
              </div>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                What changed most recently
              </h2>
            </div>

            <Link
              href="/seller/leads"
              className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
            >
              Open inbox
            </Link>
          </div>

          <div className="mt-5 space-y-4">
            {analytics.recentActivity.length === 0 && (
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-600">
                No leads or visit requests have been recorded yet.
              </div>
            )}

            {analytics.recentActivity.map((item, index) => (
              <Link
                key={`${item.type}-${item.id}`}
                href={item.href}
                className="group block rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] p-4 transition hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-white">
                      {item.type === "lead" ? <Users className="h-5 w-5" /> : <CalendarClock className="h-5 w-5" />}
                    </div>
                    {index !== analytics.recentActivity.length - 1 && (
                      <div className="mt-2 h-full w-px bg-slate-200" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ring-1",
                          statusTone(item.status)
                        )}
                      >
                        {titleCase(item.status)}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        {item.type === "lead" ? "Lead" : "Visit"}
                      </span>
                    </div>

                    <div className="mt-2 text-base font-black tracking-tight text-slate-950">
                      {item.actorName} {item.type === "lead" ? "sent a lead" : `${titleCase(item.status)} a visit`}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        {item.propertyTitle}
                      </span>
                      <span>{formatDateTime(item.occurredAt)}</span>
                    </div>

                    {item.type === "visit" && item.requestedDate && (
                      <p className="mt-2 text-sm text-slate-600">
                        Requested for {formatDate(item.requestedDate)}
                        {item.preferredTime ? ` at ${item.preferredTime}` : ""}
                      </p>
                    )}

                    {item.message && (
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {item.message}
                      </p>
                    )}
                  </div>

                  <ChevronRight className="mt-1 h-5 w-5 flex-none text-slate-300 transition group-hover:text-slate-500" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </motion.main>
  );
}
