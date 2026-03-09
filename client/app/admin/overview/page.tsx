"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  CheckCircle2,
  XCircle,
  Home,
  Clock,
  DollarSign,
  ArrowUpRight,
  Sparkles,
  ShieldAlert,
} from "lucide-react";

type Property = {
  _id?: string;
  id?: string;

  // common
  title?: string;
  name?: string;

  location?: string;
  address?: string;

  images?: string[];
  imageUrls?: string[];

  createdAt?: string;

  ownerName?: string;
  sellerName?: string;
  user?: { name?: string };

  // optional for tabs (if your backend has it)
  type?: string;
  propertyType?: string;
  category?: string;
  listingType?: string;
};

type PendingRow = {
  id: string;
  title: string;
  location: string;
  image?: string;
  sellerName: string;
  date: string;
  kind?: "residential" | "commercial" | "other";
};

type ReportRow = {
  _id: string;
  reason: string;
  status: string;
  createdAt: string;
  message?: string;
  remarks?: string;
  property?: { title?: string; location?: string };
  propertyId?: { title?: string; location?: string };
  adId?: { title?: string; location?: string };
  reporter?: { name?: string };
  reporterId?: { name?: string };
};

type ModerationStats = {
  total: number;
  pending: number;
  reviewed: number;
  actionTaken: number;
  rejected: number;
  byReason: Array<{ reason: string; count: number }>;
  recent: ReportRow[];
};

const EMPTY_REPORT_STATS: ModerationStats = {
  total: 0,
  pending: 0,
  reviewed: 0,
  actionTaken: 0,
  rejected: 0,
  byReason: [],
  recent: [],
};

