"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Filter, MessageSquare, Search, ShieldCheck, TimerReset } from "lucide-react";
import { apiFetch, apiFetchAdmin, apiFetchSafe } from "@/app/lib/api";
import AdminToast from "@/components/admin/AdminToast";

type FeedbackStatus = "new" | "reviewed" | "resolved";
type FeedbackCategory = "ui" | "performance" | "bug" | "feature" | "content" | "support" | "other";

type FeedbackItem = {
  id: string;
  userId: string;
  userRole: string;
  category: FeedbackCategory;
  rating: number;
  message: string;
  allowContact: boolean;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
  userName: string;
  userEmail: string;
};

type FeedbackResponse = {
  success: boolean;
  counts: { total: number; new: number; reviewed: number; resolved: number };
  items: FeedbackItem[];
};

function statusChip(status: FeedbackStatus) {
  if (status === "new") return "bg-[#f4fbf7] text-[#316249] ring-[#316249]/20";
  if (status === "reviewed") return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function roleChip(role: string) {
  return "bg-white text-slate-700 ring-slate-200";
}

function ratingChip(rating: number) {
  if (rating >= 4) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (rating === 3) return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-rose-50 text-rose-700 ring-rose-200";
}

export default function AdminFeedbackPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | FeedbackStatus>("all");
  const [category, setCategory] = useState<"all" | FeedbackCategory>("all");
  const [role, setRole] = useState("all");
  const [rating, setRating] = useState("all");
  const [activeFeedback, setActiveFeedback] = useState<FeedbackItem | null>(null);
  const [rows, setRows] = useState<FeedbackItem[]>([]);
  const [counts, setCounts] = useState({ total: 0, new: 0, reviewed: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (query.trim()) params.set("search", query.trim());
    if (status !== "all") params.set("status", status);
    if (category !== "all") params.set("category", category);
    if (role !== "all") params.set("role", role);
    if (rating !== "all") params.set("rating", rating);

    const result = await apiFetchSafe<FeedbackResponse>(`/api/admin/feedback?${params.toString()}`);
    if (result?.items) {
      setRows(result.items);
      setCounts(result.counts || { total: result.items.length, new: 0, reviewed: 0, resolved: 0 });
    } else {
      setRows([]);
      setCounts({ total: 0, new: 0, reviewed: 0, resolved: 0 });
      setNotice({ message: "Failed to load feedback", tone: "error" });
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => rows, [rows]);

  async function changeStatus(item: FeedbackItem, nextStatus: FeedbackStatus) {
    try {
      await apiFetchAdmin(`/admin/feedback/${item.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setNotice({ message: "Status updated", tone: "success" });
      await load();
    } catch (error: any) {
      setNotice({ message: error?.message || "Failed to update status", tone: "error" });
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-6 px-3 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
      <AdminToast show={!!notice} message={notice?.message || ""} tone={notice?.tone || "success"} />

      <section className="overflow-hidden rounded-[24px] border border-emerald-200/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-4 py-5 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:px-6 sm:py-6">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-50">
            Live admin overview
          </span>
          <h1 className="mt-4 text-3xl font-semibold text-white">Feedback Management</h1>
          <p className="mt-3 text-base text-emerald-50/90">
            Review product feedback from seller and buyer channels.
          </p>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Feedback", value: counts.total, icon: MessageSquare },
          { label: "New", value: counts.new, icon: TimerReset },
          { label: "Reviewed", value: counts.reviewed, icon: Filter },
          { label: "Resolved", value: counts.resolved, icon: ShieldCheck },
        ].map((card) => (
          <article key={card.label} className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium tracking-tight text-slate-600">{card.label}</p>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f4fbf7] text-[#316249] ring-1 ring-[#316249]/15 shadow-[0_6px_14px_rgba(49,98,73,0.10)]">
                <card.icon className="h-[18px] w-[18px]" />
              </span>
            </div>
            <p className="mt-3 text-[32px] leading-none font-semibold text-slate-900">{card.value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.06)] sm:p-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by message, user, or category" className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none ring-0 placeholder:text-slate-400 focus:border-[#316249] focus:ring-2 focus:ring-[#316249]/20" />
          </label>
          <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="h-11 min-w-[120px] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#316249] focus:ring-2 focus:ring-[#316249]/20">
            <option value="all">All status</option>
            <option value="new">New</option>
            <option value="reviewed">Reviewed</option>
            <option value="resolved">Resolved</option>
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value as any)} className="h-11 min-w-[120px] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#316249] focus:ring-2 focus:ring-[#316249]/20">
            <option value="all">All category</option>
            <option value="ui">UI</option>
            <option value="performance">Performance</option>
            <option value="bug">Bug</option>
            <option value="feature">Feature</option>
            <option value="content">Content</option>
            <option value="support">Support</option>
            <option value="other">Other</option>
          </select>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="h-11 min-w-[120px] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#316249] focus:ring-2 focus:ring-[#316249]/20">
            <option value="all">All roles</option>
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
            <option value="agent">Agent</option>
            <option value="admin">Admin</option>
            <option value="superadmin">Superadmin</option>
          </select>
          <select value={rating} onChange={(e) => setRating(e.target.value)} className="h-11 min-w-[100px] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#316249] focus:ring-2 focus:ring-[#316249]/20">
            <option value="all">Rating</option>
            <option value="5">5</option>
            <option value="4">4</option>
            <option value="3">3</option>
            <option value="2">2</option>
            <option value="1">1</option>
          </select>
          <button type="button" onClick={() => void load()} className="h-11 rounded-xl border border-[#316249]/25 bg-white px-4 text-sm font-medium text-[#244837] hover:bg-[#e9f3ee]">Apply</button>
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200/90 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Loading feedback...</div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center px-4 py-10 text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f4fbf7] text-[#316249]"><MessageSquare className="h-7 w-7" /></div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">No feedback found</h2>
          </div>
        ) : (
          <div className="space-y-3 p-3 md:p-4">
            {filtered.map((row) => (
              <article key={row.id} className="rounded-2xl border border-slate-200/90 p-3 shadow-[0_8px_22px_rgba(15,23,42,0.07)] sm:p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{row.userName} ({row.userEmail})</p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(row.createdAt).toLocaleString()}</p>
                  </div>
                  <button type="button" onClick={() => setActiveFeedback(row)} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border border-[#316249]/25 bg-white px-2.5 text-xs font-medium text-[#244837] transition hover:border-[#316249]/40 hover:bg-[#e9f3ee] hover:text-[#1f3f30]"><Eye className="h-4 w-4" />View</button>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ring-1 ${statusChip(row.status)}`}>{row.status}</span>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.04em] ring-1 ${roleChip(row.userRole)}`}>{row.userRole}</span>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ${ratingChip(row.rating)}`}>{row.rating}/5</span>
                  <span className="inline-flex rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.04em] ring-1 bg-white text-slate-700 ring-slate-200">{row.category}</span>
                </div>

                <p className="mt-3 text-sm font-normal text-slate-600">{row.message}</p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => void changeStatus(row, "new")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">Mark New</button>
                  <button type="button" onClick={() => void changeStatus(row, "reviewed")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">Mark Reviewed</button>
                  <button type="button" onClick={() => void changeStatus(row, "resolved")} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">Mark Resolved</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {activeFeedback ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-3 py-6 sm:px-6">
          <div className="w-full max-w-2xl rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.22)] sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{activeFeedback.userRole}</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">{activeFeedback.userName}</h2>
              </div>
              <button type="button" onClick={() => setActiveFeedback(null)} className="inline-flex h-9 items-center rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-[#f4fbf7] hover:text-[#316249]">Close</button>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-700">{activeFeedback.message}</p>
          </div>
        </div>
      ) : null}
    </main>
  );
}