"use client";

type CacheEnvelope<T> = {
  ts: number;
  data: T;
};

export const BUYER_CACHE_TTL_MS = 90 * 1000;

export const BUYER_CACHE_KEYS = {
  auth: "buyer_auth_cache_v1",
  wishlist: "buyer_wishlist_cache_v1",
  leads: "buyer_leads_cache_v1",
  propertiesDashboard: "buyer_properties_dashboard_cache_v1",
  offersDashboard: "buyer_offers_dashboard_cache_v1",
  notifications: "buyer_notifications_cache_v1",
} as const;

export function readFreshBuyerCache<T>(key: string, ttlMs = BUYER_CACHE_TTL_MS): T | null {
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

export function writeBuyerCache<T>(key: string, data: T): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}
