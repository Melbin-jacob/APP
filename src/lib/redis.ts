import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis?: Redis };

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    // Queue briefly while (re)connecting, but give up fast so a Redis outage
    // degrades to the fallbacks in cached()/rateLimit() instead of hanging.
    maxRetriesPerRequest: 2,
    connectTimeout: 2000,
  });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

/** Read-through cache. Falls back to the loader if Redis is unavailable. */
export async function cached<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
  try {
    const hit = await redis.get(key);
    if (hit) return JSON.parse(hit) as T;
  } catch {
    return load();
  }
  const value = await load();
  redis.set(key, JSON.stringify(value), "EX", ttlSeconds).catch(() => {});
  return value;
}

export async function invalidate(...keys: string[]) {
  if (keys.length) await redis.del(...keys).catch(() => {});
}
