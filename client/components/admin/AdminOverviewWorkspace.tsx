"use client";

import * as React from "react";
import Link from "next/link";
import { apiFetchAdmin } from "@/app/lib/api";
import { typography } from "@/app/lib/typography";
import AdminToast from "@/components/admin/AdminToast";
import { motion } from "framer-motion";
import CountUp from "react-countup";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Line,
  Area,
  ComposedChart,
} from "recharts";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  RefreshCcw,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
  Users,
} from "lucide-react";

type OverviewResponse = {
  success: boolean;
  stats: {
    properties: { total: number; active: number; pending: number; rejected: number };
    users: {
      total: number;
      active: number;
      archived: number;
      suspended: number;
      buyers: number;
      sellers: number;
      agents: number;
      admins: number;
    };
    reports: {
      total: number;
      pending: number;
      reviewed: number;
      actionTaken: number;
      rejected: number;
    };
    commerce: {
      paidRevenue: number;
      paidPayments: number;
      pendingPayments: number;
      totalReservations: number;
      confirmedReservations: number;
      propertyViews30d: number;
    };
  };
  charts: {
    revenue: Array<{ label: string; revenue: number; payments: number }>;
    moderation: Array<{ name: string; value: number }>;
    propertyStatus: Array<{ name: string; value: number }>;
    userRoles: Array<{ name: string; value: number }>;
  };
  lists: {
    pendingListings: Array<{
      id: string;
      title: string;
      location: string;
      image?: string;
      sellerName: string;
      createdAt: string;
      propertyType: string;
      listingType: string;
      price: number;
      currency: string;
    }>;
    recentReports: Array<{
      id: string;
      reason: string;
      status: string;
      createdAt: string;
      message: string;
      propertyTitle: string;
      propertyLocation: string;
      reporterName: string;
    }>;
    recentPayments: Array<{
      id: string;
      amount: number;
      gateway: string;
      status: string;
      createdAt: string;
      propertyTitle: string;
      buyerName: string;
    }>;
    recentUsers: Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      status: string;
      createdAt: string;
    }>;
    topOwners: Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      status: string;
      propertyCount: number;
    }>;
    topReportReasons: Array<{ reason: string; count: number }>;
  };
};

const EMPTY_OVERVIEW: OverviewResponse = {
  success: true,
  stats: {
    properties: { total: 0, active: 0, pending: 0, rejected: 0 },
    users: {
      total: 0,
      active: 0,
      archived: 0,
      suspended: 0,
      buyers: 0,
      sellers: 0,
      agents: 0,
      admins: 0,
    },
    reports: { total: 0, pending: 0, reviewed: 0, actionTaken: 0, rejected: 0 },
    commerce: {
      paidRevenue: 0,
      paidPayments: 0,
      pendingPayments: 0,
      totalReservations: 0,
      confirmedReservations: 0,
      propertyViews30d: 0,
    },
  },
  charts: {
    revenue: [],
    moderation: [],
    propertyStatus: [],
    userRoles: [],
  },
  lists: {
    pendingListings: [],
    recentReports: [],
    recentPayments: [],
    recentUsers: [],
    topOwners: [],
    topReportReasons: [],
  },
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function fmtNumber(value: number) {
  return new Intl.NumberFormat().format(value || 0);
}

function fmtMoney(value: number) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatLabel(value: string) {
  if (!value) return "Unknown";
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toSafeNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function CardShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[#dfe8e2] bg-white shadow-[0_6px_24px_rgba(16,24,40,0.05)]",
        className
      )}
    >
      {children}
    </section>
  );
}

