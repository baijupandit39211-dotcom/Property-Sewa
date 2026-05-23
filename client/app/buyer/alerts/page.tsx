"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Plus, RefreshCcw, Trash2, ArrowRight, X, Search, CheckCheck } from "lucide-react";
import BuyerToast, { showBuyerToast, type BuyerToastState } from "@/app/buyer/_components/BuyerToast";
import { apiFetch, apiFetchSafe } from "../../lib/api";

type AlertRule = {
  id: string;
  name: string;
  enabled: boolean;
  query?: string;
  location?: string;
  maxPrice?: number;
  minBeds?: number;
  minBaths?: number;
  minSqft?: number;
  createdAt: string | number;
};

type AlertItem = {
  id: string;
  type: "alerts" | "visits" | "offers";
  title: string;
  message: string;
  ctaLabel?: string;
  href?: string;
  imageUrl?: string;
  createdAt: string | number;
  isRead?: boolean;
};

type Preferences = {
  alertsEnabled: boolean;
  visitsEnabled: boolean;
  offersEnabled: boolean;
};

type FeedResponse = {
  success: boolean;
  preferences: Preferences;
  rules: AlertRule[];
  items: AlertItem[];
};

type SavedSearchAlert = {
  id: string;
  name: string;
  alertsEnabled?: boolean;
  filters?: {
    search?: string;
    location?: string;
    listingType?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
    showOnlyOffers?: boolean;
  };
};

type TabKey = "all" | "alerts" | "visits" | "offers";

const SAVED_SEARCHES_KEY = "buyer_saved_searches_v1";
const FALLBACK_KEY = "property-sewa:buyer-alerts:fallback:v2";

function readFallback() {
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    return raw ? JSON.parse(raw) : { preferences: null, rules: [], items: [] };
  } catch {
    return { preferences: null, rules: [], items: [] };
  }
}

function writeFallback(value: any) {
  localStorage.setItem(FALLBACK_KEY, JSON.stringify(value));
}

function timeAgo(ts: string | number) {
  const target = new Date(ts).getTime();
  const diff = Date.now() - target;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: React.ReactNode; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9998]">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
            <div>
              <div className="text-sm font-semibold text-emerald-700">Notifications</div>
              <div className="text-2xl font-extrabold text-slate-900">{title}</div>
            </div>
            <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full bg-white text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-6 py-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-emerald-200";

