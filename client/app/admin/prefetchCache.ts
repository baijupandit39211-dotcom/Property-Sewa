"use client";

type CacheEnvelope<T> = {
  ts: number;
  data: T;
};

export const ADMIN_CACHE_TTL_MS = 90 * 1000;

export const ADMIN_CACHE_KEYS = {
  auth: "admin_auth_cache_v1",
  overview: "admin_overview_cache_v1",
  notifications: "admin_notifications_cache_v1",
  usersStats: "admin_users_stats_cache_v1",
  listingsPending: "admin_listings_pending_cache_v1",
} as const;

export function readFreshAdminCache<T>(key: string, ttlMs = ADMIN_CACHE_TTL_MS): T | null {
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

export function writeAdminCache<T>(key: string, data: T): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}