function StatCard({
  title,
  value,
  detail,
  icon,
  prefix,
  countTo,
}: {
  title: string;
  value: React.ReactNode;
  detail: string;
  icon: React.ReactNode;
  prefix?: string;
  countTo?: number;
}) {
  return (
    <motion.div
      className="rounded-2xl border border-[#dfe8e2] bg-white px-5 py-5 shadow-[0_6px_24px_rgba(16,24,40,0.04)]"
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={typography.cardTitle}>{title}</p>
          <p className={`mt-2 ${typography.statValue}`}>
            {typeof countTo === "number" ? (
              <CountUp end={toSafeNumber(countTo)} duration={0.9} prefix={prefix} separator="," />
            ) : (
              value
            )}
          </p>
          <p className={`mt-2 ${typography.helperText}`}>{detail}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#316249] text-white shadow-sm">
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

function LinkLike({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      prefetch={true}
      className={`inline-flex items-center gap-1.5 rounded-xl border border-[#dbe5de] bg-[#f3f8f4] px-3 py-2 text-[#316249] transition hover:bg-[#e9f3ee] ${typography.buttonText}`}
    >
      {label}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function StatusPill({ value }: { value: string }) {
  const lower = value.toLowerCase();

  const tone =
    lower === "active" ||
    lower === "paid" ||
    lower === "reviewed" ||
    lower === "for sale" ||
    lower === "approved"
      ? "bg-[#e9f3ee] text-[#316249]"
      : lower === "pending" || lower === "for rent"
      ? "bg-[#f2f7f4] text-[#3f6f57]"
      : lower === "sold" || lower === "rejected" || lower === "failed" || lower === "inactive"
      ? "bg-[#edf2ef] text-[#4d5f56]"
      : "bg-[#eef2f4] text-[#5f6f67]";

  return (
    <span className={cn("inline-flex rounded-xl px-2.5 py-1 text-xs font-semibold", tone)}>
      {formatLabel(value)}
    </span>
  );
}

function MiniAvatar({ name }: { name: string }) {
  const initial = (name || "U").trim().charAt(0).toUpperCase();

  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#dcefe2_0%,#84c39c_100%)] text-sm font-bold text-[#23563a] ring-2 ring-white">
      {initial}
    </div>
  );
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-[10px] border border-dashed border-[#dfe8e2] bg-[#f8fbf9] text-sm text-[#6e7f8d]">
      {message}
    </div>
  );
}

const PAGE_BG =
  "min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(52,211,153,0.10),transparent_22%),linear-gradient(180deg,#f6fffa_0%,#edf8f1_100%)] p-4 sm:p-6";

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

const PIE_COLORS = ["#316249", "#3f7a5a", "#5f9475", "#8bb79d", "#cfd8d3"];

function renderPieLabel(props: any) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  if (!percent || percent < 0.07) return null;

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.62;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      style={{ fontSize: 16, fontWeight: 700 }}
    >
      {`${Math.round(percent * 100)}%`}
    </text>
  );
}

function CustomRevenueTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const payments = payload.find((item) => item.dataKey === "payments")?.value ?? 0;
  const revenue = payload.find((item) => item.dataKey === "revenue")?.value ?? 0;

  return (
    <div className="rounded-md border border-[#d9e3dc] bg-white px-4 py-3 shadow-md">
      <p className="mb-2 text-[15px] font-medium text-[#243b53]">{label}</p>
      <p className="text-[14px] font-medium text-[#3f7a5a]">
        payments : {fmtNumber(Number(payments))}
      </p>
      <p className="mt-2 text-[14px] font-medium text-[#316249]">
        revenue : {fmtNumber(Number(revenue))}
      </p>
    </div>
  );
}

function CustomPieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; payload?: { name?: string; value?: number } }>;
}) {
  if (!active || !payload?.length) return null;

  const datum = payload[0]?.payload ?? payload[0];
  const name = String(datum?.name ?? "");
  const value = toSafeNumber(datum?.value);

  return (
    <div className="rounded-md border border-[#d9e3dc] bg-white px-4 py-3 shadow-md">
      <p className="mb-2 text-[15px] font-medium text-[#243b53]">{formatLabel(name)}</p>
      <p className="text-[14px] font-medium text-[#2d6a4f]">{fmtNumber(value)}</p>
    </div>
  );
}

