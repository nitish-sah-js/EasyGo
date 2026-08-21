import crypto from "node:crypto";
import IORedis from "ioredis";
import { env } from "../config/env";

interface MemoryEntry {
  expiresAt: number;
  payload: string;
}

interface CacheLogOptions {
  label?: string;
  liveAction?: string;
}

const memoryCache = new Map<string, MemoryEntry>();

let redis: IORedis | undefined;
let redisUnavailableUntil = 0;
let redisFailureLoggedUntil = 0;

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function keyPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

function readableKeyParts(parts: unknown): string {
  if (!parts || typeof parts !== "object") return "request";
  const candidate = (parts as { keyParts?: unknown }).keyParts;
  if (!Array.isArray(candidate)) return "request";
  return candidate.map((part) => keyPart(String(part))).join(":");
}

function cacheKey(namespace: string, parts: unknown): string {
  const digest = crypto.createHash("sha256").update(stableStringify(parts)).digest("hex");
  return `nexttour:scr:${keyPart(namespace)}:${readableKeyParts(parts)}:${digest}`;
}

function markRedisUnavailable(reason?: unknown) {
  redisUnavailableUntil = Date.now() + 30_000;
  if (Date.now() >= redisFailureLoggedUntil) {
    redisFailureLoggedUntil = redisUnavailableUntil;
    const message = reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "connection failed";
    logCache(`Redis unavailable; using process memory cache only (${message})`);
  }
}

async function getRedis(): Promise<IORedis | undefined> {
  if (Date.now() < redisUnavailableUntil) return undefined;

  if (redis?.status === "end") {
    redis = undefined;
  }

  redis ??= new IORedis(env.REDIS_URL, {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 1_000,
  });
  if (redis.listenerCount("error") === 0) {
    redis.on("error", (error) => {
      markRedisUnavailable(error);
    });
  }

  try {
    if (redis.status === "wait") {
      await redis.connect();
    }
    return redis.status === "ready" ? redis : undefined;
  } catch (error) {
    markRedisUnavailable(error);
    return undefined;
  }
}

async function readRedis(key: string): Promise<string | undefined> {
  const client = await getRedis();
  if (!client) return undefined;

  try {
    return (await client.get(key)) ?? undefined;
  } catch (error) {
    markRedisUnavailable(error);
    return undefined;
  }
}

async function writeRedis(key: string, payload: string, ttlSeconds: number): Promise<void> {
  const client = await getRedis();
  if (!client) return;

  try {
    await client.set(key, payload, "EX", ttlSeconds);
  } catch (error) {
    markRedisUnavailable(error);
  }
}

function countOf(value: unknown): string {
  if (Array.isArray(value)) return `${value.length} result${value.length === 1 ? "" : "s"}`;
  return "result saved";
}

function logCache(message: string) {
  console.log(`[provider-cache] ${message}`);
}

function logLive(message: string) {
  console.log(`[provider-live] ${message}`);
}

/**
 * How long to keep a result. A function is handed the loaded value, so a caller
 * can hold a good answer for hours while letting an empty one expire in minutes
 * — otherwise a lookup that came back empty for a fixable reason (an API key
 * missing an entitlement, a provider having a bad day) stays wrong for the whole
 * TTL long after the cause is fixed.
 */
type CacheTtl<T> = number | ((value: T) => number);

function resolveTtl<T>(ttl: CacheTtl<T>, value: T): number {
  return typeof ttl === "function" ? ttl(value) : ttl;
}

export async function cachedProviderResult<T>(
  namespace: string,
  parts: unknown,
  ttlSeconds: CacheTtl<T>,
  load: () => Promise<T>,
  options: CacheLogOptions = {},
): Promise<T> {
  const key = cacheKey(namespace, parts);
  const label = options.label ?? namespace;
  const liveAction = options.liveAction ?? "live provider hit";
  const now = Date.now();
  const memoryEntry = memoryCache.get(key);

  if (memoryEntry && memoryEntry.expiresAt > now) {
    const value = JSON.parse(memoryEntry.payload) as T;
    logCache(`${label}: served from memory cache (${countOf(value)})`);
    return value;
  }

  const redisPayload = await readRedis(key);
  if (redisPayload) {
    const value = JSON.parse(redisPayload) as T;
    memoryCache.set(key, { payload: redisPayload, expiresAt: now + resolveTtl(ttlSeconds, value) * 1_000 });
    logCache(`${label}: served from Redis cache (${countOf(value)})`);
    return value;
  }

  if (ttlSeconds === 0) {
    logCache(`${label}: cache disabled`);
    logLive(`${label}: ${liveAction}`);
    const startedAt = Date.now();
    try {
      const uncachedValue = await load();
      logLive(`${label}: completed in ${Date.now() - startedAt}ms (${countOf(uncachedValue)})`);
      return uncachedValue;
    } catch (error) {
      logLive(`${label}: failed after ${Date.now() - startedAt}ms: ${error instanceof Error ? error.message : "unknown error"}`);
      throw error;
    }
  }

  logCache(`${label}: cache miss`);
  logLive(`${label}: ${liveAction}`);
  const startedAt = Date.now();
  let value: T;
  try {
    value = await load();
  } catch (error) {
    logLive(`${label}: failed after ${Date.now() - startedAt}ms: ${error instanceof Error ? error.message : "unknown error"}`);
    throw error;
  }
  const payload = JSON.stringify(value);
  const ttl = resolveTtl(ttlSeconds, value);
  if (ttl > 0) {
    memoryCache.set(key, { payload, expiresAt: now + ttl * 1_000 });
    await writeRedis(key, payload, ttl);
  }
  logCache(`${label}: stored for ${ttl}s after ${Date.now() - startedAt}ms (${countOf(value)})`);
  return value;
}
