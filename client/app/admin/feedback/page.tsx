"use client";

import { useMemo, useState } from "react";
import { Eye, Filter, MessageSquare, Search, ShieldCheck, TimerReset } from "lucide-react";

type FeedbackStatus = "new" | "in_review" | "resolved";
type FeedbackPriority = "low" | "medium" | "high";
type FeedbackCategory = "ui" | "performance" | "bug" | "feature" | "content";

type FeedbackItem = {
  id: string;
  subject: string;
  message: string;
  status: FeedbackStatus;
  category: FeedbackCategory;
  priority: FeedbackPriority;
  source: "admin" | "seller" | "buyer" | "public";
  userName: string;
  userEmail: string;
  createdAt: string;
};

const feedbackRows: FeedbackItem[] = [
  {
    id: "FB-2401",
    subject: "Sidebar overlap on small laptops",
    message: "Sidebar covers table action buttons on 1280 width after opening filters.",
    status: "new",
    category: "ui",
    priority: "high",
    source: "admin",
    userName: "Super Admin",
    userEmail: "admin@propertysewa.com",
    createdAt: "2026-05-17 10:22",
  },
  {
    id: "FB-2397",
    subject: "Approval queue feels slow",
    message: "Loading state remains visible even after data arrives in listings approval queue.",
    status: "in_review",
    category: "performance",
    priority: "medium",
    source: "admin",
    userName: "Ops Lead",
    userEmail: "ops@propertysewa.com",
    createdAt: "2026-05-16 17:45",
  },
  {
    id: "FB-2393",
    subject: "Need bulk status action",
    message: "Please add batch approve/reject action for selected listings.",
    status: "resolved",
    category: "feature",
    priority: "low",
    source: "admin",
    userName: "Moderator Team",
    userEmail: "moderator@propertysewa.com",
    createdAt: "2026-05-15 12:10",
  },
];

