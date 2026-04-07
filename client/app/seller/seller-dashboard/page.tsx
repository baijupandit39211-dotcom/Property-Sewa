"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BellRing,
  CalendarClock,
  ChevronRight,
  Eye,
  Home,
  Inbox,
  ListChecks,
  LoaderCircle,
  MapPin,
  MessageSquare,
  Plus,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { apiFetch } from "@/app/lib/api";

type RangeOption = "7d" | "30d" | "90d";
type Summary = {
  totalListings: number; activeListings: number; pendingListings: number; rejectedListings: number;
  views: number; leads: number; visits: number; completedVisits: number; lifetimeViews: number;
  lifetimeLeads: number; conversionRate: number; visitCompletionRate: number; averageDailyViews: number;
  viewsDelta: number; leadsDelta: number; conversionDelta: number;
};
type Breakdown = { label: string; count: number };
type ActivityItem = {
  id: string; type: "lead" | "visit"; status: string; occurredAt: string; propertyTitle: string;
  actorName: string; href: string; requestedDate: string | null; preferredTime: string | null; message: string;
};
type Listing = {
  id: string; title: string; location: string; status: string; listingType: string; price: number;
  currency: string; image: string; views: number; leads: number; visits: number;
};
type Funnel = { label: string; value: number; ratio: number };
type Trend = { label: string; views: number; leads: number; visits: number };
type Analytics = {
  filters: { startDate: string; endDate: string };
  summary: Summary;
  trends: Trend[];
  funnel: Funnel[];
  breakdowns: { listings: Breakdown[]; leads: Breakdown[]; visits: Breakdown[] };
  propertyPerformance: Listing[];
  recentActivity: ActivityItem[];
};

const fmtNum = (n: number) => new Intl.NumberFormat().format(Number(n || 0));
const fmtCompact = (n: number) =>
  new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: n >= 1000 ? 1 : 0 }).format(Number(n || 0));
const fmtPct = (n: number) => `${Number(n || 0).toFixed(1)}%`;
const fmtSignedPct = (n: number) => `${n >= 0 ? "+" : ""}${Number(n || 0).toFixed(1)}%`;
const fmtSignedPts = (n: number) => `${n >= 0 ? "+" : ""}${Number(n || 0).toFixed(1)} pts`;
const fmtCurrency = (n: number, c: string) => `${c} ${fmtNum(n)}`;
const fmtDate = (v?: string | null, fb = "No activity yet") => {
  if (!v) return fb;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? fb : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};
const fmtDateTime = (v?: string | null, fb = "Unknown") => {
  if (!v) return fb;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? fb : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};
const titleCase = (s: string) => String(s || "").split("_").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
const cn = (...v: Array<string | false | null | undefined>) => v.filter(Boolean).join(" ");
const deltaTone = (n: number) => (n > 0 ? "text-emerald-600" : n < 0 ? "text-rose-600" : "text-slate-500");
const statusTone = (s: string) =>
  s === "active" || s === "completed" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" :
  s === "pending" || s === "requested" || s === "new" ? "bg-amber-50 text-amber-700 ring-amber-200" :
  s === "confirmed" || s === "contacted" ? "bg-sky-50 text-sky-700 ring-sky-200" :
  s === "rejected" ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-slate-100 text-slate-700 ring-slate-200";

function LoadingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="h-56 animate-pulse rounded-[32px] bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-[28px] bg-slate-200" />)}</div>
      <div className="grid gap-6 xl:grid-cols-2"><div className="h-[420px] animate-pulse rounded-[28px] bg-slate-200" /><div className="h-[420px] animate-pulse rounded-[28px] bg-slate-200" /></div>
    </div>
  );
}

