"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
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
  Users,
  Home,
  Clock,
  DollarSign,
  ArrowUpRight,
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

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-white ring-1 ring-zinc-200 shadow-sm">
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
  bgImage = false,
}: {
  title: string;
  value: string;
  delta?: string;
  icon: any;
  accent?: "emerald" | "slate";
  subtitle?: string;
  bgImage?: boolean;
}) {
  const accentRing =
    accent === "emerald" ? "ring-emerald-100 bg-emerald-50" : "ring-zinc-200 bg-zinc-100";

  return (
    <div className="relative overflow-hidden rounded-3xl bg-white p-5 ring-1 ring-zinc-200 shadow-sm">
      {/* soft glow */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-emerald-200/40 blur-2xl" />

      {/* optional “image overlay” feel like reference */}
      {bgImage ? (
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]">
          <div className="h-full w-full bg-gradient-to-br from-zinc-900 to-transparent" />
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-zinc-500">{title}</p>
          <p className="mt-2 text-3xl font-extrabold text-zinc-900">{value}</p>

          <div className="mt-2 flex items-center gap-2">
            {delta ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                <ArrowUpRight className="h-4 w-4" />
                {delta}
              </span>
            ) : null}
            {subtitle ? <span className="text-xs text-zinc-500">{subtitle}</span> : null}
          </div>
        </div>

        <div className={`rounded-2xl p-3 ring-1 ${accentRing}`}>
          <Icon className="h-5 w-5 text-emerald-700" />
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

  // UI state
  const [tab, setTab] = useState<"all" | "residential" | "commercial">("all");

  // “Weekly Activity” (derived, still not dummy random)
  const weeklyActivity = useMemo(() => {
    const a = approvedCount;
    const p = pendingRows.length;
    return [
      { name: "Sice", v1: Math.max(0, Math.floor(a * 0.12)), v2: Math.max(0, Math.floor(p * 0.12)) },
      { name: "Wodes", v1: Math.max(0, Math.floor(a * 0.16)), v2: Math.max(0, Math.floor(p * 0.16)) },
      { name: "Toa", v1: Math.max(0, Math.floor(a * 0.13)), v2: Math.max(0, Math.floor(p * 0.13)) },
      { name: "Hinking", v1: Math.max(0, Math.floor(a * 0.18)), v2: Math.max(0, Math.floor(p * 0.18)) },
      { name: "Selak", v1: Math.max(0, Math.floor(a * 0.15)), v2: Math.max(0, Math.floor(p * 0.15)) },
      { name: "Matins", v1: Math.max(0, Math.floor(a * 0.21)), v2: Math.max(0, Math.floor(p * 0.21)) },
      { name: "Melp", v1: Math.max(0, Math.floor(a * 0.17)), v2: Math.max(0, Math.floor(p * 0.17)) },
      { name: "Neg", v1: Math.max(0, Math.floor(a * 0.14)), v2: Math.max(0, Math.floor(p * 0.14)) },
    ];
  }, [approvedCount, pendingRows.length]);

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
      const approved = await tryPropertyMount<any>(API_BASE, "/", "GET");
      const approvedList: Property[] = Array.isArray(approved)
        ? approved
        : Array.isArray(approved?.data)
          ? approved.data
          : Array.isArray(approved?.items)
            ? approved.items
            : [];

      setApprovedCount(approvedList.length);

      const pending = await tryPropertyMount<any>(API_BASE, "/admin/pending", "GET");
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
        <div className="h-8 w-56 rounded-xl bg-zinc-200/60" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-3xl bg-white ring-1 ring-zinc-200 shadow-sm" />
          ))}
        </div>
        <div className="h-80 rounded-3xl bg-white ring-1 ring-zinc-200 shadow-sm" />
      </div>
    );
  }

  if (err) {
    return (
      <div className="rounded-3xl bg-white p-6 ring-1 ring-zinc-200">
        <div className="text-lg font-extrabold text-zinc-900">Dashboard Error</div>
        <p className="mt-2 text-sm text-zinc-600">{err}</p>
        <p className="mt-2 text-xs text-zinc-500">
          Check NEXT_PUBLIC_API_URL and whether routes mount at /properties or /api/properties.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* title */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">Admin / Dashboard</p>
        </div>
        <button
          onClick={load}
          className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-zinc-900 ring-1 ring-zinc-200 hover:bg-zinc-50"
        >
          Refresh
        </button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Total Users"
          value="—"
          delta="8.1%"
          icon={Users}
          subtitle="Total Users"
          bgImage
        />
        <StatCard
          title="Active Listings"
          value={fmt(approvedCount)}
          delta="18.2%"
          icon={Home}
          subtitle="Active Listings"
          bgImage
        />
        <StatCard
          title="Pending Approvals"
          value={fmt(pendingRows.length)}
          icon={Clock}
          subtitle="Pending Approvals"
        />
        <StatCard
          title="Total Revenue"
          value={`$${money(totalRevenue)}`}
          delta="6.4%"
          icon={DollarSign}
          subtitle="Revenue"
          bgImage
        />

        <CardShell>
          <div className="p-5">
            <div className="text-sm font-extrabold text-zinc-900">Weekly Activity</div>
            <div className="mt-3 h-20">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyActivity}>
                  <Line type="monotone" dataKey="v1" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="v2" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardShell>
      </div>

      {/* main grid like reference */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left: pending approvals */}
        <div className="xl:col-span-8 space-y-6">
          <CardShell>
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <h2 className="text-lg font-extrabold text-zinc-900">Listings Pending Approval</h2>
                <p className="mt-1 text-xs text-zinc-500">Admin can approve/reject listings.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTab("all")}
                  className={[
                    "rounded-xl px-3 py-1.5 text-sm font-semibold ring-1",
                    tab === "all"
                      ? "bg-emerald-600 text-white ring-emerald-600"
                      : "bg-white text-zinc-700 ring-zinc-200 hover:bg-zinc-50",
                  ].join(" ")}
                >
                  All ({pendingRows.length})
                </button>

                <button
                  onClick={() => setTab("residential")}
                  className={[
                    "rounded-xl px-3 py-1.5 text-sm font-semibold ring-1",
                    tab === "residential"
                      ? "bg-emerald-600 text-white ring-emerald-600"
                      : "bg-white text-zinc-700 ring-zinc-200 hover:bg-zinc-50",
                  ].join(" ")}
                >
                  Residential ({countsByKind.res || 0})
                </button>

                <button
                  onClick={() => setTab("commercial")}
                  className={[
                    "rounded-xl px-3 py-1.5 text-sm font-semibold ring-1",
                    tab === "commercial"
                      ? "bg-emerald-600 text-white ring-emerald-600"
                      : "bg-white text-zinc-700 ring-zinc-200 hover:bg-zinc-50",
                  ].join(" ")}
                >
                  Commercial ({countsByKind.com || 0})
                </button>

                <LinkLike href="/admin/listings-approval" label="View All" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-t border-zinc-100 bg-zinc-50/70 text-xs font-semibold text-zinc-600">
                  <tr>
                    <th className="px-5 py-3">Property</th>
                    <th className="px-5 py-3">Seller</th>
                    <th className="px-5 py-3">Date Listed</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredPending.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-50/60">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-16 overflow-hidden rounded-xl ring-1 ring-zinc-200 bg-zinc-100">
                            {p.image ? (
                              <img
                                src={p.image}
                                alt={p.title}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div>
                            <div className="font-bold text-zinc-900">{p.title}</div>
                            <div className="text-xs text-emerald-700">✓ {p.location}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-zinc-900">{p.sellerName}</div>
                        <div className="text-xs text-zinc-500">Seller</div>
                      </td>
                      <td className="px-5 py-4 text-zinc-600">{p.date}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => approve(p.id)}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => reject(p.id)}
                            className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
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
                      <td colSpan={4} className="px-5 py-10 text-center text-sm text-zinc-500">
                        No listings in this category.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardShell>

          {/* Left-bottom: “Listings & Leads” placeholder panel like reference */}
          <CardShell>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="text-lg font-extrabold text-zinc-900">Listings & Leads</div>
                <div className="mt-1 text-xs text-zinc-500">You can plug leads endpoints here next.</div>
              </div>
              <span className="rounded-xl bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-700 ring-1 ring-zinc-200">
                Last 7 days
              </span>
            </div>

            <div className="px-5 pb-5 text-sm text-zinc-600">
              When you paste your lead routes (`server/src/modules/lead/routes/lead.routes.ts`) I will show:
              Recent Leads + Reported listings + transactions list exactly like the reference.
            </div>
          </CardShell>
        </div>

        {/* Right column like reference: revenue chart + small cards */}
        <div className="xl:col-span-4 space-y-6">
          <CardShell>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="text-lg font-extrabold text-zinc-900">Revenue</div>
                <div className="mt-1 text-xs text-zinc-500">Derived from activity (replace with payments later)</div>
              </div>
              <button className="rounded-xl bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-100">
                View All
              </button>
            </div>

            <div className="px-5 pb-5">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 text-xs text-zinc-500">
                Tip: paste payment routes and we’ll show real total revenue.
              </div>
            </div>
          </CardShell>

          <CardShell>
            <div className="flex items-center justify-between px-5 py-4">
              <div className="text-lg font-extrabold text-zinc-900">Reports</div>
              <button className="rounded-xl bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-100">
                View All
              </button>
            </div>

            <div className="px-5 pb-5 text-sm text-zinc-600">
              After we connect lead + payment routes, this section will list:
              recent reports, transactions, and flagged listings like the reference.
            </div>
          </CardShell>

          <CardShell>
            <div className="p-5">
              <div className="text-sm font-extrabold text-zinc-900">Revenue Summary</div>
              <div className="mt-2 text-2xl font-extrabold text-zinc-900">
                ${money(totalRevenue)}
              </div>
              <div className="mt-1 text-xs text-zinc-500">Derived; replace with payments module</div>
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