function statusChip(status: FeedbackStatus) {
  if (status === "new") return "bg-[#f4fbf7] text-[#316249] ring-[#316249]/20";
  if (status === "in_review") return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function priorityChip(priority: FeedbackPriority) {
  if (priority === "high") return "bg-rose-50/70 text-rose-600 ring-rose-200/80";
  if (priority === "medium") return "bg-orange-50 text-orange-700 ring-orange-200";
  return "bg-sky-50 text-sky-700 ring-sky-200";
}

function categoryChip(category: FeedbackCategory) {
  return "bg-white text-slate-700 ring-slate-200";
}

export default function AdminFeedbackPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | FeedbackStatus>("all");
  const [category, setCategory] = useState<"all" | FeedbackCategory>("all");
  const [activeFeedback, setActiveFeedback] = useState<FeedbackItem | null>(null);

  const filtered = useMemo(() => {
    return feedbackRows.filter((row) => {
      const matchQuery =
        !query ||
        row.subject.toLowerCase().includes(query.toLowerCase()) ||
        row.message.toLowerCase().includes(query.toLowerCase()) ||
        row.userName.toLowerCase().includes(query.toLowerCase()) ||
        row.id.toLowerCase().includes(query.toLowerCase());
      const matchStatus = status === "all" || row.status === status;
      const matchCategory = category === "all" || row.category === category;
      return matchQuery && matchStatus && matchCategory;
    });
  }, [query, status, category]);

  const stats = useMemo(() => {
    const total = feedbackRows.length;
    const open = feedbackRows.filter((f) => f.status === "new").length;
    const inReview = feedbackRows.filter((f) => f.status === "in_review").length;
    const resolved = feedbackRows.filter((f) => f.status === "resolved").length;
    return { total, open, inReview, resolved };
  }, []);

  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-6 px-3 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
      <section className="overflow-hidden rounded-[24px] border border-emerald-200/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-4 py-5 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:px-6 sm:py-6">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-50">
            Live admin overview
          </span>
          <h1 className="mt-4 text-3xl font-semibold text-white">Feedback Management</h1>
          <p className="mt-3 text-base text-emerald-50/90">
            Review product feedback from admin channels and prepare future workflow integrations.
          </p>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Feedback", value: stats.total, icon: MessageSquare },
          { label: "New", value: stats.open, icon: TimerReset },
          { label: "In Review", value: stats.inReview, icon: Filter },
          { label: "Resolved", value: stats.resolved, icon: ShieldCheck },
        ].map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.07)]"
          >
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
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by subject, message, user, or ID"
              className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none ring-0 placeholder:text-slate-400 focus:border-[#316249] focus:ring-2 focus:ring-[#316249]/20"
            />
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "all" | FeedbackStatus)}
            className="h-11 min-w-[132px] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#316249] focus:ring-2 focus:ring-[#316249]/20"
          >
            <option value="all">All status</option>
            <option value="new">New</option>
            <option value="in_review">In review</option>
            <option value="resolved">Resolved</option>
          </select>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as "all" | FeedbackCategory)}
            className="h-11 min-w-[132px] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#316249] focus:ring-2 focus:ring-[#316249]/20"
          >
            <option value="all">All category</option>
            <option value="ui">UI</option>
            <option value="performance">Performance</option>
            <option value="bug">Bug</option>
            <option value="feature">Feature</option>
            <option value="content">Content</option>
          </select>
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200/90 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
        {filtered.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center px-4 py-10 text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f4fbf7] text-[#316249]">
              <MessageSquare className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">No feedback found</h2>
            <p className="mt-2 max-w-md text-sm text-slate-600">
              Try changing search text or filters. This scaffold is ready for API-connected results.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="min-w-[980px] w-full">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-[#f8fbf9] text-left">
                    {["Subject", "Status", "Category / Priority", "User / Source", "Preview", "Action"].map((th) => (
                      <th key={th} className="px-5 py-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                        {th}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.id} className="group border-b border-slate-200/60 align-top transition-colors hover:bg-[#f8fbf9]">
                      <td className="px-5 py-4.5">
                        <p className="text-sm font-semibold leading-6 text-slate-900">{row.subject}</p>
                        <p className="mt-1 text-xs text-slate-500">{row.id}</p>
                        <p className="mt-1 text-xs text-slate-500">{row.createdAt}</p>
                      </td>
                      <td className="px-5 py-4.5">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ring-1 ${statusChip(row.status)}`}>
                          {row.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-4.5">
                        <div className="flex flex-wrap gap-2">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.04em] ring-1 ${categoryChip(row.category)}`}>
                            {row.category}
                          </span>
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ring-1 ${priorityChip(row.priority)}`}>
                            {row.priority}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4.5">
                        <p className="text-sm font-medium leading-6 text-slate-800">{row.userName}</p>
                        <p className="text-xs text-slate-500">{row.userEmail}</p>
                        <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{row.source}</p>
                      </td>
                      <td className="px-5 py-4.5">
                        <p className="line-clamp-2 max-w-[280px] text-sm font-normal leading-6 text-slate-600">{row.message}</p>
                      </td>
                      <td className="px-5 py-4.5">
                        <button
                          type="button"
                          onClick={() => setActiveFeedback(row)}
                          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#316249]/25 bg-white px-3.5 text-sm font-medium text-[#244837] shadow-sm transition hover:border-[#316249]/40 hover:bg-[#e9f3ee] hover:text-[#1f3f30] hover:shadow-[0_6px_14px_rgba(49,98,73,0.16)]"
                        >
                          <Eye className="h-4 w-4" />
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 p-3 md:p-4 lg:hidden">
              {filtered.map((row) => (
                <article key={row.id} className="rounded-2xl border border-slate-200/90 p-3 shadow-[0_8px_22px_rgba(15,23,42,0.07)] sm:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{row.subject}</p>
                      <p className="mt-1 text-xs text-slate-500">{row.id} • {row.createdAt}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveFeedback(row)}
                      className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border border-[#316249]/25 bg-white px-2.5 text-xs font-medium text-[#244837] transition hover:border-[#316249]/40 hover:bg-[#e9f3ee] hover:text-[#1f3f30]"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ring-1 ${statusChip(row.status)}`}>
                      {row.status.replace("_", " ")}
                    </span>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.04em] ring-1 ${categoryChip(row.category)}`}>
                      {row.category}
                    </span>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ring-1 ${priorityChip(row.priority)}`}>
                      {row.priority}
                    </span>
                  </div>

                  <p className="mt-3 text-sm font-normal text-slate-600">{row.message}</p>

                  <div className="mt-3 rounded-xl bg-[#f8fbf9] px-3 py-2">
                    <p className="text-sm font-medium text-slate-800">{row.userName}</p>
                    <p className="text-xs text-slate-500">{row.userEmail}</p>
                    <p className="text-xs uppercase tracking-wide text-slate-500">{row.source}</p>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {activeFeedback ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-3 py-6 sm:px-6">
          <div className="w-full max-w-2xl rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.22)] sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{activeFeedback.id}</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-900">{activeFeedback.subject}</h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveFeedback(null)}
                className="inline-flex h-9 items-center rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-[#f4fbf7] hover:text-[#316249]"
              >
                Close
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ring-1 ${statusChip(activeFeedback.status)}`}>
                {activeFeedback.status.replace("_", " ")}
              </span>
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.04em] ring-1 ${categoryChip(activeFeedback.category)}`}>
                {activeFeedback.category}
              </span>
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize ring-1 ${priorityChip(activeFeedback.priority)}`}>
                {activeFeedback.priority}
              </span>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-700">{activeFeedback.message}</p>

            <div className="mt-5 grid gap-3 rounded-2xl bg-[#f8fbf9] p-3 sm:grid-cols-2 sm:p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">User</p>
                <p className="mt-1 text-sm font-medium text-slate-800">{activeFeedback.userName}</p>
                <p className="text-xs text-slate-600">{activeFeedback.userEmail}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Source / Time</p>
                <p className="mt-1 text-sm font-medium uppercase text-slate-800">{activeFeedback.source}</p>
                <p className="text-xs text-slate-600">{activeFeedback.createdAt}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
