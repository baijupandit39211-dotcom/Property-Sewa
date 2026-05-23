import { getRedisClient, isRedisReady } from "../config/redis";

const DEFAULT_TTL_SECONDS = 60;
const DEFAULT_CACHE_NAMESPACE = "property:v1";

function getCacheTtlSeconds() {
  const raw = Number(process.env.PROPERTY_CACHE_TTL_SECONDS || DEFAULT_TTL_SECONDS);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_TTL_SECONDS;
}

function getCacheNamespace() {
  const value = String(process.env.PROPERTY_CACHE_NAMESPACE || DEFAULT_CACHE_NAMESPACE).trim();
  return value || DEFAULT_CACHE_NAMESPACE;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));

  return `{${entries
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
    .join(",")}}`;
}

export function makeCacheKey(prefix: string, payload: unknown) {
  return `${getCacheNamespace()}:${prefix}:${stableStringify(payload)}`;
}

export async function getJsonCache<T>(key: string): Promise<T | null> {
  if (!isRedisReady()) return null;
  const client = getRedisClient();
  if (!client) return null;

  let raw: string | null = null;
  try {
    raw = await client.get(key);
  } catch (error) {
    console.warn("[cache] redis get failed", { key, error });
    return null;
  }
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setJsonCache<T>(key: string, value: T, ttlSeconds = getCacheTtlSeconds()) {
  if (!isRedisReady()) return;
  const client = getRedisClient();
  if (!client) return;

  try {
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (error) {
    console.warn("[cache] redis set failed", { key, ttlSeconds, error });
  }
}

export async function deleteByPattern(pattern: string) {
  if (!isRedisReady()) return;
  const client = getRedisClient();
  if (!client) return;

  try {
    const keys: string[] = [];
    for await (const key of client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      keys.push(String(key));
    }

    if (keys.length > 0) {
      await client.del(keys);
    }
  } catch (error) {
    console.warn("[cache] redis deleteByPattern failed", { pattern, error });
  }
}
