"use client";

import * as React from "react";
import { apiFetchAdmin } from "@/app/lib/api";
import AdminToast from "@/components/admin/AdminToast";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Clock3,
  CreditCard,
  Filter,
  Flag,
  Home,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Users,
} from "lucide-react";

type ActivitySource = "audit" | "user" | "property" | "report" | "payment" | "reservation";
type ActivityCategory = "admin" | "user" | "content" | "moderation" | "commerce";

type ActivityItem = {
  id: string;
  source: ActivitySource;
  category: ActivityCategory;
  action: string;
  title: string;
  description: string;
  status: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  subjectName: string;
  subjectType: string;
  href: string | null;
  metadata: Record<string, unknown>;
};

type ActivityResponse = {
  success: boolean;
  items: ActivityItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  stats: {
    total: number;
    last24h: number;
    sourceCounts: Record<ActivitySource, number>;
    categoryCounts: Record<ActivityCategory, number>;
  };
  filters: {
    source: string;
    category: string;
    status: string;
    search: string;
  };
};

const SOURCE_OPTIONS = [
  { value: "all", label: "All sources" },
  { value: "audit", label: "Admin actions" },
  { value: "user", label: "Users" },
  { value: "property", label: "Listings" },
  { value: "report", label: "Reports" },
  { value: "payment", label: "Payments" },
  { value: "reservation", label: "Reservations" },
] as const;

