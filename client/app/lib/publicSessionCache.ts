"use client";

import { apiFetchSafe } from "@/app/lib/api";

type SessionUser = {
  name?: string;
  email?: string;
  role?: string;
  avatar?: string;
};

type PublicMeResponse = { user?: SessionUser } | null;
type CacheEnvelope<T> = { ts: number; data: T };

const PUBLIC_AUTH_CACHE_KEY = "public_auth_cache_v1";
const PUBLIC_AUTH_TTL_MS = 60 * 1000;
let inFlightAuthPromise: Promise<SessionUser | null> | null = null;

function readFreshPublicCache<T>(key: string, ttlMs: number): T | null {
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

function writePublicCache<T>(key: string, data: T): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

export function getCachedPublicSessionUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  return readFreshPublicCache<SessionUser | null>(PUBLIC_AUTH_CACHE_KEY, PUBLIC_AUTH_TTL_MS);
}

export async function getPublicSessionUser(forceRefresh = false): Promise<SessionUser | null> {
  if (typeof window === "undefined") return null;

  if (!forceRefresh) {
    const cached = getCachedPublicSessionUser();
    if (cached) return cached;
  }

  if (inFlightAuthPromise) return inFlightAuthPromise;

  inFlightAuthPromise = (async () => {
    const meResponse = await apiFetchSafe<PublicMeResponse>("/auth/me");
    if (meResponse?.user) {
      writePublicCache(PUBLIC_AUTH_CACHE_KEY, meResponse.user);
      return meResponse.user;
    }

    const adminResponse = await apiFetchSafe<PublicMeResponse>("/auth/admin/me");
    const user = adminResponse?.user || null;
    writePublicCache(PUBLIC_AUTH_CACHE_KEY, user);
    return user;
  })();

  try {
    return await inFlightAuthPromise;
  } finally {
    inFlightAuthPromise = null;
  }
}