export default function BuyerAlertsPage() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [items, setItems] = useState<AlertItem[]>([]);
  const [preferences, setPreferences] = useState<Preferences>({ alertsEnabled: true, visitsEnabled: true, offersEnabled: true });
  const [tab, setTab] = useState<TabKey>("all");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<BuyerToastState>({ show: false, text: "", tone: "success" });
  const toastTimer = useRef<number | null>(null);
  const [savedSearchAlerts, setSavedSearchAlerts] = useState<SavedSearchAlert[]>([]);
  const [openCreate, setOpenCreate] = useState(false);

  const [name, setName] = useState("Price drop in Kathmandu");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("kathmandu");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [minBeds, setMinBeds] = useState<number | "">("");
  const [minBaths, setMinBaths] = useState<number | "">("");
  const [minSqft, setMinSqft] = useState<number | "">("");

  function showToast(text: string, tone: BuyerToastState["tone"] = "success") {
    const next = showBuyerToast({ tone, fallbackText: text });
    setToast({ show: true, text: next.text, tone: next.tone });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast((t) => ({ ...t, show: false })), 1400);
  }

  async function loadFeed(showRefreshed = false) {
    setLoading(true);
    const response = await apiFetchSafe<FeedResponse>("/buyer/alerts");
    if (response?.success) {
      setRules(response.rules || []);
      setItems(response.items || []);
      setPreferences(response.preferences || { alertsEnabled: true, visitsEnabled: true, offersEnabled: true });
      writeFallback({ preferences: response.preferences, rules: response.rules, items: response.items });
      if (showRefreshed) showToast("Refreshed");
    } else {
      const fallback = readFallback();
      setRules(fallback.rules || []);
      setItems(fallback.items || []);
      setPreferences(fallback.preferences || { alertsEnabled: true, visitsEnabled: true, offersEnabled: true });
      if (showRefreshed) showToast("Using local fallback", "warning");
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadFeed(false);
    try {
      const raw = localStorage.getItem(SAVED_SEARCHES_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setSavedSearchAlerts(parsed);
    } catch {
      setSavedSearchAlerts([]);
    }
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  async function createAlert() {
    const payload = {
      name: name.trim() || "My Alert",
      query: query.trim() || undefined,
      location: location.trim() || undefined,
      maxPrice: typeof maxPrice === "number" ? maxPrice : undefined,
      minBeds: typeof minBeds === "number" ? minBeds : undefined,
      minBaths: typeof minBaths === "number" ? minBaths : undefined,
      minSqft: typeof minSqft === "number" ? minSqft : undefined,
      enabled: true,
      createdAt: Date.now(),
    };

    try {
      await apiFetch("/buyer/alerts/rules", { method: "POST", body: JSON.stringify(payload) });
      await loadFeed(false);
      showToast("Alert created");
    } catch {
      const fallback = readFallback();
      const localRule = { id: `local-${Date.now()}`, ...payload };
      const nextRules = [localRule, ...(fallback.rules || [])];
      writeFallback({ ...fallback, rules: nextRules });
      setRules(nextRules);
      showToast("Saved locally (server unavailable)", "warning");
    }

    setOpenCreate(false);
    setTab("alerts");
  }

  async function markAllRead() {
    try {
      await apiFetch("/buyer/alerts/read-all", { method: "PATCH" });
      await loadFeed(false);
    } catch {
      const next = items.map((item) => ({ ...item, isRead: true }));
      setItems(next);
      const fallback = readFallback();
      writeFallback({ ...fallback, items: next });
    }
    showToast("Marked all as read");
  }

  async function markRead(itemId: string) {
    try {
      await apiFetch(`/buyer/alerts/items/${itemId}/read`, { method: "PATCH" });
    } catch {}
    setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, isRead: true } : item)));
  }

  const unreadCount = useMemo(() => items.filter((item) => !item.isRead).length, [items]);
  const filtered = useMemo(() => {
    const sorted = [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (tab === "all") return sorted;
    return sorted.filter((n) => n.type === tab);
  }, [items, tab]);

  return (
    <main className="w-full min-w-0 px-4 py-8 sm:px-6 lg:px-10">
      <BuyerToast show={toast.show} text={toast.text} tone={toast.tone} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm font-semibold text-slate-600">{unreadCount} unread</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setOpenCreate(true)} className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200 transition hover:bg-emerald-100">Create Alert <Plus className="h-4 w-4" /></button>
          <button type="button" onClick={markAllRead} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50">Mark all <CheckCheck className="h-4 w-4" /></button>
          <button type="button" onClick={() => void loadFeed(true)} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50">Refresh <RefreshCcw className="h-4 w-4" /></button>
          <a href="/buyer/search-properties" className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95">Browse <ArrowRight className="h-4 w-4" /></a>
        </div>
      </div>

      {savedSearchAlerts.length ? (
        <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70">
          <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Saved Search Alerts</div>
          <div className="flex flex-wrap gap-2">
            {savedSearchAlerts.map((saved) => {
              const params = new URLSearchParams();
              if (saved.filters?.search) params.set("search", saved.filters.search);
              if (saved.filters?.location) params.set("location", saved.filters.location);
              if (saved.filters?.listingType) params.set("listingType", saved.filters.listingType);
              if (saved.filters?.minPrice) params.set("minPrice", saved.filters.minPrice);
              if (saved.filters?.maxPrice) params.set("maxPrice", saved.filters.maxPrice);
              if (saved.filters?.sort) params.set("sort", saved.filters.sort);
              if (saved.filters?.showOnlyOffers) params.set("offersOnly", "true");
              const href = `/buyer/search-properties${params.toString() ? `?${params.toString()}` : ""}`;
              return (
                <a key={saved.id} href={href} className="inline-flex items-center gap-2 rounded-full bg-[#EEF8EB] px-3 py-1.5 text-xs font-semibold text-[#316249] ring-1 ring-[#D1D5DB] transition hover:bg-[#E8F2EB]">
                  {saved.name}
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[#316249] ring-1 ring-[#D1D5DB]">{saved.alertsEnabled ? "Alert On" : "Alert Off"}</span>
                </a>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-6 border-b border-slate-200">
        <div className="flex flex-wrap items-end gap-6">
          <TabButton active={tab === "all"} onClick={() => setTab("all")}>All</TabButton>
          <TabButton active={tab === "alerts"} onClick={() => setTab("alerts")}>Alerts</TabButton>
          <TabButton active={tab === "visits"} onClick={() => setTab("visits")}>Visits</TabButton>
          <TabButton active={tab === "offers"} onClick={() => setTab("offers")}>Offers</TabButton>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 rounded-3xl bg-white p-10 text-sm font-semibold text-slate-600 ring-1 ring-slate-200/70">Loading notifications...</div>
      ) : filtered.length === 0 ? (
        <div className="mt-10 rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200/70">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-200"><Bell className="h-6 w-6 text-emerald-700" /></div>
          <h2 className="text-2xl font-extrabold text-slate-900">No notifications</h2>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {filtered.map((n) => (
            <article key={n.id} className={["rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70 px-6 py-6 hover:shadow-md transition", !n.isRead ? "ring-emerald-200/70" : ""].join(" ")}>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_360px] md:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    {!n.isRead ? <span className="text-xs font-extrabold text-emerald-700">New</span> : <span className="text-xs font-semibold text-slate-400">-</span>}
                    <span className="text-xs font-semibold text-slate-500">{timeAgo(n.createdAt)}</span>
                  </div>
                  <div className="mt-2 break-words text-lg font-extrabold text-slate-900">{n.title}</div>
                  <p className="mt-1 break-words text-sm font-semibold text-emerald-700/90">{n.message}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {n.href ? <a href={n.href} onClick={() => void markRead(n.id)} className="inline-flex items-center justify-center rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200 transition hover:bg-emerald-100">{n.ctaLabel || "View"} <ArrowRight className="ml-2 h-4 w-4" /></a> : null}
                    <button type="button" onClick={() => void markRead(n.id)} className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50">Mark as read</button>
                    <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">{n.type === "alerts" ? "Alerts" : n.type === "visits" ? "Visits" : "Offers"}</span>
                  </div>
                </div>
                <div className="overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
                  {n.imageUrl ? <img src={n.imageUrl} alt="property" loading="lazy" decoding="async" className="h-[170px] w-full object-cover" /> : <div className="grid h-[170px] w-full place-items-center text-sm font-semibold text-slate-500">No image</div>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={openCreate} title="Create Alert" onClose={() => setOpenCreate(false)}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-2"><div className="text-sm font-semibold text-slate-800">Alert name</div><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="e.g., Budget homes in Kathmandu" /></label>
          <label className="space-y-2"><div className="text-sm font-semibold text-slate-800">Text search (optional)</div><input value={query} onChange={(e) => setQuery(e.target.value)} className={inputCls} placeholder="title or location contains..." /></label>
          <label className="space-y-2"><div className="text-sm font-semibold text-slate-800">Location contains (optional)</div><input value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} placeholder="e.g., kathmandu" /></label>
          <label className="space-y-2"><div className="text-sm font-semibold text-slate-800">Max price (optional)</div><input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : "")} className={inputCls} inputMode="numeric" placeholder="e.g., 5000000" /></label>
          <label className="space-y-2"><div className="text-sm font-semibold text-slate-800">Min beds (optional)</div><input value={minBeds} onChange={(e) => setMinBeds(e.target.value ? Number(e.target.value) : "")} className={inputCls} inputMode="numeric" placeholder="e.g., 2" /></label>
          <label className="space-y-2"><div className="text-sm font-semibold text-slate-800">Min baths (optional)</div><input value={minBaths} onChange={(e) => setMinBaths(e.target.value ? Number(e.target.value) : "")} className={inputCls} inputMode="numeric" placeholder="e.g., 2" /></label>
          <label className="space-y-2"><div className="text-sm font-semibold text-slate-800">Min sqft (optional)</div><input value={minSqft} onChange={(e) => setMinSqft(e.target.value ? Number(e.target.value) : "")} className={inputCls} inputMode="numeric" placeholder="e.g., 1200" /></label>
          <div className="md:col-span-2 mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setOpenCreate(false)} className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={() => void createAlert()} className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95">Create <Plus className="h-4 w-4" /></button>
          </div>
        </div>
      </Modal>
    </main>
  );
}

function TabButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={["pb-3 text-sm font-extrabold transition", active ? "text-emerald-900 border-b-2 border-emerald-600" : "text-slate-500 hover:text-slate-800"].join(" ")}>{children}</button>;
}