export default function AdminOverviewWorkspace() {
  const [overview, setOverview] = React.useState<OverviewResponse>(EMPTY_OVERVIEW);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const timer = React.useRef<number | null>(null);

  async function loadOverview(silent = false) {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const response = await apiFetchAdmin<OverviewResponse>("/api/admin/overview", {
        cache: "no-store",
      });
      setOverview(response);
    } catch (err: any) {
      setError(err?.message || "Failed to load admin overview");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  React.useEffect(() => {
    void loadOverview();
  }, []);

  React.useEffect(() => {
    if (!notice) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNotice(null), 2800);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [notice]);

  const revenueChartData = React.useMemo(() => {
    return (overview.charts.revenue || []).map((item, index) => ({
      label: item?.label || `M${index + 1}`,
      revenue: toSafeNumber(item?.revenue),
      payments: toSafeNumber(item?.payments),
    }));
  }, [overview.charts.revenue]);

  const hasRevenueData = revenueChartData.some(
    (item) => item.revenue > 0 || item.payments > 0
  );

  const propertyStatusData = React.useMemo(() => {
    const raw =
      overview.charts.propertyStatus?.length > 0
        ? overview.charts.propertyStatus
        : [
            { name: "For Sale", value: overview.stats.properties.active || 0 },
            { name: "Pending", value: overview.stats.properties.pending || 0 },
            { name: "Rejected", value: overview.stats.properties.rejected || 0 },
          ];

    return raw
      .map((item) => ({
        name: item.name,
        value: toSafeNumber(item.value),
      }))
      .filter((item) => item.value > 0);
  }, [overview.charts.propertyStatus, overview.stats.properties.active, overview.stats.properties.pending, overview.stats.properties.rejected]);

  const propertyStatusTotal = propertyStatusData.reduce((sum, item) => sum + item.value, 0);
  const hasPropertyStatusData = propertyStatusData.length > 0 && propertyStatusTotal > 0;

  const recentProperties = overview.lists.pendingListings.slice(0, 4);
  const topOwners = overview.lists.topOwners.slice(0, 4);
  const latestLeads = overview.lists.recentReports.slice(0, 5);

  const statCards = React.useMemo(
    () => [
      {
        key: "properties",
        title: "Total Properties",
        value: overview.stats.properties.total,
        detail: `${fmtNumber(overview.stats.properties.active)} active`,
        icon: <CheckCircle2 className="h-5 w-5" />,
      },
      {
        key: "owners",
        title: "Total Owners",
        value: overview.stats.users.sellers + overview.stats.users.agents,
        detail: `${fmtNumber(overview.stats.users.agents)} agents`,
        icon: <ShieldAlert className="h-5 w-5" />,
      },
      {
        key: "users",
        title: "Total Users",
        value: overview.stats.users.total,
        detail: `${fmtNumber(overview.stats.users.active)} active accounts`,
        icon: <Users className="h-5 w-5" />,
      },
      {
        key: "earnings",
        title: "Total Earnings",
        value: overview.stats.commerce.paidRevenue,
        prefix: "₹",
        detail: `${fmtNumber(overview.stats.commerce.paidPayments)} paid payments`,
        icon: <CreditCard className="h-5 w-5" />,
      },
    ],
    [overview]
  );

  const statGridVariants = React.useMemo(
    () => ({
      hidden: {},
      show: {
        transition: {
          staggerChildren: 0.12,
          delayChildren: 0.05,
        },
      },
    }),
    []
  );

  const statCardVariants = React.useMemo(
    () => ({
      hidden: { opacity: 0, y: 18, scale: 0.98 },
      show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.42, ease: EASE_OUT },
      },
    }),
    []
  );

  if (loading) {
    return (
      <main className={PAGE_BG}>
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-56 rounded-[34px] bg-slate-200/70" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-32 rounded-2xl bg-white shadow-sm" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-[340px] rounded-2xl bg-white shadow-sm" />
            <div className="h-[340px] rounded-2xl bg-white shadow-sm" />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-[280px] rounded-2xl bg-white shadow-sm" />
            <div className="h-[280px] rounded-2xl bg-white shadow-sm" />
          </div>
          <div className="h-[260px] rounded-2xl bg-white shadow-sm" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className={PAGE_BG}>
        <div className="mx-auto max-w-3xl rounded-[32px] border border-rose-200 bg-white p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-rose-100 p-3 text-rose-600">
              <TriangleAlert className="h-6 w-6" />
            </div>
            <div>
              <h1 className={typography.pageTitle}>Overview failed to load</h1>
              <p className={`mt-2 ${typography.pageSubtitle}`}>{error}</p>
              <button
                type="button"
                onClick={() => void loadOverview()}
                className={`mt-5 rounded-2xl bg-[#316249] px-5 py-3 text-white hover:bg-[#274e3b] ${typography.buttonText}`}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={PAGE_BG}>
      <AdminToast
        show={!!notice}
        message={notice?.message || ""}
        tone={notice?.tone || "success"}
      />

      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[34px] border border-emerald-200/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-6 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:px-8 sm:py-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-50">
                <Sparkles className="h-3.5 w-3.5" />
                Live admin overview
              </span>
              <h1 className="ps-page-title mt-4 text-white">
                Admin dashboard
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/90">
                Review platform health, moderate pending listings, track revenue, and watch
                user and report activity from one real-time control surface.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadOverview(true)}
              disabled={refreshing}
              className={`inline-flex items-center justify-center gap-2 self-start rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-white backdrop-blur-sm hover:bg-white/15 disabled:opacity-60 ${typography.buttonText}`}
            >
              <RefreshCcw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          <div className="mt-4">
            <Link
              href="/"
              prefetch={true}
              className={`inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-white backdrop-blur-sm transition hover:bg-white/15 ${typography.buttonText}`}
            >
              Back to Home
            </Link>
          </div>
        </section>

        <motion.section
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
          variants={statGridVariants}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={statCardVariants}>
            <StatCard
              title="Total Properties"
              countTo={overview.stats.properties.total}
              value={overview.stats.properties.total}
              detail={`${fmtNumber(overview.stats.properties.active)} active`}
              icon={<CheckCircle2 className="h-5 w-5" />}
            />
          </motion.div>
          <motion.div variants={statCardVariants}>
            <StatCard
              title="Total Owners"
              countTo={overview.stats.users.sellers + overview.stats.users.agents}
              value={overview.stats.users.sellers + overview.stats.users.agents}
              detail={`${fmtNumber(overview.stats.users.agents)} agents`}
              icon={<ShieldAlert className="h-5 w-5" />}
            />
          </motion.div>
          <motion.div variants={statCardVariants}>
            <StatCard
              title="Total Users"
              countTo={overview.stats.users.total}
              value={overview.stats.users.total}
              detail={`${fmtNumber(overview.stats.users.active)} active accounts`}
              icon={<Users className="h-5 w-5" />}
            />
          </motion.div>
          <motion.div variants={statCardVariants}>
            <StatCard
            title="Total Earnings"
            countTo={overview.stats.commerce.paidRevenue}
            value={`₹${fmtMoney(overview.stats.commerce.paidRevenue)}`}
            detail={`${fmtNumber(overview.stats.commerce.paidPayments)} paid payments`}
            icon={<CreditCard className="h-5 w-5" />}
            />
          </motion.div>
        </motion.section>

        <section className="grid gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.46, ease: EASE_OUT }}
          >
            <CardShell>
            <div className="flex items-center justify-between border-b border-[#e8efeb] px-5 py-4">
              <h2 className={typography.sectionTitle}>Revenue Stats</h2>
            </div>

            <div className="px-5 py-4">
              <div className="mb-4 flex flex-wrap items-center gap-4 text-xs sm:text-sm">
                <div className="flex items-center gap-2 text-[#4f5d75]">
                  <span className="inline-block h-[5px] w-7 rounded-full bg-[#316249]" />
                  Monthly Earnings
                </div>
                <div className="flex items-center gap-2 text-[#4f5d75]">
                  <span className="inline-block h-[5px] w-7 rounded-full bg-[#3f7a5a]" />
                  Commission
                </div>
              </div>

              <div className="h-[250px]">
                {hasRevenueData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={revenueChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="earningsFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#316249" stopOpacity={0.18} />
                          <stop offset="100%" stopColor="#316249" stopOpacity={0.03} />
                        </linearGradient>
                        <linearGradient id="commissionFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3f7a5a" stopOpacity={0.14} />
                          <stop offset="100%" stopColor="#3f7a5a" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>

                      <CartesianGrid stroke="#e7ecef" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 12, fill: "#6b7c93" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: "#6b7c93" }}
                        axisLine={false}
                        tickLine={false}
                        width={44}
                      />
                      <Tooltip content={<CustomRevenueTooltip />} />

                      <Area
                        type="monotone"
                        dataKey="revenue"
                        fill="url(#earningsFill)"
                        stroke="none"
                        isAnimationActive={true}
                        animationDuration={1200}
                        animationEasing="ease-out"
                      />
                      <Area
                        type="monotone"
                        dataKey="payments"
                        fill="url(#commissionFill)"
                        stroke="none"
                        isAnimationActive={true}
                        animationDuration={1200}
                        animationEasing="ease-out"
                      />

                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#316249"
                        strokeWidth={3}
                        dot={{ r: 3, fill: "#ffffff", stroke: "#316249", strokeWidth: 2 }}
                        activeDot={{ r: 5, fill: "#ffffff", stroke: "#316249", strokeWidth: 2 }}
                        isAnimationActive={true}
                        animationDuration={1200}
                        animationEasing="ease-out"
                      />
                      <Line
                        type="monotone"
                        dataKey="payments"
                        stroke="#3f7a5a"
                        strokeWidth={3}
                        dot={{ r: 3, fill: "#ffffff", stroke: "#3f7a5a", strokeWidth: 2 }}
                        activeDot={{ r: 5, fill: "#ffffff", stroke: "#3f7a5a", strokeWidth: 2 }}
                        isAnimationActive={true}
                        animationDuration={1200}
                        animationEasing="ease-out"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChartState message="No revenue data available yet." />
                )}
              </div>
            </div>
            </CardShell>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.46, ease: EASE_OUT, delay: 0.05 }}
          >
            <CardShell>
            <div className="flex items-center justify-between border-b border-[#e8efeb] px-5 py-4">
              <h2 className={typography.sectionTitle}>Property Listings</h2>
              <LinkLike href="/admin/listings-approval" label="View All" />
            </div>

            <div className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_180px] lg:items-center">
              <div className="h-[250px]">
                {hasPropertyStatusData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={propertyStatusData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={110}
                        paddingAngle={1.5}
                        labelLine={false}
                        label={renderPieLabel}
                        isAnimationActive={true}
                        animationDuration={900}
                      >
                        {propertyStatusData.map((entry, index) => (
                          <Cell
                            key={`${entry.name}-${index}`}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChartState message="No property status data available yet." />
                )}
              </div>

              <div className="space-y-5">
                {hasPropertyStatusData ? (
                  propertyStatusData.map((item, index) => {
                    const percentage = propertyStatusTotal
                      ? Math.round((item.value / propertyStatusTotal) * 100)
                      : 0;

                    return (
                      <div
                        key={item.name}
                        className="flex items-center justify-between gap-3 border-b border-[#edf2ef] pb-3 last:border-b-0"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="inline-block h-4 w-4 rounded-[4px]"
                            style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                          />
                          <span className="text-sm font-medium text-[#334e68]">
                            {formatLabel(item.name)}
                          </span>
                        </div>
                        <span className="text-[15px] font-bold text-[#243b53]">{percentage}%</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-[#6e7f8d]">No breakdown available.</div>
                )}
              </div>
            </div>
            </CardShell>
          </motion.div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <CardShell>
            <div className="flex items-center justify-between border-b border-[#e8efeb] px-5 py-4">
              <h2 className={typography.sectionTitle}>Recent Properties</h2>
              <LinkLike href="/admin/listings-approval" label="View All" />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-[#f8fbf9] text-left text-[#52606d]">
                    <th className="whitespace-nowrap px-5 py-3 font-semibold">Property</th>
                    <th className="whitespace-nowrap px-5 py-3 font-semibold">Location</th>
                    <th className="whitespace-nowrap px-5 py-3 font-semibold">Status</th>
                    <th className="whitespace-nowrap px-5 py-3 font-semibold">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProperties.length ? (
                    recentProperties.map((listing) => (
                      <tr key={listing.id} className="border-t border-[#edf2ef]">
                        <td
                          className="max-w-[220px] truncate px-5 py-3 font-semibold text-[#243b53]"
                          title={listing.title}
                        >
                          {listing.title}
                        </td>
                        <td
                          className="max-w-[180px] truncate px-5 py-3 font-normal text-[#52606d]"
                          title={listing.location}
                        >
                          {listing.location}
                        </td>
                        <td className="px-5 py-3">
                          <StatusPill value={listing.listingType || "pending"} />
                        </td>
                        <td className="px-5 py-3 font-medium text-[#243b53]">
                          {listing.currency} {fmtMoney(listing.price)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-500">
                        No recent properties found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardShell>

          <CardShell>
            <div className="flex items-center justify-between border-b border-[#e8efeb] px-5 py-4">
              <h2 className={typography.sectionTitle}>Top Owners</h2>
              <LinkLike href="/admin/users" label="View All" />
            </div>

            <div className="divide-y divide-[#edf2ef]">
              {topOwners.length ? (
                topOwners.map((owner) => (
                  <div key={owner.id} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <MiniAvatar name={owner.name} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[#243b53]">{owner.name}</p>
                        <p className="text-sm text-[#7b8794]">
                          {formatLabel(owner.role)} Owner
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-[18px] font-bold text-[#243b53]">
                        {fmtNumber(owner.propertyCount)}
                      </p>
                      <p className="text-sm text-[#7b8794]">Properties</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-5 py-10 text-center text-sm text-slate-500">
                  No owner data available.
                </div>
              )}
            </div>
          </CardShell>
        </section>

        <section>
          <CardShell>
            <div className="flex items-center justify-between border-b border-[#e8efeb] px-5 py-4">
              <h2 className={typography.sectionTitle}>Latest Leads</h2>
              <LinkLike href="/admin/reports" label="View All" />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-[#f8fbf9] text-left text-[#52606d]">
                    <th className="whitespace-nowrap px-5 py-3 font-semibold">Name</th>
                    <th className="whitespace-nowrap px-5 py-3 font-semibold">Email</th>
                    <th className="whitespace-nowrap px-5 py-3 font-semibold">Interested In</th>
                    <th className="whitespace-nowrap px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {latestLeads.length ? (
                    latestLeads.map((report) => (
                      <tr key={report.id} className="border-t border-[#edf2ef]">
                        <td className="max-w-[180px] truncate px-5 py-3 font-semibold text-[#316249]">
                          {report.reporterName || "Unknown"}
                        </td>
                        <td className="max-w-[180px] truncate px-5 py-3 font-normal text-[#52606d]">
                          {report.reporterName || "Unknown"}
                        </td>
                        <td
                          className="max-w-[220px] truncate px-5 py-3 font-normal text-[#52606d]"
                          title={report.propertyTitle || report.reason}
                        >
                          {report.propertyTitle || report.reason}
                        </td>
                        <td className="px-5 py-3">
                          <StatusPill value={report.status || "pending"} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-500">
                        No latest leads available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardShell>
        </section>
      </div>
    </main>
  );
}
