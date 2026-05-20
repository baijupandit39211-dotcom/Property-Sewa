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

type WishlistCacheItem = { propertyId?: string | { _id?: string } | null };
type WishlistCacheShape = { items?: WishlistCacheItem[]; total?: number; page?: number; limit?: number };

function wishlistIdFromItem(item: WishlistCacheItem): string | null {
  if (!item) return null;
  if (typeof item.propertyId === "string") return item.propertyId;
  return item.propertyId?._id || null;
}

export function readWishlistIdsFromCache(): string[] {
  const cached = readFreshBuyerCache<WishlistCacheShape>(BUYER_CACHE_KEYS.wishlist);
  if (!cached?.items?.length) return [];
  return cached.items
    .map((item) => wishlistIdFromItem(item))
    .filter((id): id is string => Boolean(id));
}

export function writeWishlistIdsToCache(nextIds: string[]): void {
  const current = readFreshBuyerCache<WishlistCacheShape>(BUYER_CACHE_KEYS.wishlist);
  const currentItems = current?.items || [];

  const itemById = new Map<string, WishlistCacheItem>();
  for (const item of currentItems) {
    const id = wishlistIdFromItem(item);
    if (id) itemById.set(id, item);
  }

  const items = nextIds.map((id) => itemById.get(id) || { propertyId: id });
  writeBuyerCache(BUYER_CACHE_KEYS.wishlist, {
    items,
    total: items.length,
    page: 1,
    limit: Math.max(items.length, 1),
  });
}

export function addWishlistIdToCache(id: string): void {
  const currentIds = readWishlistIdsFromCache();
  if (currentIds.includes(id)) return;
  writeWishlistIdsToCache([id, ...currentIds]);
}

export function removeWishlistIdFromCache(id: string): void {
  const currentIds = readWishlistIdsFromCache();
  writeWishlistIdsToCache(currentIds.filter((currentId) => currentId !== id));
}
