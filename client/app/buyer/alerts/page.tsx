"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Plus,
  RefreshCcw,
  Trash2,
  ArrowRight,
  X,
  MapPin,
  BedDouble,
  Bath,
  Ruler,
  DollarSign,
  Search,
  CheckCheck,
} from "lucide-react";

import { apiFetch } from "../../lib/api";
import type { Property } from "../../lib/property.types";

/** =========================
 * Types
 * ========================= */
type ListResponse = { items: Property[] };

type AlertRule = {
  id: string;
  name: string;
  enabled: boolean;

  // filters (all optional)
  query?: string; // title/location text match
  location?: string;
  maxPrice?: number;
  minBeds?: number;
  minBaths?: number;
  minSqft?: number;

  createdAt: number;
};

type ToastState = { show: boolean; text: string };

type TabKey = "all" | "alerts" | "visits" | "offers";

type NotificationItem = {
  id: string;
  type: Exclude<TabKey, "all">; // alerts | visits | offers
  title: string;
  message: string;
  ctaLabel?: string;
  href?: string;
  imageUrl?: string;
  createdAt: number;
};

/** =========================
 * Storage keys
 * ========================= */
const ALERTS_KEY = "property-sewa:alerts:v1";
const LAST_SEEN_KEY = "property-sewa:alerts:lastSeen:v1"; // per-alert seen property IDs
const NOTIF_SEEN_KEY = "property-sewa:notifs:seen:v1"; // notification ids read/unread

/** =========================
 * Utils
 * ========================= */
