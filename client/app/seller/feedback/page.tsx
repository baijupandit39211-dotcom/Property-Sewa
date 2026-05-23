"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { apiFetch, apiFetchSafe } from "@/app/lib/api";

type FeedbackStatus = "new" | "reviewed" | "resolved";
type FeedbackCategory = "ui" | "performance" | "bug" | "feature" | "content" | "support" | "other";

type FeedbackItem = {
  _id?: string;
  id?: string;
  category: FeedbackCategory;
  rating: number;
  message: string;
  allowContact: boolean;
  status: FeedbackStatus;
  createdAt: string;
};

type ToastState = { show: boolean; tone: "success" | "error"; text: string };

const LS_KEY = "property-sewa:seller-feedback:fallback:v1";

function readLocalItems(): FeedbackItem[] {
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalItems(items: FeedbackItem[]) {
  window.localStorage.setItem(LS_KEY, JSON.stringify(items));
}

export default function FeedbackPage() {
  const [category, setCategory] = useState<FeedbackCategory>("feature");
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [allowContact, setAllowContact] = useState(true);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState>({ show: false, tone: "success", text: "" });
  const toastTimer = useRef<number | null>(null);

  const showToast = (text: string, tone: ToastState["tone"] = "success") => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ show: true, tone, text });
    toastTimer.current = window.setTimeout(() => {
      setToast((current) => ({ ...current, show: false }));
    }, 1800);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const response = await apiFetchSafe<{ success: boolean; items: FeedbackItem[] }>("/feedback/mine");
      if (!mounted) return;
      if (response?.items) {
        setItems(response.items);
      } else {
        setItems(readLocalItems());
      }
      setLoading(false);
    })();

    return () => {
      mounted = false;
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [items]
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!message.trim() || message.trim().length < 10) {
      showToast("Please write at least 10 characters.", "error");
      return;
    }

    setSubmitting(true);
    const payload = { category, rating, message: message.trim(), allowContact };

    try {
      const res = await apiFetch<{ success: boolean; item: FeedbackItem }>("/feedback", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res?.item) {
        setItems((prev) => [res.item, ...prev]);
      }
      setMessage("");
      setCategory("feature");
      setRating(5);
      setAllowContact(true);
      showToast("Feedback submitted successfully.");
    } catch {
      const fallbackItem: FeedbackItem = {
        category,
        rating,
        message: message.trim(),
        allowContact,
        status: "new",
        createdAt: new Date().toISOString(),
      };
      const next = [fallbackItem, ...readLocalItems()];
      writeLocalItems(next);
      setItems(next);
      setMessage("");
      showToast("Saved locally (server unavailable).", "success");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-6 py-8">
      <div
        className={[
          "fixed right-6 top-20 z-[70] rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg transition",
          toast.show ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0 pointer-events-none",
          toast.tone === "success" ? "bg-emerald-600/95" : "bg-rose-600/95",
        ].join(" ")}
      >
        {toast.text}
      </div>

      <section className="overflow-hidden rounded-[24px] border border-emerald-200/80 bg-[linear-gradient(115deg,#0d2f29_0%,#165537_38%,#5f966f_72%,#c9ddd2_100%)] px-6 py-6 text-white shadow-[0_30px_100px_rgba(19,74,54,0.20)] sm:px-8 sm:py-7">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-50">
            Seller feedback
          </span>
          <h1 className="mt-4 text-3xl font-bold text-white">Feedback</h1>
          <p className="mt-3 text-sm text-emerald-50/90">Share product feedback to improve seller workflows and performance.</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Category</span>
            <select value={category} onChange={(event) => setCategory(event.target.value as FeedbackCategory)} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#316249] focus:ring-2 focus:ring-[#316249]/20">
              <option value="ui">UI</option>
              <option value="performance">Performance</option>
              <option value="bug">Bug</option>
              <option value="feature">Feature</option>
              <option value="content">Content</option>
              <option value="support">Support</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Rating</span>
            <select value={rating} onChange={(event) => setRating(Number(event.target.value))} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-[#316249] focus:ring-2 focus:ring-[#316249]/20">
              <option value={5}>5 - Excellent</option>
              <option value={4}>4 - Good</option>
              <option value={3}>3 - Average</option>
              <option value={2}>2 - Poor</option>
              <option value={1}>1 - Very poor</option>
            </select>
          </label>

          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Message</span>
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={5} placeholder="Share what is working, what is difficult, and what should improve." className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-[#316249] focus:ring-2 focus:ring-[#316249]/20" />
          </label>

          <label className="md:col-span-2 inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={allowContact} onChange={(event) => setAllowContact(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[#316249] focus:ring-[#316249]/30" />
            Allow the team to contact me about this feedback.
          </label>

          <div className="md:col-span-2 flex justify-end">
            <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 rounded-xl bg-[#316249] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#284f3b] disabled:opacity-60">
              <Send className="h-4 w-4" />
              {submitting ? "Submitting..." : "Submit Feedback"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Submitted Feedback History</h2>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500">Loading history...</p>
        ) : sortedItems.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No feedback submitted yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {sortedItems.map((item, index) => (
              <article key={`${item.id || item._id || index}`} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
                    <MessageSquare className="h-4 w-4 text-[#316249]" />
                    {item.category.toUpperCase()} - {item.rating}/5
                  </div>
                  <span className="rounded-full bg-[#f4fbf7] px-2.5 py-1 text-xs font-medium text-[#316249] ring-1 ring-[#316249]/20">
                    {item.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{item.message}</p>
                <p className="mt-2 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}