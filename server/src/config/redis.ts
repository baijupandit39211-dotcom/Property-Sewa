import { createClient, type RedisClientType } from "redis";
import { logger } from "../utils/logger";

let redisClient: RedisClientType | null = null;
let connectPromise: Promise<void> | null = null;
let isReady = false;

function getRedisUrl() {
  const value = String(process.env.REDIS_URL || "").trim();
  return value.length > 0 ? value : null;
}

export function isRedisEnabled() {
  return Boolean(getRedisUrl());
}

export function isRedisReady() {
  return isReady;
}

export function getRedisClient() {
  return redisClient;
}

export async function connectRedis() {
  if (!isRedisEnabled()) {
    logger.info("Redis disabled (REDIS_URL not set).");
    return;
  }

  if (isReady) return;
  if (connectPromise) return connectPromise;

  const url = getRedisUrl() as string;
  redisClient = createClient({ url });

  redisClient.on("error", (error) => {
    logger.warn("Redis error:", error);
  });

  redisClient.on("ready", () => {
    isReady = true;
    logger.info("Redis connected.");
  });

  redisClient.on("end", () => {
    isReady = false;
    logger.warn("Redis connection closed.");
  });

  connectPromise = redisClient
    .connect()
    .then(() => {
      isReady = true;
    })
    .catch((error) => {
      isReady = false;
      logger.warn("Redis unavailable, continuing without cache:", error);
    })
    .finally(() => {
      connectPromise = null;
    });

  return connectPromise;
}

export async function disconnectRedis() {
  if (!redisClient) return;

  try {
    await redisClient.quit();
  } catch {
    // ignore shutdown errors
  } finally {
    redisClient = null;
    isReady = false;
  }
}
