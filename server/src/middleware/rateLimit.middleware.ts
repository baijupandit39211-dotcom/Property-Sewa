import type { NextFunction, Request, Response } from "express";
import { getRedisClient, isRedisReady } from "../config/redis";

type RateLimitOptions = {
  action: string;
  windowSeconds: number;
  maxRequests: number;
  message: string;
  keyGenerator?: (req: Request) => string;
};

type MemoryEntry = {
  count: number;
  resetAt: number;
};

const memoryStore = new Map<string, MemoryEntry>();

function getClientIp(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

function nowMs() {
  return Date.now();
}

function buildKey(req: Request, options: RateLimitOptions) {
  const base = options.keyGenerator ? options.keyGenerator(req) : getClientIp(req);
  return `rate_limit:${options.action}:${String(base || "unknown").trim().toLowerCase()}`;
}

function consumeMemory(key: string, windowSeconds: number) {
  const currentNow = nowMs();
  const windowMs = windowSeconds * 1000;

  const existing = memoryStore.get(key);
  if (!existing || existing.resetAt <= currentNow) {
    const next: MemoryEntry = { count: 1, resetAt: currentNow + windowMs };
    memoryStore.set(key, next);
    return { count: next.count, ttlSeconds: windowSeconds };
  }

  existing.count += 1;
  memoryStore.set(key, existing);
  const ttlSeconds = Math.max(1, Math.ceil((existing.resetAt - currentNow) / 1000));
  return { count: existing.count, ttlSeconds };
}

async function consumeRedisOrFallback(key: string, windowSeconds: number) {
  if (!isRedisReady()) {
    return consumeMemory(key, windowSeconds);
  }

  const client = getRedisClient();
  if (!client) {
    return consumeMemory(key, windowSeconds);
  }

  try {
    const count = await client.incr(key);
    if (count === 1) {
      await client.expire(key, windowSeconds);
      return { count, ttlSeconds: windowSeconds };
    }

    const ttl = await client.ttl(key);
    return {
      count,
      ttlSeconds: ttl > 0 ? ttl : windowSeconds,
    };
  } catch {
    return consumeMemory(key, windowSeconds);
  }
}

export function createRateLimit(options: RateLimitOptions) {
  return async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
    const key = buildKey(req, options);
    const { count, ttlSeconds } = await consumeRedisOrFallback(key, options.windowSeconds);

    if (count <= options.maxRequests) {
      next();
      return;
    }

    res.setHeader("Retry-After", String(ttlSeconds));
    res.status(429).json({
      success: false,
      message: options.message,
      code: "RATE_LIMIT_EXCEEDED",
      retryAfterSeconds: ttlSeconds,
    });
  };
}
