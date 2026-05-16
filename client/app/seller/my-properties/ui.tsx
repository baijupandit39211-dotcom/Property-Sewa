"use client";

import Link from "next/link";
import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import CountUp from "react-countup";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import {
  CalendarClock,
  ChevronRight,
  Eye,
  MapPin,
  PencilLine,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from "lucide-react";

type RangeOption = "7d" | "30d" | "90d";
type SortOption =
  | "newest"
  | "oldest"
  | "price_high"
  | "price_low"
  | "views"
  | "leads"
  | "visits";

export type Summary = {
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
  averageDailyViews: number;
  viewsDelta: number;
  leadsDelta: number;
  visitsDelta: number;
};

export type ActivityItem = {
  id: string;
  type: "lead" | "visit";
  status: string;
  occurredAt: string;
  propertyId: string;
  propertyTitle: string;
  href: string;
  actorName: string;
};

export type PropertyRow = {
  id: string;
  title: string;
  location: string;
  status: "active" | "pending" | "rejected" | "draft";
  listingType: "buy" | "rent";
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

const BRAND = "#316249";
const PENDING = "#f59e0b";
const REJECTED = "#f43f5e";
const DRAFT = "#94a3b8";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(Number(value || 0));
}

function formatCurrency(value: number, currency: string) {
  return `${currency} ${formatNumber(value)}`;
}

function formatPercent(value: number) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatDate(value?: string | null, fallback = "No activity yet") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value?: string | null, fallback = "Unknown") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function titleCase(value: string) {
  return String(value || "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusTone(status: PropertyRow["status"]) {
  if (status === "active") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "pending") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (status === "rejected") return "bg-rose-50 text-rose-700 ring-rose-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function activityTone(status: string) {
  if (status === "completed" || status === "closed") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "requested" || status === "new" || status === "pending") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (status === "rejected" || status === "failed") return "bg-rose-50 text-rose-700 ring-rose-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export function MyPropertiesHero({
  range,
  onChangeRange,
  isRefreshing,
  onRefresh,
  rangeOptions,
}: {
  range: RangeOption;
  onChangeRange: (next: RangeOption) => void;
  isRefreshing: boolean;
  onRefresh: () => void;
  rangeOptions: Array<{ value: RangeOption; label: string }>;
}) {
  return (
    <section className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-6 text-white shadow-[0_18px_48px_rgba(19,74,54,0.16)] md:px-8 md:py-7">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(19,236,128,0.16),transparent_32%),radial-gradient(circle_at_82%_38%,rgba(255,255,255,0.12),transparent_42%)]" />
      <div className="absolute inset-y-0 right-0 w-[42%] bg-[radial-gradient(circle_at_center,rgba(236,246,240,0.20)_0%,rgba(236,246,240,0.04)_58%,transparent_100%)]" />
      <div className="absolute -right-10 top-10 h-40 w-40 rounded-full border border-white/12" />
      <div className="absolute bottom-0 right-20 h-24 w-24 rounded-full bg-white/10 blur-2xl" />

      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl space-y-5">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">My Properties</h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-6 text-white/85">
              Manage your property listings, track performance, and grow your business.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {rangeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChangeRange(option.value)}
                className={cn(
                  "rounded-2xl border px-4 py-2 text-sm font-semibold transition",
                  range === option.value
                    ? "border-white bg-white text-slate-950"
                    : "border-white/15 bg-white/10 text-white hover:border-white/25 hover:bg-white/15"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onRefresh}
            className="relative z-10 inline-flex h-11 items-center gap-2 self-start rounded-2xl border border-white/15 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white/25 hover:bg-white/15"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            Refresh
          </button>

          <Link
            href="/seller/add-property"
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#316249_0%,#3E7A5C_100%)] px-5 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(49,98,73,0.22)] transition hover:-translate-y-0.5 hover:bg-[linear-gradient(135deg,#28513D_0%,#316249_100%)]"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-white/15 ring-1 ring-white/20">
              +
            </span>
            Add Property
          </Link>
        </div>
      </div>
    </section>
  );
}

function KpiCard({
  title,
  value,
  tone,
  icon,
}: {
  title: string;
  value: number;
  tone: string;
  icon: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      whileHover={reduceMotion ? undefined : { y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={cn("rounded-2xl border bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]", tone)}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            {title}
          </div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            <CountUp end={Number(value || 0)} duration={0.9} separator="," preserveValue />
          </div>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-50 text-slate-700 ring-1 ring-slate-200">
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

export function KpiStrip({ summary }: { summary: Summary }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.section
      initial={reduceMotion ? false : "hidden"}
      animate={reduceMotion ? undefined : "show"}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.08, delayChildren: 0.02 } },
      }}
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
    >
      {[
        {
          title: "Total Listings",
          value: summary.totalListings,
          tone: "border-slate-200",
          icon: <span className="text-sm font-bold">T</span>,
        },
        {
          title: "Active",
          value: summary.activeListings,
          tone: "border-emerald-200 bg-[linear-gradient(135deg,#ffffff_0%,#f0fbf6_100%)]",
          icon: <span className="text-sm font-bold text-emerald-700">A</span>,
        },
        {
          title: "Pending",
          value: summary.pendingListings,
          tone: "border-amber-200 bg-[linear-gradient(135deg,#ffffff_0%,#fff8eb_100%)]",
          icon: <span className="text-sm font-bold text-amber-700">P</span>,
        },
        {
          title: "Rejected",
          value: summary.rejectedListings,
          tone: "border-rose-200 bg-[linear-gradient(135deg,#ffffff_0%,#fff1f4_100%)]",
          icon: <span className="text-sm font-bold text-rose-700">R</span>,
        },
        {
          title: "Draft",
          value: summary.draftListings,
          tone: "border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f5f7fb_100%)]",
          icon: <span className="text-sm font-bold text-slate-700">D</span>,
        },
      ].map((card) => (
        <motion.div
          key={card.title}
          variants={{
            hidden: { opacity: 0, y: 14, scale: 0.99 },
            show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.42, ease: "easeOut" } },
          }}
        >
          <KpiCard {...card} />
        </motion.div>
      ))}
    </motion.section>
  );
}