function fmt(n: number) {
  return new Intl.NumberFormat().format(n);
}
function money(n: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

function pickId(p: Property) {
  return (p._id || p.id || "") as string;
}
function pickTitle(p: Property) {
  return (p.title || p.name || "Untitled Property") as string;
}
function pickLocation(p: Property) {
  return (p.location || p.address || "—") as string;
}
function pickImage(p: Property) {
  const arr = (p.images?.length ? p.images : p.imageUrls) || [];
  return arr?.[0];
}
function pickSeller(p: Property) {
  return p.sellerName || p.ownerName || p.user?.name || "Seller";
}
function pickDate(p: Property) {
  if (!p.createdAt) return "—";
  const d = new Date(p.createdAt);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}
function pickKind(p: Property): PendingRow["kind"] {
  const raw =
    (p.type || p.propertyType || p.category || p.listingType || "").toLowerCase();

  if (raw.includes("res")) return "residential";
  if (raw.includes("com")) return "commercial";
  return raw ? "other" : undefined;
}

/** ✅ cookie auth kept */
async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

async function patchJSON<T>(url: string, body?: any): Promise<T> {
  const res = await fetch(url, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

/** tries /api/properties and /properties */
async function tryPropertyMount<T>(
  base: string,
  path: string,
  method: "GET" | "PATCH",
  body?: any
) {
  const a = `${base}/api/properties${path}`;
  const b = `${base}/properties${path}`;

  try {
    return method === "GET" ? await getJSON<T>(a) : await patchJSON<T>(a, body);
  } catch {
    return method === "GET" ? await getJSON<T>(b) : await patchJSON<T>(b, body);
  }
}

async function getReportStats<T>(base: string): Promise<T> {
  const a = `${base}/api/admin/reports/stats`;
  const b = `${base}/admin/reports/stats`;

  try {
    return await getJSON<T>(a);
  } catch {
    return await getJSON<T>(b);
  }
}

function pickReportProperty(report: ReportRow) {
  return report.property || report.propertyId || report.adId;
}

function pickReportReporter(report: ReportRow) {
  return report.reporter || report.reporterId;
}

function pickReportMessage(report: ReportRow) {
  return report.message || report.remarks || "";
}

function formatReportStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatReportDate(value?: string) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function CardShell({ children, tone = "slate" }: { children: React.ReactNode; tone?: "slate" | "emerald" | "sky" }) {
  const ring =
    tone === "emerald"
      ? "border-emerald-100 shadow-emerald-100/60"
      : tone === "sky"
        ? "border-sky-100 shadow-sky-100/60"
        : "border-slate-200 shadow-slate-100";

  return (
    <div className={`rounded-2xl border bg-white shadow-sm ${ring}`}>
      {children}
    </div>
  );
}

function StatCard({
  title,
  value,
  delta,
  icon: Icon,
  accent = "emerald",
  subtitle,
}: {
  title: string;
  value: string;
  delta?: string;
  icon: any;
  accent?: "emerald" | "slate";
  subtitle?: string;
}) {
  // Dark forest card styling (UI-only)
  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-900/60 bg-[#1f3b2d] shadow-sm shadow-emerald-900/40">
      <div className="pointer-events-none absolute -right-12 -top-10 h-28 w-28 rounded-full bg-emerald-700/25 blur-3xl" />
      <div className="pointer-events-none absolute -left-14 -bottom-14 h-24 w-24 rounded-full bg-emerald-500/20 blur-2xl" />

      <div className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs font-semibold text-emerald-100/90">{title}</p>
          <p className="mt-2 text-3xl font-extrabold text-white">{value}</p>
          <div className="mt-2 flex items-center gap-2">
            {delta ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300">
                <ArrowUpRight className="h-4 w-4" />
                {delta}
              </span>
            ) : null}
            {subtitle ? <span className="text-xs text-emerald-100/80">{subtitle}</span> : null}
          </div>
        </div>

        <div className="rounded-xl bg-white/10 p-3 ring-1 ring-emerald-700/50">
          <Icon className="h-5 w-5 text-emerald-100" />
        </div>
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  const API_BASE =
    (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "") || "http://localhost:5000";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [approvedCount, setApprovedCount] = useState(0);
  const [pendingRows, setPendingRows] = useState<PendingRow[]>([]);
  const [reportStats, setReportStats] = useState<ModerationStats>(EMPTY_REPORT_STATS);

  // UI state
  const [tab, setTab] = useState<"all" | "residential" | "commercial">("all");

  const moderationChartData = useMemo(
    () => [
      { name: "Pending", value: reportStats.pending },
      { name: "Reviewed", value: reportStats.reviewed },
      { name: "Action", value: reportStats.actionTaken },
      { name: "Rejected", value: reportStats.rejected },
    ],
    [reportStats]
  );

  // Revenue bar (derived from real counts)
  const revenueData = useMemo(() => {
    const base = approvedCount * 120 + pendingRows.length * 80;
    return [
      { name: "Dao", value: Math.floor(base * 0.34) },
      { name: "Eob", value: Math.floor(base * 0.48) },
      { name: "Apr", value: Math.floor(base * 0.52) },
      { name: "Fer", value: Math.floor(base * 0.58) },
      { name: "Meg", value: Math.floor(base * 0.62) },
      { name: "Jun", value: Math.floor(base * 0.68) },
      { name: "Jul", value: Math.floor(base * 0.92) },
      { name: "Aug", value: Math.floor(base * 1.1) },
      { name: "Jul", value: Math.floor(base * 1.3) },
    ];
  }, [approvedCount, pendingRows.length]);

  const totalRevenue = useMemo(() => {
    const last = revenueData[revenueData.length - 1]?.value || 0;
    return last;
  }, [revenueData]);

  const countsByKind = useMemo(() => {
    let res = 0;
    let com = 0;
    for (const r of pendingRows) {
      if (r.kind === "residential") res++;
      else if (r.kind === "commercial") com++;
    }
    return { res, com };
  }, [pendingRows]);

  const filteredPending = useMemo(() => {
    if (tab === "all") return pendingRows;
    return pendingRows.filter((r) => r.kind === tab);
  }, [pendingRows, tab]);

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const [approved, pending, reportResponse] = await Promise.all([
        tryPropertyMount<any>(API_BASE, "/", "GET"),
        tryPropertyMount<any>(API_BASE, "/admin/pending", "GET"),
        getReportStats<any>(API_BASE),
      ]);

      const approvedList: Property[] = Array.isArray(approved)
        ? approved
        : Array.isArray(approved?.data)
          ? approved.data
          : Array.isArray(approved?.items)
            ? approved.items
            : [];

      setApprovedCount(Number(approved?.total || approvedList.length));

      const pendingList: Property[] = Array.isArray(pending)
        ? pending
        : Array.isArray(pending?.data)
          ? pending.data
          : Array.isArray(pending?.items)
            ? pending.items
            : [];

      const rows: PendingRow[] = pendingList.map((p) => ({
        id: pickId(p),
        title: pickTitle(p),
        location: pickLocation(p),
        image: pickImage(p),
        sellerName: pickSeller(p),
        date: pickDate(p),
        kind: pickKind(p),
      }));

      setPendingRows(rows);
      setReportStats(reportResponse?.stats || reportResponse || EMPTY_REPORT_STATS);
    } catch (e: any) {
      setErr(e?.message ?? "Dashboard load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function approve(id: string) {
    try {
      await tryPropertyMount(API_BASE, `/admin/${id}/approve`, "PATCH");
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Approve failed");
    }
  }

  async function reject(id: string) {
    try {
      await tryPropertyMount(API_BASE, `/admin/${id}/reject`, "PATCH");
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Reject failed");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-56 rounded-xl bg-slate-200/70" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="h-64 rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm" />
          <div className="h-64 rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm" />
        </div>
        <div className="h-80 rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm" />
      </div>
    );
  }

  if (err) {
    return (
      <CardShell>
        <div className="p-6">
          <div className="text-lg font-extrabold text-slate-900">Dashboard Error</div>
          <p className="mt-2 text-sm text-slate-600">{err}</p>
          <p className="mt-2 text-xs text-slate-500">
            Check NEXT_PUBLIC_API_URL and whether routes mount at /properties or /api/properties.
          </p>
        </div>
      </CardShell>
    );
  }

  return (
    <div className="space-y-8 bg-gradient-to-br from-slate-50 via-white to-emerald-50/60 p-1">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" /> Overview
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">Admin / Dashboard</p>
        </div>
        <button
          onClick={load}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-emerald-600 transition hover:bg-emerald-700"
        >
          Refresh
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Reports"
          value={fmt(reportStats.total)}
          delta={`${fmt(reportStats.pending)} pending`}
          icon={ShieldAlert}
          subtitle="Moderation volume"
        />
        <StatCard
          title="Active Listings"
          value={fmt(approvedCount)}
          delta="18.2%"
          icon={Home}
          subtitle="Active Listings"
        />
        <StatCard
          title="Pending Approvals"
          value={fmt(pendingRows.length)}
          icon={Clock}
          subtitle="Awaiting review"
        />
        <StatCard
          title="Total Revenue"
          value={`$${money(totalRevenue)}`}
          delta="6.4%"
          icon={DollarSign}
          subtitle="Derived from activity"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CardShell tone="emerald">
          <div className="flex items-start justify-between px-5 py-4">
            <div>
              <div className="text-lg font-extrabold text-slate-900">Moderation Status</div>
              <div className="text-xs text-slate-500">Current reports grouped by moderation state</div>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
              Live queue
            </span>
          </div>
          <div className="px-2 pb-5 sm:px-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={moderationChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[10, 10, 4, 4]} fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardShell>

        <CardShell tone="sky">
          <div className="flex items-start justify-between px-5 py-4">
            <div>
              <div className="text-lg font-extrabold text-slate-900">Revenue Trend</div>
              <div className="text-xs text-slate-500">Placeholder until payments are wired</div>
            </div>
            <button className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
              View All
            </button>
          </div>
          <div className="px-2 pb-5 sm:px-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[8, 8, 4, 4]} fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 text-xs text-slate-500">
              Tip: connect payments to show real revenue.
            </div>
          </div>
        </CardShell>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left column */}
        <div className="space-y-6 xl:col-span-8">
          <CardShell>
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Listings Pending Approval</h2>
                <p className="mt-1 text-xs text-slate-500">Admin can approve/reject listings.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setTab("all")}
                  className={[
                    "rounded-xl px-3 py-1.5 text-sm font-semibold ring-1 transition",
                    tab === "all"
                      ? "bg-emerald-600 text-white ring-emerald-600 shadow-sm"
                      : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
                  ].join(" ")}
                >
                  All ({pendingRows.length})
                </button>

                <button
                  onClick={() => setTab("residential")}
                  className={[
                    "rounded-xl px-3 py-1.5 text-sm font-semibold ring-1 transition",
                    tab === "residential"
                      ? "bg-emerald-600 text-white ring-emerald-600 shadow-sm"
                      : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
                  ].join(" ")}
                >
                  Residential ({countsByKind.res || 0})
                </button>

                <button
                  onClick={() => setTab("commercial")}
                  className={[
                    "rounded-xl px-3 py-1.5 text-sm font-semibold ring-1 transition",
                    tab === "commercial"
                      ? "bg-emerald-600 text-white ring-emerald-600 shadow-sm"
                      : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50",
                  ].join(" ")}
                >
                  Commercial ({countsByKind.com || 0})
                </button>

                <LinkLike href="/admin/listings-approval" label="View All" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-t border-slate-100 bg-slate-50/80 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-5 py-3">Property</th>
                    <th className="px-5 py-3">Seller</th>
                    <th className="px-5 py-3">Date Listed</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPending.map((p) => (
                    <tr key={p.id} className="transition hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-16 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
                            {p.image ? (
                              <img
                                src={p.image}
                                alt={p.title}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{p.title}</div>
                            <div className="text-xs font-semibold text-emerald-700">✓ {p.location}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">{p.sellerName}</div>
                        <div className="text-xs text-slate-500">Seller</div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">{p.date}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => approve(p.id)}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => reject(p.id)}
                            className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 ring-1 ring-red-200 transition hover:bg-red-100"
                          >
                            <XCircle className="h-4 w-4" />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredPending.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-500">
                        No listings in this category.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardShell>

          <CardShell tone="sky">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="text-lg font-extrabold text-slate-900">Recent Reports</div>
                <div className="mt-1 text-xs text-slate-500">
                  Latest listing moderation items from the reports queue.
                </div>
              </div>
              <span className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                Last 5 reports
              </span>
            </div>

            <div className="px-5 pb-5">
              <div className="space-y-3">
                {reportStats.recent.slice(0, 5).map((report) => {
                  const property = pickReportProperty(report);
                  const reporter = pickReportReporter(report);
                  return (
                    <div
                      key={report._id}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">
                            {property?.title || "Untitled listing"}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            {report.reason}
                          </div>
                          <div className="mt-2 text-xs text-slate-400">
                            Reporter: {reporter?.name || "Unknown"} · {formatReportDate(report.createdAt)}
                          </div>
                        </div>
                        <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                          {formatReportStatus(report.status)}
                        </span>
                      </div>
                      {pickReportMessage(report) ? (
                        <div className="mt-3 text-sm text-slate-500">
                          {pickReportMessage(report)}
                        </div>
                      ) : null}
                    </div>
                  );
                })}

                {reportStats.recent.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    No reports have been submitted yet.
                  </div>
                ) : null}
              </div>
            </div>
          </CardShell>
        </div>

        {/* Right column */}
        <div className="space-y-6 xl:col-span-4">
          <CardShell tone="emerald">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="text-lg font-extrabold text-slate-900">Revenue</div>
                <div className="mt-1 text-xs text-slate-500">
                  Derived from activity (replace with payments later)
                </div>
              </div>
              <button className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50">
                View All
              </button>
            </div>

            <div className="px-2 pb-5 sm:px-4">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 text-xs text-slate-500">
                Tip: paste payment routes and we’ll show real total revenue.
              </div>
            </div>
          </CardShell>

          <CardShell>
            <div className="flex items-center justify-between px-5 py-4">
              <div className="text-lg font-extrabold text-slate-900">Reports</div>
              <LinkLike href="/admin/reports" label="View All" />
            </div>

            <div className="px-5 pb-5">
              <div className="space-y-3">
                {reportStats.byReason.slice(0, 4).map((row) => (
                  <div
                    key={row.reason}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3"
                  >
                    <span className="text-sm font-semibold text-slate-700">{row.reason}</span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                      {row.count}
                    </span>
                  </div>
                ))}

                {reportStats.byReason.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                    Reason trends will appear once reports are submitted.
                  </div>
                ) : null}
              </div>
            </div>
          </CardShell>

          <CardShell tone="emerald">
            <div className="p-5">
              <div className="text-sm font-extrabold text-slate-900">Revenue Summary</div>
              <div className="mt-2 text-2xl font-extrabold text-slate-900">
                ${money(totalRevenue)}
              </div>
              <div className="mt-1 text-xs text-slate-500">Derived; replace with payments module</div>
            </div>
          </CardShell>
        </div>
      </div>
    </div>
  );
}

/** small “View All” link-like button without importing next/link here */
function LinkLike({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className="text-sm font-semibold text-emerald-700 hover:underline">
      {label}
    </a>
  );
}