function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function formatPrice(p: Property) {
  const currency = (p as any).currency || "USD";
  const price = Number((p as any).price) || 0;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${currency} ${price.toLocaleString()}`;
  }
}

/** =========================
 * Matching logic (YOUR SAME)
 * ========================= */
function matchesAlert(p: Property, a: AlertRule) {
  const price = Number((p as any).price) || 0;
  const beds = Number((p as any).beds) || 0;
  const baths = Number((p as any).baths) || 0;
  const sqft = Number((p as any).sqft) || 0;

  const locationText = String((p as any).address || (p as any).location || "")
    .toLowerCase()
    .trim();
  const titleText = String((p as any).title || "").toLowerCase().trim();

  if (a.query) {
    const q = a.query.toLowerCase().trim();
    const ok = titleText.includes(q) || locationText.includes(q);
    if (!ok) return false;
  }

  if (a.location) {
    const loc = a.location.toLowerCase().trim();
    if (!locationText.includes(loc)) return false;
  }

  if (typeof a.maxPrice === "number" && a.maxPrice > 0) {
    if (price > a.maxPrice) return false;
  }

  if (typeof a.minBeds === "number" && a.minBeds > 0) {
    if (beds < a.minBeds) return false;
  }

  if (typeof a.minBaths === "number" && a.minBaths > 0) {
    if (baths < a.minBaths) return false;
  }

  if (typeof a.minSqft === "number" && a.minSqft > 0) {
    if (sqft < a.minSqft) return false;
  }

  return true;
}

/** =========================
 * UI bits
 * ========================= */
function Toast({ show, text }: { show: boolean; text: string }) {
  return (
    <div
      className={[
        "fixed right-6 top-6 z-[9999] transition-all duration-200",
        show ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none",
      ].join(" ")}
    >
      <div className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg ring-1 ring-white/10">
        {text}
      </div>
    </div>
  );
}

function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9998]">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
            <div>
              <div className="text-sm font-semibold text-emerald-700">Notifications (local device)</div>
              <div className="text-2xl font-extrabold text-slate-900">{title}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-full bg-white text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
              aria-label="Close"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="px-6 py-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-2">
      <div className="text-sm font-semibold text-slate-800">{label}</div>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 outline-none transition focus:ring-2 focus:ring-emerald-200";

/** =========================
 * Page
 * ========================= */
export default function BuyerAlertsPage() {
  // backend data
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  // local rules
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [tab, setTab] = useState<TabKey>("all");
  const [toast, setToast] = useState<ToastState>({ show: false, text: "" });
  const toastTimer = useRef<number | null>(null);

  // modals
  const [openCreate, setOpenCreate] = useState(false);

  // create form (same defaults)
  const [name, setName] = useState("Price drop in Kathmandu");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("kathmandu");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const [minBeds, setMinBeds] = useState<number | "">("");
  const [minBaths, setMinBaths] = useState<number | "">("");
  const [minSqft, setMinSqft] = useState<number | "">("");

  function showToast(text: string) {
    setToast({ show: true, text });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => {
      setToast((t) => ({ ...t, show: false }));
    }, 1400);
  }

  async function refresh() {
    setLoading(true);
    try {
      const stored = readJson<{ alerts: AlertRule[] }>(ALERTS_KEY, { alerts: [] });
      setAlerts(stored.alerts || []);

      const res = await apiFetch<ListResponse>("/properties");
      setAllProperties(res.items || []);

      showToast("Refreshed");
    } catch (e) {
      console.error(e);
      showToast("Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persist(next: AlertRule[]) {
    setAlerts(next);
    writeJson(ALERTS_KEY, { alerts: next });
  }

  function createAlert() {
    const a: AlertRule = {
      id: uid(),
      name: name.trim() || "My Alert",
      enabled: true,
      query: query.trim() || undefined,
      location: location.trim() || undefined,
      maxPrice: typeof maxPrice === "number" ? maxPrice : undefined,
      minBeds: typeof minBeds === "number" ? minBeds : undefined,
      minBaths: typeof minBaths === "number" ? minBaths : undefined,
      minSqft: typeof minSqft === "number" ? minSqft : undefined,
      createdAt: Date.now(),
    };

    persist([a, ...alerts]);
    setOpenCreate(false);
    showToast("Alert created");
    setTab("alerts");
  }

  function clearAllRules() {
    persist([]);
    writeJson(LAST_SEEN_KEY, {});
    showToast("All alerts cleared");
  }

  /** -------------------------
   * Build Matches Map (same)
   * ------------------------- */
  const matchesMap = useMemo(() => {
    const map: Record<string, Property[]> = {};
    for (const a of alerts) {
      map[a.id] = allProperties.filter((p) => matchesAlert(p, a));
    }
    return map;
  }, [alerts, allProperties]);

  /** -------------------------
   * Build Notifications feed
   * ------------------------- */
  const notifications = useMemo<NotificationItem[]>(() => {
    const out: NotificationItem[] = [];

    // Alerts -> notifications from matches
    const lastSeen = readJson<Record<string, string[]>>(LAST_SEEN_KEY, {});
    for (const a of alerts) {
      if (!a.enabled) continue;

      const matches = matchesMap[a.id] || [];
      const seenSet = new Set(lastSeen[a.id] || []);

      // make 1-2 notifications per alert (top matches)
      for (const p of matches.slice(0, 4)) {
        const pid = String((p as any)._id);
        const isNew = !seenSet.has(pid);

        // We encode "new" via createdAt weighting, not changing backend
        out.push({
          id: `alert:${a.id}:${pid}`,
          type: "alerts",
          title: isNew ? "New property in your area" : "Matching property found",
          message: `${(p as any).title || "Property"} • ${formatPrice(p)} • ${
            (p as any).address || (p as any).location || "Location"
          }`,
          ctaLabel: "View Property",
          href: `/buyer/property/${pid}`,
          imageUrl: (p as any).images?.[0]?.url,
          createdAt: (p as any).createdAt ? new Date((p as any).createdAt).getTime() : Date.now() - 1000 * 60 * (isNew ? 12 : 240),
        });
      }
    }

    // Visits (demo local)
    out.push(
      {
        id: "visit:1",
        type: "visits",
        title: "Upcoming visit scheduled",
        message: "Your visit is scheduled for tomorrow at 2 PM. Please confirm your attendance.",
        ctaLabel: "View Visit Details",
        href: "/buyer/my-inquiries",
        imageUrl: allProperties?.[0]?.images?.[0]?.url,
        createdAt: Date.now() - 1000 * 60 * 60 * 9,
      },
      {
        id: "visit:2",
        type: "visits",
        title: "Visit reminder",
        message: "Don’t forget your visit this week. Check the property details before you go.",
        ctaLabel: "View Property",
        href: allProperties?.[1]?._id ? `/buyer/property/${(allProperties[1] as any)._id}` : "/buyer/search-properties",
        imageUrl: allProperties?.[1]?.images?.[0]?.url,
        createdAt: Date.now() - 1000 * 60 * 60 * 27,
      }
    );

    // Offers (demo local)
    out.push(
      {
        id: "offer:1",
        type: "offers",
        title: "Offer received",
        message: "You’ve received an offer. Review the offer details and respond.",
        ctaLabel: "View Offer",
        href: "/buyer/my-inquiries",
        imageUrl: allProperties?.[2]?.images?.[0]?.url,
        createdAt: Date.now() - 1000 * 60 * 60 * 18,
      },
      {
        id: "offer:2",
        type: "offers",
        title: "Price change alert",
        message: "The price for a saved listing has been updated. Check the new price.",
        ctaLabel: "View Property",
        href: allProperties?.[3]?._id ? `/buyer/property/${(allProperties[3] as any)._id}` : "/buyer/wishlist",
        imageUrl: allProperties?.[3]?.images?.[0]?.url,
        createdAt: Date.now() - 1000 * 60 * 60 * 40,
      }
    );

    // newest first
    out.sort((a, b) => b.createdAt - a.createdAt);
    return out;
  }, [alerts, matchesMap, allProperties]);

  /** -------------------------
   * Read/unread
   * ------------------------- */
  const seenNotifIds = useMemo(() => {
    const stored = readJson<{ ids: string[] }>(NOTIF_SEEN_KEY, { ids: [] });
    return new Set(stored.ids || []);
  }, [loading]); // re-evaluate after refresh

  const unreadCount = useMemo(() => {
    let c = 0;
    for (const n of notifications) if (!seenNotifIds.has(n.id)) c++;
    return c;
  }, [notifications, seenNotifIds]);

  function markSeen(id: string) {
    const stored = readJson<{ ids: string[] }>(NOTIF_SEEN_KEY, { ids: [] });
    const s = new Set(stored.ids || []);
    s.add(id);
    writeJson(NOTIF_SEEN_KEY, { ids: Array.from(s) });
  }

  function markAllRead() {
    writeJson(NOTIF_SEEN_KEY, { ids: notifications.map((n) => n.id) });
    showToast("Marked all as read");
  }

  function clearAllNotifications() {
    // we don't delete items (since they are derived),
    // we simply mark them all as read to simulate "clear"
    markAllRead();
  }

  /** -------------------------
   * Tab filtering
   * ------------------------- */
  const filtered = useMemo(() => {
    if (tab === "all") return notifications;
    return notifications.filter((n) => n.type === tab);
  }, [notifications, tab]);

  /** -------------------------
   * NEW tag logic (simple)
   * ------------------------- */
  function isNewNotif(id: string) {
    return !seenNotifIds.has(id);
  }

  return (
    <main className="w-full min-w-0 px-10 py-8">
      <Toast show={toast.show} text={toast.text} />

      {/* Top actions row (small, modern) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            {unreadCount} unread • Alerts are generated from your saved rules (local device)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOpenCreate(true)}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
            title="Create alert rule"
          >
            Create Alert <Plus className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={markAllRead}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50"
            title="Mark all as read"
          >
            Mark all <CheckCheck className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50"
            title="Refresh"
          >
            Refresh <RefreshCcw className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={clearAllNotifications}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50"
            title="Clear"
          >
            Clear <Trash2 className="h-4 w-4" />
          </button>

          <a
            href="/buyer/search-properties"
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
            title="Browse"
          >
            Browse <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Tabs (Figma-like) */}
      <div className="mt-6 border-b border-slate-200">
        <div className="flex flex-wrap items-end gap-6">
          <TabButton active={tab === "all"} onClick={() => setTab("all")}>
            All
          </TabButton>
          <TabButton active={tab === "alerts"} onClick={() => setTab("alerts")}>
            Alerts
          </TabButton>
          <TabButton active={tab === "visits"} onClick={() => setTab("visits")}>
            Visits
          </TabButton>
          <TabButton active={tab === "offers"} onClick={() => setTab("offers")}>
            Offers
          </TabButton>
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <div className="mt-6 rounded-3xl bg-white p-10 text-sm font-semibold text-slate-600 ring-1 ring-slate-200/70">
          Loading notifications...
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-10 rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200/70">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-200">
            <Bell className="h-6 w-6 text-emerald-700" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">No notifications</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm font-semibold text-slate-600">
            Create an alert rule and we’ll show matching listings here.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setOpenCreate(true)}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-5 py-2.5 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
            >
              Create Alert <Plus className="h-4 w-4" />
            </button>
            <a
              href="/buyer/search-properties"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              Browse Properties <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {filtered.map((n) => {
            const isNew = isNewNotif(n.id);
            const img = n.imageUrl;

            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className={[
                  "rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/70",
                  "px-6 py-6",
                  "hover:shadow-md transition",
                  isNew ? "ring-emerald-200/70" : "",
                ].join(" ")}
              >
                <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_360px] md:items-center">
                  {/* left */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      {isNew ? (
                        <span className="text-xs font-extrabold text-emerald-700">New</span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">—</span>
                      )}
                      <span className="text-xs font-semibold text-slate-500">{timeAgo(n.createdAt)}</span>
                    </div>

                    <div className="mt-2 text-lg font-extrabold text-slate-900">{n.title}</div>
                    <p className="mt-1 text-sm font-semibold text-emerald-700/90">
                      {n.message}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {n.href ? (
                        <a
                          href={n.href}
                          onClick={() => markSeen(n.id)}
                          className="inline-flex items-center justify-center rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
                        >
                          {n.ctaLabel || "View"} <ArrowRight className="ml-2 h-4 w-4" />
                        </a>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => {
                          markSeen(n.id);
                          showToast("Marked as read");
                        }}
                        className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50"
                      >
                        Mark as read
                      </button>

                      {/* small type badge */}
                      <span className="inline-flex items-center rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                        {n.type === "alerts" ? "Alerts" : n.type === "visits" ? "Visits" : "Offers"}
                      </span>
                    </div>
                  </div>

                  {/* right image */}
                  <div className="overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
                    {img ? (
                      <img src={img} alt="property" className="h-[170px] w-full object-cover" />
                    ) : (
                      <div className="grid h-[170px] w-full place-items-center text-sm font-semibold text-slate-500">
                        No image
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create alert modal (YOUR SAME, just kept) */}
      <Modal open={openCreate} title="Create Alert" onClose={() => setOpenCreate(false)}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Alert name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="e.g., Budget homes in Kathmandu"
            />
          </Field>

          <Field label="Text search (optional)">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={inputCls}
              placeholder="title or location contains..."
            />
          </Field>

          <Field label="Location contains (optional)">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={inputCls}
              placeholder="e.g., kathmandu"
            />
          </Field>

          <Field label="Max price (optional)">
            <input
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : "")}
              className={inputCls}
              inputMode="numeric"
              placeholder="e.g., 5000000"
            />
          </Field>

          <Field label="Min beds (optional)">
            <input
              value={minBeds}
              onChange={(e) => setMinBeds(e.target.value ? Number(e.target.value) : "")}
              className={inputCls}
              inputMode="numeric"
              placeholder="e.g., 2"
            />
          </Field>

          <Field label="Min baths (optional)">
            <input
              value={minBaths}
              onChange={(e) => setMinBaths(e.target.value ? Number(e.target.value) : "")}
              className={inputCls}
              inputMode="numeric"
              placeholder="e.g., 2"
            />
          </Field>

          <Field label="Min sqft (optional)">
            <input
              value={minSqft}
              onChange={(e) => setMinSqft(e.target.value ? Number(e.target.value) : "")}
              className={inputCls}
              inputMode="numeric"
              placeholder="e.g., 1200"
            />
          </Field>

          <div className="md:col-span-2 mt-2 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={clearAllRules}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
              Clear alert rules <Trash2 className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpenCreate(false)}
                className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={createAlert}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
              >
                Create <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200">
          Tip: Alerts are saved in <b>localStorage</b>. No backend/DB required.
        </div>

        {/* Show filter hint (nice touch) */}
        <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <div className="text-sm font-extrabold text-slate-900">What this alert checks</div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
            {location ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-200">
                <MapPin className="h-3.5 w-3.5" /> {location}
              </span>
            ) : null}
            {typeof maxPrice === "number" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-200">
                <DollarSign className="h-3.5 w-3.5" /> max {maxPrice.toLocaleString()}
              </span>
            ) : null}
            {typeof minBeds === "number" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-200">
                <BedDouble className="h-3.5 w-3.5" /> beds ≥ {minBeds}
              </span>
            ) : null}
            {typeof minBaths === "number" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-200">
                <Bath className="h-3.5 w-3.5" /> baths ≥ {minBaths}
              </span>
            ) : null}
            {typeof minSqft === "number" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-200">
                <Ruler className="h-3.5 w-3.5" /> sqft ≥ {minSqft}
              </span>
            ) : null}
            {query ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1 ring-1 ring-slate-200">
                <Search className="h-3.5 w-3.5" /> “{query}”
              </span>
            ) : null}
          </div>
        </div>
      </Modal>
    </main>
  );
}

/** =========================
 * Small components
 * ========================= */
function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "pb-3 text-sm font-extrabold transition",
        active ? "text-emerald-900 border-b-2 border-emerald-600" : "text-slate-500 hover:text-slate-800",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