export function FiltersBar({
  search,
  onChangeSearch,
  statusFilter,
  onChangeStatus,
  listingTypeFilter,
  onChangeType,
  sort,
  onChangeSort,
  sortOptions,
}: {
  search: string;
  onChangeSearch: (v: string) => void;
  statusFilter: "all" | PropertyRow["status"];
  onChangeStatus: (v: "all" | PropertyRow["status"]) => void;
  listingTypeFilter: "all" | PropertyRow["listingType"];
  onChangeType: (v: "all" | PropertyRow["listingType"]) => void;
  sort: SortOption;
  onChangeSort: (v: SortOption) => void;
  sortOptions: Array<{ value: SortOption; label: string }>;
}) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_160px_180px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => onChangeSearch(e.target.value)}
            placeholder="Search by title, location..."
            className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-300 focus:bg-white"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => onChangeStatus(e.target.value as any)}
          className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-300 focus:bg-white"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
          <option value="draft">Draft</option>
        </select>

        <select
          value={listingTypeFilter}
          onChange={(e) => onChangeType(e.target.value as any)}
          className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-300 focus:bg-white"
        >
          <option value="all">All Types</option>
          <option value="buy">Buy</option>
          <option value="rent">Rent</option>
        </select>

        <select
          value={sort}
          onChange={(e) => onChangeSort(e.target.value as SortOption)}
          className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-300 focus:bg-white"
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}

function MetricMini({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-2xl bg-slate-50 text-slate-700 ring-1 ring-slate-200">
        {icon}
      </span>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div>
        <div className="mt-1 text-lg font-bold tracking-tight text-slate-950">{value}</div>
      </div>
    </div>
  );
}