const CATEGORY_OPTIONS = [
  { value: "all", label: "All categories" },
  { value: "admin", label: "Admin" },
  { value: "user", label: "User" },
  { value: "content", label: "Content" },
  { value: "moderation", label: "Moderation" },
  { value: "commerce", label: "Commerce" },
] as const;

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "paid", label: "Paid" },
  { value: "recorded", label: "Recorded" },
  { value: "requested", label: "Requested" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
] as const;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatLabel(value: string) {
  if (!value) return "Unknown";
  return value.replace(/[_\.]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  const diffMs = date.getTime() - Date.now();
  const absSeconds = Math.round(Math.abs(diffMs) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (absSeconds < 60) return rtf.format(Math.round(diffMs / 1000), "second");
  if (absSeconds < 3600) return rtf.format(Math.round(diffMs / (60 * 1000)), "minute");
  if (absSeconds < 86400) return rtf.format(Math.round(diffMs / (60 * 60 * 1000)), "hour");
  return rtf.format(Math.round(diffMs / (24 * 60 * 60 * 1000)), "day");
}

function sourceIcon(source: ActivitySource) {
  if (source === "audit") return Shield;
  if (source === "user") return Users;
  if (source === "property") return Home;
  if (source === "report") return Flag;
  if (source === "payment") return CreditCard;
  return Activity;
}

function sourceTone(source: ActivitySource) {
  if (source === "audit") return "bg-[#316249] text-white";
  if (source === "user") return "bg-[#e9f3ee] text-[#2a523d]";
  if (source === "property") return "bg-[#f4fbf7] text-[#316249]";
  if (source === "report") return "bg-amber-50 text-amber-800";
  if (source === "payment") return "bg-sky-50 text-sky-800";
  return "bg-[#f4fbf7] text-[#3f6f57]";
}

function statusTone(status: string) {
  const value = status.toLowerCase();
  if (value === "paid" || value === "active" || value === "recorded") {
    return "border-[#c9ddd2] bg-[#f4fbf7] text-[#2a523d]";
  }
  if (value === "pending" || value === "requested") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (value === "rejected" || value === "suspended" || value === "failed" || value === "archived") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-slate-200 bg-slate-100 text-slate-700";
}

function StatCard({
  title,
  value,
  detail,
  icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-[#d7e7df] bg-[linear-gradient(180deg,#ffffff_0%,#f4fbf7_100%)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-600">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{detail}</p>
        </div>
        <div className="rounded-2xl bg-[linear-gradient(135deg,#316249_0%,#5b8f73_100%)] p-3 text-white shadow-sm">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function RecentActivityPage() {
  const [items, setItems] = React.useState<ActivityItem[]>([]);
  const [stats, setStats] = React.useState<ActivityResponse["stats"]>({
    total: 0,
    last24h: 0,
    sourceCounts: {
      audit: 0,
      user: 0,
      property: 0,
      report: 0,
      payment: 0,
      reservation: 0,
    },
    categoryCounts: {
      admin: 0,
      user: 0,
      content: 0,
      moderation: 0,
      commerce: 0,
    },
  });
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(12);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [hasNext, setHasNext] = React.useState(false);
  const [hasPrev, setHasPrev] = React.useState(false);
  const [source, setSource] = React.useState("all");
  const [category, setCategory] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const timer = React.useRef<number | null>(null);

  const fetchActivity = React.useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(limit));
        if (source !== "all") params.set("source", source);
        if (category !== "all") params.set("category", category);
        if (status !== "all") params.set("status", status);
        if (search.trim()) params.set("search", search.trim());

        const res = await apiFetchAdmin<ActivityResponse>(`/api/admin/overview/activity?${params.toString()}`, {
          cache: "no-store",
        });

        setItems(res.items || []);
        setStats(res.stats);
        setTotal(res.total || 0);
        setPage(res.page || 1);
        setTotalPages(res.totalPages || 1);
        setHasNext(!!res.hasNext);
        setHasPrev(!!res.hasPrev);
      } catch (fetchError: any) {
        setError(fetchError?.message || "Failed to load activity feed");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, limit, source, category, status, search]
  );

  React.useEffect(() => {
    void fetchActivity();
  }, [fetchActivity]);

  React.useEffect(() => {
    if (!notice) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNotice(null), 2600);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [notice]);

  function submitFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  function resetFilters() {
    setSource("all");
    setCategory("all");
    setStatus("all");
    setSearchInput("");
    setSearch("");
    setPage(1);
  }

  const visibleSourceCards = [
    {
      title: "Admin actions",
      value: String(stats.sourceCounts.audit),
      detail: "Audit-log backed changes from the admin workspace.",
      icon: <Shield className="h-5 w-5" />,
    },
    {
      title: "Moderation events",
      value: String(stats.categoryCounts.moderation),
      detail: "Listing reports and review-side listing movement.",
      icon: <ShieldAlert className="h-5 w-5" />,
    },
    {
      title: "Commerce events",
      value: String(stats.categoryCounts.commerce),
      detail: "Payments and reservations flowing through the platform.",
      icon: <CreditCard className="h-5 w-5" />,
    },
    {
      title: "Last 24 hours",
      value: String(stats.last24h),
      detail: "Fresh activity inside the currently filtered feed.",
      icon: <Clock3 className="h-5 w-5" />,
    },
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.22),transparent_28%),radial-gradient(circle_at_top_right,rgba(52,211,153,0.12),transparent_24%),linear-gradient(180deg,#f3fff9_0%,#ecfdf5_100%)] p-4 sm:p-6">
      <AdminToast
        show={!!notice}
        message={notice?.message || ""}
        tone={notice?.tone || "success"}
      />

      <div className="mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-[32px] border border-[#c9ddd2]/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-7 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:px-8 sm:py-8">
          <div className="absolute inset-y-0 right-0 w-[42%] bg-[radial-gradient(circle_at_center,rgba(236,246,240,0.20)_0%,rgba(236,246,240,0.04)_58%,transparent_100%)]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-50">
                <Activity className="h-3.5 w-3.5" />
                Admin activity feed
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                Recent activity
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/90 sm:max-w-2xl sm:text-base">
                Review user operations, moderation events, listing submissions, payment movement, and reservation flow from one audit surface.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                void fetchActivity(true);
                setNotice({ tone: "success", message: "Refreshing activity feed." });
              }}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 self-start rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-60 lg:mt-2"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              {refreshing ? "Refreshing" : "Refresh"}
            </button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {visibleSourceCards.map((card) => (
            <StatCard
              key={card.title}
              title={card.title}
              value={card.value}
              detail={card.detail}
              icon={card.icon}
            />
          ))}
        </section>

        <section className="rounded-[30px] border border-[#d7e7df] bg-[linear-gradient(180deg,#ffffff_0%,#f4fbf7_100%)] shadow-sm">
          <div className="flex flex-col gap-4 border-b border-[#d7e7df] px-6 py-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">Filter feed</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Narrow the activity timeline by source, category, status, or keyword.
              </p>
            </div>
            <div className="rounded-full bg-[#f4fbf7] px-3 py-1 text-xs font-semibold text-[#316249] ring-1 ring-[#d7e7df]">
              <Filter className="mr-2 inline h-3.5 w-3.5" />
              Live filters
            </div>
          </div>

          <form className="grid gap-4 px-6 py-6 md:grid-cols-2 xl:grid-cols-5" onSubmit={submitFilters}>
            <label className="block xl:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Search</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search titles, users, subjects, or event text"
                  className="w-full rounded-2xl border border-[#d7e7df] bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#316249] focus:ring-4 focus:ring-[#d7e7df]"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Source</span>
              <select
                value={source}
                onChange={(event) => {
                  setSource(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-2xl border border-[#d7e7df] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#316249] focus:ring-4 focus:ring-[#d7e7df]"
              >
                {SOURCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Category</span>
              <select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-2xl border border-[#d7e7df] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#316249] focus:ring-4 focus:ring-[#d7e7df]"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Status</span>
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-2xl border border-[#d7e7df] bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#316249] focus:ring-4 focus:ring-[#d7e7df]"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap items-center gap-3 md:col-span-2 xl:col-span-5">
              <button
                type="submit"
                className="rounded-2xl bg-[#316249] px-5 py-3 text-sm font-semibold text-white hover:bg-[#274e3b]"
              >
                Apply filters
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-2xl border border-[#c9ddd2] px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-[#e9f3ee]"
              >
                Reset
              </button>
              <div className="text-sm text-slate-500">
                Current scope: <span className="font-semibold text-slate-700">{total}</span> events
              </div>
            </div>
          </form>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
          <div className="rounded-[30px] border border-[#d7e7df] bg-[linear-gradient(180deg,#ffffff_0%,#f4fbf7_100%)] shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d7e7df] px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">Timeline</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {loading ? "Loading activity..." : `${items.length} events on this page.`}
                </p>
              </div>
              <div className="rounded-full bg-[#f4fbf7] px-3 py-1 text-xs font-semibold text-[#316249] ring-1 ring-[#d7e7df]">
                Page {page} of {totalPages}
              </div>
            </div>

            {error ? (
              <div className="px-6 py-6">
                <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                  {error}
                </div>
              </div>
            ) : null}

            {loading ? (
              <div className="space-y-4 px-6 py-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="rounded-[24px] border border-[#d7e7df] bg-white p-5 shadow-sm">
                    <div className="flex animate-pulse gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-slate-200" />
                      <div className="flex-1 space-y-3">
                        <div className="h-4 w-52 rounded bg-slate-200" />
                        <div className="h-3 w-full rounded bg-slate-100" />
                        <div className="h-3 w-3/4 rounded bg-slate-100" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f4fbf7] text-[#316249]">
                  <Activity className="h-8 w-8" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">No activity found</h3>
                <p className="mt-2 mx-auto max-w-md text-sm text-slate-500">
                  Adjust the filters or search query to broaden the feed.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-5 rounded-2xl border border-[#c9ddd2] px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-[#e9f3ee]"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="space-y-4 px-6 py-6">
                {items.map((item) => {
                  const Icon = sourceIcon(item.source);
                  return (
                    <div
                      key={item.id}
                      className="rounded-[26px] border border-[#d7e7df] bg-white p-5 shadow-sm transition hover:border-[#c9ddd2] hover:bg-[#f4fbf7]"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 gap-4">
                          <div
                            className={cn(
                              "mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                              sourceTone(item.source)
                            )}
                          >
                            <Icon className="h-5 w-5" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base font-semibold text-slate-900">{item.title}</p>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
                                {formatLabel(item.source)}
                              </span>
                              <span
                                className={cn(
                                  "rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
                                  statusTone(item.status)
                                )}
                              >
                                {formatLabel(item.status)}
                              </span>
                            </div>

                            <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>

                            <div className="mt-4 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                              <span className="rounded-full border border-[#d7e7df] bg-[#f4fbf7] px-3 py-1 text-xs font-semibold text-[#2a523d]">
                                Actor: {item.actorName} ({item.actorRole})
                              </span>
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                                Subject: {item.subjectName}
                              </span>
                              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                                {formatLabel(item.category)}
                              </span>
                              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                                {formatLabel(item.action)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
                          <div className="text-right">
                            <p className="text-sm font-medium text-slate-700">{formatTime(item.timestamp)}</p>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                              {relativeTime(item.timestamp)}
                            </p>
                          </div>

                          {item.href ? (
                            <Link
                              href={item.href}
                              className="inline-flex items-center gap-2 rounded-2xl border border-[#c9ddd2] bg-[#f4fbf7] px-4 py-2 text-sm font-semibold text-[#316249] hover:bg-[#e9f3ee]"
                            >
                              Open
                              <ArrowUpRight className="h-4 w-4" />
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col gap-4 border-t border-[#d7e7df] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Showing {items.length ? (page - 1) * limit + 1 : 0}-{(page - 1) * limit + items.length} of {total}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Use page size to widen or tighten the review window.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={limit}
                  onChange={(event) => {
                    setLimit(Number(event.target.value));
                    setPage(1);
                  }}
                  className="rounded-2xl border border-[#d7e7df] px-4 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[#316249] focus:ring-4 focus:ring-[#d7e7df]"
                >
                  {[12, 24, 36, 48].map((value) => (
                    <option key={value} value={value}>
                      {value} / page
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!hasPrev}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="rounded-2xl border border-[#c9ddd2] px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-[#e9f3ee] disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={!hasNext}
                    onClick={() => setPage((current) => current + 1)}
                    className="rounded-2xl border border-[#c9ddd2] px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-[#e9f3ee] disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <section className="rounded-[30px] border border-[#d7e7df] bg-[linear-gradient(180deg,#ffffff_0%,#f4fbf7_100%)] p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Source breakdown</h2>
              <p className="mt-1 text-sm text-slate-500">Counts for the current feed scope.</p>
              <div className="mt-5 space-y-3">
                {SOURCE_OPTIONS.filter((option) => option.value !== "all").map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center justify-between rounded-2xl border border-[#d7e7df] bg-[#f4fbf7] px-4 py-3"
                  >
                    <span className="text-sm font-semibold text-slate-700">{option.label}</span>
                    <span className="text-base font-semibold text-slate-900">
                      {stats.sourceCounts[option.value as ActivitySource]}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[30px] border border-[#d7e7df] bg-[linear-gradient(180deg,#ffffff_0%,#f4fbf7_100%)] p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Category focus</h2>
              <p className="mt-1 text-sm text-slate-500">Quick operational mix across the feed.</p>
              <div className="mt-5 space-y-3">
                {CATEGORY_OPTIONS.filter((option) => option.value !== "all").map((option) => (
                  <div
                    key={option.value}
                    className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-white px-4 py-3"
                  >
                    <span className="text-sm font-semibold text-slate-700">{option.label}</span>
                    <span className="text-base font-semibold text-slate-900">
                      {stats.categoryCounts[option.value as ActivityCategory]}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[30px] border border-[#d7e7df] bg-[linear-gradient(180deg,#ffffff_0%,#f4fbf7_100%)] p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Feed logic</h2>
              <p className="mt-1 text-sm text-slate-500">
                This page merges multiple real collections into one normalized timeline.
              </p>
              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <div className="rounded-2xl border border-[#d7e7df] bg-[#f4fbf7] px-4 py-3">
                  Audit entries come from persisted admin user-management actions.
                </div>
                <div className="rounded-2xl border border-[#d7e7df] bg-[#f4fbf7] px-4 py-3">
                  Listing, report, payment, reservation, and signup events are inferred from their source models.
                </div>
                <div className="rounded-2xl border border-[#d7e7df] bg-[#f4fbf7] px-4 py-3">
                  Filtering is applied server-side before pagination so counts stay aligned with the visible feed.
                </div>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
