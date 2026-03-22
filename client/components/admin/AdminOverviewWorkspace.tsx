"use client";

import * as React from "react";
import { apiFetchAdmin } from "@/app/lib/api";
import AdminToast from "@/components/admin/AdminToast";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  RefreshCcw,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
  Users,
  XCircle,
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

function fmtDate(value?: string) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatLabel(value: string) {
  if (!value) return "Unknown";
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function CardShell({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "emerald" | "sky";
}) {
  const ring =
    tone === "emerald"
      ? "border-emerald-100 shadow-emerald-100/60"
      : tone === "sky"
      ? "border-sky-100 shadow-sky-100/60"
      : "border-slate-200 shadow-slate-100";

  return <section className={cn("rounded-[28px] border bg-white shadow-sm", ring)}>{children}</section>;
}

function StatCard({
  title,
  value,
  detail,
  icon,
  tone,
}: {
  title: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <div className={cn("rounded-[28px] border p-5 shadow-sm", tone)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-600">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{detail}</p>
        </div>
        <div className="rounded-2xl bg-slate-900 p-3 text-white">{icon}</div>
      </div>
    </div>
  );
}

function LinkLike({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:underline"
    >
      {label}
      <ArrowRight className="h-4 w-4" />
    </a>
  );
}

function StatusPill({ value }: { value: string }) {
  const lower = value.toLowerCase();
  const tone =
    lower === "paid" || lower === "active" || lower === "reviewed"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : lower === "pending"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : lower === "rejected" || lower === "suspended" || lower === "failed"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-slate-200 bg-slate-100 text-slate-700";

  return (
    <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-semibold", tone)}>
      {formatLabel(value)}
    </span>
  );
}

export default function AdminOverviewWorkspace() {
  const [overview, setOverview] = React.useState<OverviewResponse>(EMPTY_OVERVIEW);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [actingId, setActingId] = React.useState<string | null>(null);
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

  async function moderateListing(id: string, action: "approve" | "reject") {
    setActingId(id);
    try {
      await apiFetchAdmin(`/properties/admin/${id}/${action}`, { method: "PATCH" });
      await loadOverview(true);
      setNotice({
        tone: "success",
        message: action === "approve" ? "Listing approved successfully." : "Listing rejected successfully.",
      });
    } catch (err: any) {
      setNotice({
        tone: "error",
        message: err?.message || `Failed to ${action} listing`,
      });
    } finally {
      setActingId(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(15,23,42,0.08),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] p-4 sm:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="h-56 rounded-[32px] bg-slate-200/80" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-32 rounded-[28px] bg-white shadow-sm" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="h-80 rounded-[28px] bg-white shadow-sm" />
            <div className="h-80 rounded-[28px] bg-white shadow-sm" />
          </div>
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_380px]">
            <div className="space-y-6">
              <div className="h-96 rounded-[28px] bg-white shadow-sm" />
              <div className="h-80 rounded-[28px] bg-white shadow-sm" />
            </div>
            <div className="space-y-6">
              <div className="h-72 rounded-[28px] bg-white shadow-sm" />
              <div className="h-80 rounded-[28px] bg-white shadow-sm" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(15,23,42,0.08),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] p-4 sm:p-6">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-rose-200 bg-white p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-rose-100 p-3 text-rose-600">
              <TriangleAlert className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Overview failed to load</h1>
              <p className="mt-2 text-sm text-slate-500">{error}</p>
              <button
                type="button"
                onClick={() => void loadOverview()}
                className="mt-5 rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const propertyStatusMax = Math.max(
    1,
    ...overview.charts.propertyStatus.map((row) => row.value || 0)
  );
  const userRoleMax = Math.max(1, ...overview.charts.userRoles.map((row) => row.value || 0));

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(15,23,42,0.08),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] p-4 sm:p-6">
      <AdminToast
        show={!!notice}
        message={notice?.message || ""}
        tone={notice?.tone || "success"}
      />

      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[34px] border border-slate-200/80 bg-[linear-gradient(135deg,#0f172a_0%,#134e4a_46%,#ecfdf5_100%)] px-6 py-7 text-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.85)] sm:px-8 sm:py-9">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-end">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-50">
                <Sparkles className="h-3.5 w-3.5" />
                Live admin overview
              </span>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Admin dashboard
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
                Review platform health, moderate pending listings, track revenue, and watch
                user and report activity from one real-time control surface.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/80">
                Live snapshot
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/20 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                    Pending approvals
                  </p>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {fmtNumber(overview.stats.properties.pending)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/20 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                    Pending reports
                  </p>
                  <p className="mt-2 text-2xl font-bold text-white">
                    {fmtNumber(overview.stats.reports.pending)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void loadOverview(true)}
                disabled={refreshing}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-60"
              >
                <RefreshCcw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                {refreshing ? "Refreshing..." : "Refresh dashboard"}
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            title="Active listings"
            value={fmtNumber(overview.stats.properties.active)}
            detail={`${fmtNumber(overview.stats.properties.pending)} waiting for approval`}
            tone="border-emerald-100 bg-emerald-50/80"
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
          <StatCard
            title="Total reports"
            value={fmtNumber(overview.stats.reports.total)}
            detail={`${fmtNumber(overview.stats.reports.pending)} still pending`}
            tone="border-amber-100 bg-amber-50/80"
            icon={<ShieldAlert className="h-5 w-5" />}
          />
          <StatCard
            title="Paid revenue"
            value={`NPR ${fmtMoney(overview.stats.commerce.paidRevenue)}`}
            detail={`${fmtNumber(overview.stats.commerce.paidPayments)} paid transactions`}
            tone="border-sky-100 bg-sky-50/80"
            icon={<CreditCard className="h-5 w-5" />}
          />
          <StatCard
            title="Reservations"
            value={fmtNumber(overview.stats.commerce.totalReservations)}
            detail={`${fmtNumber(overview.stats.commerce.confirmedReservations)} confirmed`}
            tone="border-violet-100 bg-violet-50/80"
            icon={<Clock3 className="h-5 w-5" />}
          />
          <StatCard
            title="Users"
            value={fmtNumber(overview.stats.users.total)}
            detail={`${fmtNumber(overview.stats.users.active)} active accounts`}
            tone="border-slate-200 bg-white"
            icon={<Users className="h-5 w-5" />}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <CardShell tone="emerald">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Revenue trend</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Real paid revenue from successful platform payments.
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                Last 6 months
              </span>
            </div>
            <div className="h-72 px-2 pb-5 sm:px-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview.charts.revenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#10b981" radius={[10, 10, 4, 4]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardShell>

          <CardShell tone="sky">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Moderation status</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Current distribution of listing reports by workflow state.
                </p>
              </div>
              <LinkLike href="/admin/reports" label="Open reports" />
            </div>
            <div className="h-72 px-2 pb-5 sm:px-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview.charts.moderation}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0f766e" radius={[10, 10, 4, 4]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardShell>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_380px]">
          <div className="space-y-6">
            <CardShell>
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Listings pending approval</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Approve or reject new listings directly from the overview queue.
                  </p>
                </div>
                <LinkLike href="/admin/listings-approval" label="Open queue" />
              </div>

              {!overview.lists.pendingListings.length ? (
                <div className="px-5 pb-6">
                  <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                    No pending listings right now.
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-4 px-4 pb-4 md:hidden">
                    {overview.lists.pendingListings.map((listing) => (
                      <div
                        key={listing.id}
                        className="rounded-[24px] border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-16 w-20 overflow-hidden rounded-2xl bg-slate-200">
                            {listing.image ? (
                              <img
                                src={listing.image}
                                alt={listing.title}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-slate-900">
                              {listing.title}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">{listing.location}</p>
                            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                              {listing.propertyType} / {listing.listingType}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                          <span>{listing.sellerName}</span>
                          <span>
                            {listing.currency} {fmtMoney(listing.price)}
                          </span>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            onClick={() => void moderateListing(listing.id, "approve")}
                            disabled={actingId === listing.id}
                            className="flex-1 rounded-2xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => void moderateListing(listing.id, "reject")}
                            disabled={actingId === listing.id}
                            className="flex-1 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden overflow-x-auto md:block">
                    <table className="min-w-[920px] w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-5 py-4 text-left font-semibold">Property</th>
                          <th className="px-5 py-4 text-left font-semibold">Seller</th>
                          <th className="px-5 py-4 text-left font-semibold">Type</th>
                          <th className="px-5 py-4 text-left font-semibold">Price</th>
                          <th className="px-5 py-4 text-left font-semibold">Created</th>
                          <th className="px-5 py-4 text-right font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.lists.pendingListings.map((listing) => (
                          <tr
                            key={listing.id}
                            className="border-t border-slate-200 transition hover:bg-slate-50/70"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-12 w-16 overflow-hidden rounded-xl bg-slate-200">
                                  {listing.image ? (
                                    <img
                                      src={listing.image}
                                      alt={listing.title}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : null}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-slate-900">
                                    {listing.title}
                                  </p>
                                  <p className="truncate text-sm text-slate-500">
                                    {listing.location}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-slate-700">{listing.sellerName}</td>
                            <td className="px-5 py-4 text-slate-600">
                              {formatLabel(listing.propertyType)} / {formatLabel(listing.listingType)}
                            </td>
                            <td className="px-5 py-4 text-slate-700">
                              {listing.currency} {fmtMoney(listing.price)}
                            </td>
                            <td className="px-5 py-4 text-slate-600">
                              {fmtDate(listing.createdAt)}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => void moderateListing(listing.id, "approve")}
                                  disabled={actingId === listing.id}
                                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void moderateListing(listing.id, "reject")}
                                  disabled={actingId === listing.id}
                                  className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                                >
                                  <XCircle className="h-4 w-4" />
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardShell>

            <CardShell tone="sky">
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Recent reports</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Latest moderation items from the reports queue.
                  </p>
                </div>
                <LinkLike href="/admin/reports" label="Open reports" />
              </div>
              <div className="space-y-3 px-5 pb-5">
                {overview.lists.recentReports.map((report) => (
                  <div
                    key={report.id}
                    className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{report.propertyTitle}</p>
                        <p className="mt-1 text-sm text-slate-500">{report.reason}</p>
                        <p className="mt-2 text-xs text-slate-400">
                          Reporter: {report.reporterName} • {fmtDate(report.createdAt)}
                        </p>
                      </div>
                      <StatusPill value={report.status} />
                    </div>
                    <p className="mt-3 text-sm text-slate-500">{report.propertyLocation}</p>
                    {report.message ? (
                      <p className="mt-3 text-sm leading-6 text-slate-600">{report.message}</p>
                    ) : null}
                  </div>
                ))}
                {!overview.lists.recentReports.length ? (
                  <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                    No reports submitted yet.
                  </div>
                ) : null}
              </div>
            </CardShell>
          </div>

          <div className="space-y-6">
            <CardShell tone="emerald">
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Recent payments</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Latest payment attempts across the platform.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
                  Views 30d: {fmtNumber(overview.stats.commerce.propertyViews30d)}
                </span>
              </div>
              <div className="space-y-3 px-5 pb-5">
                {overview.lists.recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{payment.propertyTitle}</p>
                        <p className="mt-1 text-sm text-slate-500">{payment.buyerName}</p>
                      </div>
                      <StatusPill value={payment.status} />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                      <span>{formatLabel(payment.gateway)}</span>
                      <span className="font-semibold text-slate-900">
                        NPR {fmtMoney(payment.amount)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">{fmtDate(payment.createdAt)}</p>
                  </div>
                ))}
                {!overview.lists.recentPayments.length ? (
                  <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                    No payment activity yet.
                  </div>
                ) : null}
              </div>
            </CardShell>

            <CardShell>
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">User activity</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Recent accounts and role distribution.
                  </p>
                </div>
                <LinkLike href="/admin/users" label="Open users" />
              </div>
              <div className="space-y-5 px-5 pb-5">
                <div className="space-y-3">
                  {overview.charts.userRoles.map((row) => (
                    <div key={row.name}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-700">{row.name}</span>
                        <span className="text-slate-500">{fmtNumber(row.value)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-emerald-600"
                          style={{ width: `${(row.value / userRoleMax) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  {overview.lists.recentUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{user.name}</p>
                        <p className="truncate text-sm text-slate-500">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusPill value={user.status} />
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                          {formatLabel(user.role)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardShell>

            <CardShell tone="sky">
              <div className="px-5 py-4">
                <h2 className="text-lg font-bold text-slate-900">Platform mix</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Property pipeline and top moderation reasons.
                </p>
              </div>
              <div className="space-y-5 px-5 pb-5">
                <div className="space-y-3">
                  {overview.charts.propertyStatus.map((row) => (
                    <div key={row.name}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-700">{row.name}</span>
                        <span className="text-slate-500">{fmtNumber(row.value)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-sky-600"
                          style={{ width: `${(row.value / propertyStatusMax) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  {overview.lists.topReportReasons.map((reason) => (
                    <div
                      key={reason.reason}
                      className="flex items-center justify-between rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3"
                    >
                      <span className="text-sm font-semibold text-slate-700">
                        {reason.reason}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                        {fmtNumber(reason.count)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardShell>
          </div>
        </section>
      </div>
    </main>
  );
}