function LatestActivity({ row }: { row: PropertyRow }) {
  const latest = row.lastLeadAt || row.lastVisitAt;
  const label = row.lastLeadAt ? "New lead received" : row.lastVisitAt ? "Visit requested" : "No recent activity";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Latest Activity</div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{label}</div>
      <div className="mt-1 text-xs text-slate-500">{formatDateTime(latest, "No activity yet")}</div>
    </div>
  );
}

function PropertyRowCard({
  row,
  onRequestDelete,
}: {
  row: PropertyRow;
  onRequestDelete: (row: PropertyRow) => void;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.article
      whileHover={reduceMotion ? undefined : { y: -2 }}
      transition={{ duration: 0.18 }}
      className="rounded-[24px] border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.04)]"
    >
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_260px] lg:items-start">
        {/* Left */}
        <div className="flex gap-4">
          <div className="h-24 w-28 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
            {row.image ? (
              <img
                src={row.image}
                alt={row.title}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                No image
              </div>
            )}
          </div>

          <div className="min-w-0">
            <span
              className={cn(
                "inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1",
                statusTone(row.status)
              )}
            >
              {titleCase(row.status)}
            </span>
            <div className="mt-2 text-base font-semibold text-slate-950">{row.title}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <MapPin className="h-4 w-4 text-slate-400" />
              <span className="truncate">{row.location}</span>
            </div>
            <div className="mt-3 text-sm font-bold text-[#316249]">
              {formatCurrency(row.price, row.currency)}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Listed on {formatDate(row.createdAt, "Unknown")}
            </div>
          </div>
        </div>

        {/* Middle metrics */}
        <div className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 sm:grid-cols-4 lg:grid-cols-2">
          <MetricMini label="Views" value={formatNumber(row.views)} icon={<Eye className="h-4 w-4" />} />
          <MetricMini label="Leads" value={formatNumber(row.leads)} icon={<Users className="h-4 w-4" />} />
          <MetricMini label="Visits" value={formatNumber(row.visits)} icon={<CalendarClock className="h-4 w-4" />} />
          <MetricMini label="Conversion" value={formatPercent(row.conversionRate)} icon={<span className="text-xs font-bold">%</span>} />
        </div>

        {/* Right */}
        <div className="space-y-3">
          <LatestActivity row={row} />

          <div className="grid gap-2">
            <Link
              href={`/seller/property/${row.id}`}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100"
            >
              <ChevronRight className="h-4 w-4" />
              View
            </Link>
            <Link
              href={`/seller/edit-property/${row.id}`}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50"
            >
              <PencilLine className="h-4 w-4" />
              Edit
            </Link>
            <button
              type="button"
              onClick={() => onRequestDelete(row)}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export function PropertyList({
  rows,
  onRequestDelete,
}: {
  rows: PropertyRow[];
  onRequestDelete: (row: PropertyRow) => void;
}) {
  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <PropertyRowCard key={row.id} row={row} onRequestDelete={onRequestDelete} />
      ))}
    </div>
  );
}

export function TopListingCard({ top }: { top: PropertyRow | null }) {
  if (!top) return null;
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Top Listing</div>
      <div className="mt-4 overflow-hidden rounded-[20px] border border-slate-200 bg-slate-50">
        <div className="aspect-[16/10] w-full overflow-hidden bg-slate-100">
          {top.image ? (
            <img src={top.image} alt={top.title} className="h-full w-full object-cover" loading="lazy" />
          ) : null}
        </div>
        <div className="p-4">
          <div className="text-base font-bold tracking-tight text-slate-950">{top.title}</div>
          <div className="mt-1 text-xs text-slate-500">{top.location}</div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-center">
              <div className="font-bold text-slate-900">{formatNumber(top.views)}</div>
              <div className="mt-0.5 text-slate-500">Views</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-center">
              <div className="font-bold text-slate-900">{formatNumber(top.leads)}</div>
              <div className="mt-0.5 text-slate-500">Leads</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-center">
              <div className="font-bold text-slate-900">{formatNumber(top.visits)}</div>
              <div className="mt-0.5 text-slate-500">Visits</div>
            </div>
          </div>
          <Link
            href={`/seller/property/${top.id}`}
            className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[#316249] text-sm font-semibold text-white transition hover:bg-[#28513D]"
          >
            View Details
          </Link>
        </div>
      </div>
    </section>
  );
}

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; payload?: any }>;
}) {
  if (!active || !payload?.length) return null;
  const datum = payload[0]?.payload ?? payload[0];
  const name = String(datum?.name ?? "");
  const value = Number(datum?.value ?? 0);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-sm shadow-[0_16px_36px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{name}</div>
      <div className="mt-2 font-bold text-slate-900">{formatNumber(value)}</div>
    </div>
  );
}

