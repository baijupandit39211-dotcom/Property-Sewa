"use client";

type CacheEnvelope<T> = {
  ts: number;
  data: T;
};

export const SELLER_CACHE_TTL_MS = 2 * 60 * 1000;

export const SELLER_CACHE_KEYS = {
  auth: "seller_auth_cache_v1",
  leads: "seller_leads_cache_v1",
  messages: "seller_messages_cache_v1",
  myProperties30d: "seller_my_properties_cache_30d_v1",
  notificationsList: "seller_notifications_list_cache_v1",
  notificationsUnread: "seller_notifications_unread_cache_v1",
  dashboardAnalyticsPrefix: "seller_dashboard_analytics_v1",
} as const;

export function sellerDashboardAnalyticsCacheKey(range: "7d" | "30d" | "90d") {
  return `${SELLER_CACHE_KEYS.dashboardAnalyticsPrefix}:${range}`;
}

export function readFreshCache<T>(key: string, ttlMs = SELLER_CACHE_TTL_MS): T | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed.ts !== "number") return null;
    if (Date.now() - parsed.ts > ttlMs) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T): void {
  try {
    const payload: CacheEnvelope<T> = { ts: Date.now(), data };
    window.sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {}
}