export default function SellerDashboardPage() {
  const [range, setRange] = useState<RangeOption>("30d");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [me, res] = await Promise.all([
          apiFetch<{ user?: { name?: string; email?: string } }>("/auth/me", { signal: controller.signal }),
          apiFetch<{ data: Analytics }>(`/analytics/seller?range=${range}`, { signal: controller.signal }),
        ]);
        if (controller.signal.aborted) return;
        setUserName(me?.user?.name || "");
        setUserEmail(me?.user?.email || "");
        setAnalytics(res.data);
        setLastUpdatedAt(new Date().toISOString());
      } catch (err: any) {
        if (!controller.signal.aborted) setError(err?.message || "Failed to load seller dashboard");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [range]);

  const summary = analytics?.summary || null;
  const topListing = useMemo(() => {
    const items = analytics?.propertyPerformance || [];
    return items.find((x) => x.views > 0 || x.leads > 0 || x.visits > 0) || items[0] || null;
  }, [analytics]);
  const recentListings = analytics?.propertyPerformance.slice(0, 4) || [];
  const recentActivity = analytics?.recentActivity.slice(0, 5) || [];
  const latestTrend = analytics?.trends[analytics.trends.length - 1] || null;
  const hasListings = (summary?.totalListings || 0) > 0;

  const stats = summary ? [
    { title: "Active Listings", value: fmtNum(summary.activeListings), subtitle: `${summary.totalListings} total inventory`, delta: fmtSignedPct(summary.activeListings - summary.pendingListings), tone: deltaTone(summary.activeListings - summary.pendingListings), icon: Home },
    { title: "Views In Range", value: fmtCompact(summary.views), subtitle: `${fmtCompact(summary.lifetimeViews)} lifetime views`, delta: fmtSignedPct(summary.viewsDelta), tone: deltaTone(summary.viewsDelta), icon: Eye },
    { title: "Leads In Range", value: fmtNum(summary.leads), subtitle: `${fmtCompact(summary.lifetimeLeads)} lifetime leads`, delta: fmtSignedPct(summary.leadsDelta), tone: deltaTone(summary.leadsDelta), icon: Users },
    { title: "Conversion", value: fmtPct(summary.conversionRate), subtitle: `${fmtPct(summary.visitCompletionRate)} visit completion`, delta: fmtSignedPts(summary.conversionDelta), tone: deltaTone(summary.conversionDelta), icon: TrendingUp },
  ] : [];

  const actions = [
    { title: "Add listing", desc: "Create and submit a property.", href: "/seller/add-property", icon: Plus, tone: "bg-slate-950 text-white" },
    { title: "Manage listings", desc: "Update inventory and approval-sensitive edits.", href: "/seller/my-properties", icon: Inbox, tone: "bg-white text-slate-900 ring-1 ring-slate-200" },
    { title: "Respond to leads", desc: "Open buyer inquiries and continue the flow.", href: "/seller/leads", icon: MessageSquare, tone: "bg-white text-slate-900 ring-1 ring-slate-200" },
    { title: "Schedule visits", desc: "Confirm or reschedule property visits.", href: "/seller/visit-scheduling", icon: CalendarClock, tone: "bg-white text-slate-900 ring-1 ring-slate-200" },
  ];

  const priorities = summary ? [
    { label: "Pending approvals", value: summary.pendingListings, desc: "Listings waiting for approval", href: "/seller/my-properties" },
    { label: "Open visits", value: Math.max(summary.visits - summary.completedVisits, 0), desc: "Visit requests still in progress", href: "/seller/visit-scheduling" },
    { label: "Fresh leads", value: summary.leads, desc: "Buyer inquiries in the selected range", href: "/seller/leads" },
  ] : [];

  const handleRefresh = () => startTransition(async () => {
    setRefreshing(true);
    try {
      const [me, res] = await Promise.all([apiFetch<{ user?: { name?: string; email?: string } }>("/auth/me"), apiFetch<{ data: Analytics }>(`/analytics/seller?range=${range}`)]);
      setUserName(me?.user?.name || "");
      setUserEmail(me?.user?.email || "");
      setAnalytics(res.data);
      setLastUpdatedAt(new Date().toISOString());
      setError("");
    } catch (err: any) {
      setError(err?.message || "Failed to refresh dashboard");
    } finally {
      setRefreshing(false);
    }
  });

  if (loading && !analytics) return <LoadingSkeleton />;

  return (
    <motion.main initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: "easeOut" }} className="mx-auto w-full max-w-7xl space-y-6">
      <section className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-6 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:px-8 sm:py-8">
        <div className="absolute inset-y-0 right-0 w-[42%] bg-[radial-gradient(circle_at_center,rgba(236,246,240,0.20)_0%,rgba(236,246,240,0.04)_58%,transparent_100%)]" />
        <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/90 ring-1 ring-white/15 backdrop-blur-sm"><Sparkles className="h-3.5 w-3.5" />Seller Control Center</div>
            <div>
              <h1 className="text-3xl font-black tracking-tight sm:text-5xl">{`Welcome back${userName || userEmail ? `, ${userName || userEmail}` : ""}`}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#edf6f0]/90 sm:text-base">Live seller analytics, listing performance, buyer leads, and visit flow are now connected here.</p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur-sm"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Active now</div><div className="mt-1 text-2xl font-black">{fmtNum(summary?.activeListings || 0)}</div></div>
              <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur-sm"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Pipeline</div><div className="mt-1 text-2xl font-black">{fmtNum(summary?.leads || 0)} leads</div></div>
              <div className="rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur-sm"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">Last refresh</div><div className="mt-1 text-sm font-semibold">{fmtDateTime(lastUpdatedAt, "Just now")}</div></div>
            </div>
          </div>
          <div className="relative z-10 grid gap-3 rounded-[28px] bg-[rgba(218,232,223,0.12)] p-4 backdrop-blur-md ring-1 ring-[rgba(255,255,255,0.14)] sm:min-w-[320px]">
            <div className="flex flex-wrap items-center gap-2">{(["7d", "30d", "90d"] as RangeOption[]).map((option) => <button key={option} type="button" onClick={() => setRange(option)} className={cn("rounded-full px-4 py-2 text-sm font-semibold transition", range === option ? "bg-white text-slate-950" : "bg-white/10 text-white ring-1 ring-white/10 hover:bg-white/15")}>{option === "7d" ? "7 Days" : option === "30d" ? "30 Days" : "90 Days"}</button>)}</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={handleRefresh} disabled={refreshing} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#11392f] transition hover:bg-[#f5faf7] disabled:opacity-60"><RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />{refreshing ? "Refreshing..." : "Refresh data"}</button>
              <Link href="/seller/analytics" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#edf6f0] px-4 py-3 text-sm font-semibold text-[#17614b] transition hover:bg-white">Full analytics<ArrowRight className="h-4 w-4" /></Link>
            </div>
            <Link href="/" className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15">Back to Home</Link>
            <div className="rounded-2xl bg-[rgba(9,36,27,0.12)] px-4 py-3 text-sm text-white/90">{summary?.totalListings ? `${fmtNum(summary.totalListings)} listings tracked from ${fmtDate(analytics?.filters.startDate)} to ${fmtDate(analytics?.filters.endDate)}.` : "Publish your first listing to activate the seller reporting flow."}</div>
          </div>
        </div>
      </section>

      {error && <section className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">{error}</section>}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((card) => {
          const Icon = card.icon;
          return <motion.article key={card.title} whileHover={{ y: -4 }} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_70px_rgba(15,23,42,0.06)]"><div className="flex items-start justify-between gap-4"><div><div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{card.title}</div><div className="mt-3 text-4xl font-black tracking-tight text-slate-950">{card.value}</div></div><div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"><Icon className="h-5 w-5" /></div></div><div className="mt-4 flex items-center justify-between gap-3"><div className="text-sm text-slate-600">{card.subtitle}</div><div className={cn("text-sm font-bold", card.tone)}>{card.delta}</div></div></motion.article>;
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-end sm:justify-between"><div><div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600"><ListChecks className="h-3.5 w-3.5" />Working Flow</div><h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Move faster on the next seller actions</h2><p className="mt-1 text-sm text-slate-600">Every card routes into an existing seller page.</p></div><Link href="/seller/analytics" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 transition hover:text-emerald-800">View reports<ChevronRight className="h-4 w-4" /></Link></div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">{actions.map((a) => { const Icon = a.icon; return <Link key={a.title} href={a.href} className={cn("group rounded-[24px] p-5 shadow-sm transition hover:-translate-y-1", a.tone)}><div className="flex items-start justify-between gap-4"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-200/60"><Icon className="h-5 w-5" /></div><ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-700" /></div><h3 className="mt-6 text-lg font-black tracking-tight">{a.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{a.desc}</p></Link>; })}</div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5"><div><div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600"><BarChart3 className="h-3.5 w-3.5" />Listing Snapshot</div><h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Your strongest inventory</h2></div><Link href="/seller/my-properties" className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-800">Manage listings</Link></div>
            {!hasListings ? <div className="mt-5 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200"><Home className="h-6 w-6" /></div><h3 className="mt-4 text-xl font-black tracking-tight text-slate-950">No listings yet</h3><p className="mt-2 text-sm text-slate-600">Add your first property to activate metrics, leads, and visits.</p><Link href="/seller/add-property" className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">Create listing<ChevronRight className="h-4 w-4" /></Link></div> : <div className="mt-5 space-y-4"><div className="rounded-[28px] bg-[linear-gradient(135deg,#f8fafc_0%,#effdf5_100%)] p-5 ring-1 ring-slate-200"><div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div className="flex gap-4"><div className="h-28 w-32 overflow-hidden rounded-[22px] bg-slate-100 ring-1 ring-slate-200">{topListing?.image ? <img src={topListing.image} alt={topListing.title} className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-slate-400"><Home className="h-6 w-6" /></div>}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="inline-flex rounded-full bg-slate-950 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">Top listing</span>{topListing && <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1", statusTone(topListing.status))}>{titleCase(topListing.status)}</span>}</div><h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{topListing?.title}</h3>{topListing && <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600"><span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" />{topListing.location}</span><span>{fmtCurrency(topListing.price, topListing.currency)}</span><span>{titleCase(topListing.listingType)}</span></div>}</div></div><div className="grid gap-3 sm:grid-cols-3 lg:w-[320px] lg:grid-cols-1">{topListing && [{ label: "Views", value: topListing.views }, { label: "Leads", value: topListing.leads }, { label: "Visits", value: topListing.visits }].map((x) => <div key={x.label} className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{x.label}</div><div className="mt-2 text-2xl font-black tracking-tight text-slate-950">{fmtNum(x.value)}</div></div>)}</div></div>{topListing && <div className="mt-5 flex flex-wrap gap-3"><Link href={`/seller/property/${topListing.id}`} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950">View listing</Link><Link href={`/seller/edit-property/${topListing.id}`} className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">Edit listing</Link></div>}</div><div className="grid gap-4 xl:grid-cols-2">{recentListings.map((p) => <Link key={p.id} href={`/seller/property/${p.id}`} className="rounded-[24px] border border-slate-200 bg-white p-4 transition hover:-translate-y-1 hover:shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-black tracking-tight text-slate-950">{p.title}</h3><div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600"><span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4 text-slate-400" />{p.location}</span><span>{fmtCurrency(p.price, p.currency)}</span></div></div><span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1", statusTone(p.status))}>{titleCase(p.status)}</span></div><div className="mt-4 grid grid-cols-3 gap-3">{[{ label: "Views", value: p.views }, { label: "Leads", value: p.leads }, { label: "Visits", value: p.visits }].map((x) => <div key={x.label} className="rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200"><div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{x.label}</div><div className="mt-1 text-xl font-black tracking-tight text-slate-950">{fmtNum(x.value)}</div></div>)}</div></Link>)}</div></div>}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.06)]"><div className="flex items-center justify-between"><div><div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600"><BellRing className="h-3.5 w-3.5" />Attention Queue</div><h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">What needs attention</h2></div><Link href="/seller/notifications" className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-800">Notifications</Link></div><div className="mt-5 space-y-3">{priorities.map((p) => <Link key={p.label} href={p.href} className="flex items-center justify-between gap-4 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-slate-300 hover:bg-white"><div><div className="text-sm font-bold text-slate-950">{p.label}</div><div className="mt-1 text-sm text-slate-600">{p.desc}</div></div><div className="text-right"><div className="text-3xl font-black tracking-tight text-slate-950">{fmtNum(p.value)}</div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Open</div></div></Link>)}</div><div className="mt-5 rounded-[24px] bg-slate-950 px-5 py-5 text-white"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">Latest trend point</div><div className="mt-3 text-3xl font-black tracking-tight">{latestTrend ? latestTrend.label : "No data"}</div><p className="mt-2 text-sm text-white/75">{latestTrend ? `${fmtNum(latestTrend.views)} views, ${fmtNum(latestTrend.leads)} leads, ${fmtNum(latestTrend.visits)} visits` : "Traffic and pipeline numbers will show here once activity starts."}</p></div></div>
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.06)]"><div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600"><TrendingUp className="h-3.5 w-3.5" />Distribution</div><div className="mt-5 space-y-5">{[{ title: "Listings", items: analytics?.breakdowns.listings || [] }, { title: "Leads", items: analytics?.breakdowns.leads || [] }, { title: "Visits", items: analytics?.breakdowns.visits || [] }].map((group) => { const max = Math.max(1, ...group.items.map((i) => i.count)); return <div key={group.title}><div className="mb-3 text-sm font-bold text-slate-900">{group.title}</div><div className="space-y-3">{group.items.map((i) => <div key={`${group.title}-${i.label}`}><div className="mb-1 flex items-center justify-between gap-3 text-sm"><span className="text-slate-600">{i.label}</span><span className="font-semibold text-slate-950">{i.count}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[linear-gradient(90deg,#0f766e_0%,#10b981_100%)]" style={{ width: `${(i.count / max) * 100}%` }} /></div></div>)}</div></div>; })}</div></div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_0.95fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.06)]"><div className="flex items-center justify-between border-b border-slate-100 pb-5"><div><div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600"><Activity className="h-3.5 w-3.5" />Live Activity</div><h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Recent buyer movement</h2></div><Link href="/seller/leads" className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-800">Open inbox</Link></div><div className="mt-5 space-y-4">{recentActivity.length === 0 && <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-600">No lead or visit activity has been recorded yet.</div>}{recentActivity.map((item, index) => <Link key={`${item.type}-${item.id}`} href={item.href} className="group block rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_100%)] p-4 transition hover:border-slate-300 hover:shadow-sm"><div className="flex gap-4"><div className="flex flex-col items-center"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-white">{item.type === "lead" ? <Users className="h-5 w-5" /> : <CalendarClock className="h-5 w-5" />}</div>{index !== recentActivity.length - 1 && <div className="mt-2 h-full w-px bg-slate-200" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ring-1", statusTone(item.status))}>{titleCase(item.status)}</span><span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{item.type === "lead" ? "Lead" : "Visit"}</span></div><div className="mt-2 text-base font-black tracking-tight text-slate-950">{item.actorName} {item.type === "lead" ? "sent a lead" : `${titleCase(item.status)} a visit`}</div><div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600"><span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" />{item.propertyTitle}</span><span>{fmtDateTime(item.occurredAt)}</span></div>{item.type === "visit" && item.requestedDate && <p className="mt-2 text-sm text-slate-600">Requested for {fmtDate(item.requestedDate)}{item.preferredTime ? ` at ${item.preferredTime}` : ""}</p>}{item.message && <p className="mt-2 text-sm leading-6 text-slate-600">{item.message}</p>}</div><ChevronRight className="mt-1 h-5 w-5 flex-none text-slate-300 transition group-hover:text-slate-500" /></div></Link>)}</div></div>
        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.06)]"><div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600"><Sparkles className="h-3.5 w-3.5" />Funnel Health</div><div className="mt-5 space-y-4">{(analytics?.funnel || []).map((step) => <div key={step.label}><div className="mb-1 flex items-center justify-between gap-3"><span className="text-sm font-semibold text-slate-700">{step.label}</span><span className="text-sm font-bold text-slate-950">{fmtNum(step.value)}</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[linear-gradient(90deg,#111827_0%,#10b981_100%)]" style={{ width: `${Math.min(step.ratio, 100)}%` }} /></div></div>)}</div><div className="mt-5 rounded-[24px] bg-slate-50 p-4"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Daily pace</div><div className="mt-2 text-3xl font-black tracking-tight text-slate-950">{(summary?.averageDailyViews || 0).toFixed(1)}</div><p className="mt-2 text-sm text-slate-600">Average daily views across the selected range.</p></div></div>
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.06)]"><div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600"><MessageSquare className="h-3.5 w-3.5" />Workspace Links</div><div className="mt-5 grid gap-3">{[{ href: "/seller/messages", label: "Messages / Chat", icon: MessageSquare }, { href: "/seller/notifications", label: "Notifications", icon: BellRing }, { href: "/seller/profile", label: "Profile", icon: Users }].map((item) => { const Icon = item.icon; return <Link key={item.href} href={item.href} className="flex items-center justify-between rounded-[20px] border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"><span className="inline-flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-700"><Icon className="h-4 w-4" /></span>{item.label}</span><ChevronRight className="h-4 w-4 text-slate-400" /></Link>; })}</div></div>
        </div>
      </section>

      {refreshing && <div className="fixed bottom-6 right-6 inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg"><LoaderCircle className="h-4 w-4 animate-spin" />Refreshing dashboard</div>}
    </motion.main>
  );
}