export function StatusSummaryDonut({ summary }: { summary: Summary }) {
  const reduceMotion = useReducedMotion();
  const data = [
    { name: "Active", value: summary.activeListings, color: BRAND },
    { name: "Pending", value: summary.pendingListings, color: PENDING },
    { name: "Rejected", value: summary.rejectedListings, color: REJECTED },
    { name: "Draft", value: summary.draftListings, color: DRAFT },
  ].filter((d) => d.value > 0);

  const total = summary.totalListings || 0;

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Status Summary</div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-center">
        <div className="relative h-[160px] w-[160px] justify-self-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.length ? data : [{ name: "Total", value: 1, color: "#e2e8f0" }]}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={76}
                paddingAngle={1.5}
                stroke="transparent"
                isAnimationActive={!reduceMotion}
                animationDuration={900}
              >
                {(data.length ? data : [{ name: "Total", value: 1, color: "#e2e8f0" }]).map((entry, index) => (
                  <Cell key={`${entry.name}-${index}`} fill={(entry as any).color} />
                ))}
              </Pie>
              <Tooltip content={<DonutTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-semibold tracking-tight text-slate-950">
              <CountUp end={total} duration={0.9} separator="," preserveValue />
            </div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Total
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {[
            { label: "Active", value: summary.activeListings, color: BRAND },
            { label: "Pending", value: summary.pendingListings, color: PENDING },
            { label: "Rejected", value: summary.rejectedListings, color: REJECTED },
            { label: "Draft", value: summary.draftListings, color: DRAFT },
          ].map((item) => {
            const pct = total ? Math.round((item.value / total) * 100) : 0;
            return (
              <div
                key={item.label}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-block h-3.5 w-3.5 rounded-[4px]" style={{ backgroundColor: item.color }} />
                  <div className="text-sm font-semibold text-slate-700">{item.label}</div>
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {formatNumber(item.value)} <span className="text-xs font-semibold text-slate-500">({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function RecentActivityCard({ items }: { items: ActivityItem[] }) {
  return (
    <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Recent Activity</div>
        <Link href="/seller/analytics" className="text-sm font-semibold text-[#316249] transition hover:text-[#28513D]">
          View All Activity
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
            No lead or visit activity has been recorded yet.
          </div>
        ) : (
          items.map((item) => (
            <Link
              key={`${item.type}-${item.id}`}
              href={item.href}
              className="block rounded-[20px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] px-4 py-4 transition hover:border-slate-300 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ring-1",
                        activityTone(item.status)
                      )}
                    >
                      {titleCase(item.status)}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                      {item.type}
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">
                    {item.actorName} on {item.propertyTitle}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{formatDateTime(item.occurredAt)}</div>
                </div>
                <ChevronRight className="h-4 w-4 flex-none text-slate-300" />
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

export function PaginationBar({
  page,
  totalPages,
  onChangePage,
}: {
  page: number;
  totalPages: number;
  onChangePage: (p: number) => void;
}) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChangePage(Math.max(1, page - 1))}
        className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
      >
        Prev
      </button>
      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChangePage(p)}
          className={cn(
            "grid h-10 w-10 place-items-center rounded-2xl border text-sm font-bold transition",
            p === page
              ? "border-[#316249] bg-[#316249] text-white"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          )}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChangePage(Math.min(totalPages, page + 1))}
        className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}
