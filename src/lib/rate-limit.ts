import { redis } from "./redis";

export type RateLimitRule = { limit: number; windowSeconds: number };

// Named policies so every endpoint of a kind shares one budget.
export const RATE_LIMITS = {
  login: { limit: 5, windowSeconds: 60 * 15 }, // per account
  loginIp: { limit: 50, windowSeconds: 60 * 15 }, // per IP; looser so shared NATs aren't locked out
  register: { limit: 5, windowSeconds: 60 * 60 },
  magicLink: { limit: 3, windowSeconds: 60 * 15 },
  reviewSubmit: { limit: 5, windowSeconds: 60 * 60 },
  reviewRequest: { limit: 50, windowSeconds: 60 * 60 * 24 },
  reviewReport: { limit: 10, windowSeconds: 60 * 60 },
  newsletter: { limit: 5, windowSeconds: 60 * 60 },
  search: { limit: 120, windowSeconds: 60 },
  geoLookup: { limit: 30, windowSeconds: 60 },
  callClick: { limit: 30, windowSeconds: 60 * 60 },
  quoteRequest: { limit: 5, windowSeconds: 60 * 60 }, // per IP
  listingClaim: { limit: 5, windowSeconds: 60 * 60 * 24 }, // per user
  upload: { limit: 20, windowSeconds: 60 * 60 }, // per user
  consent: { limit: 30, windowSeconds: 60 * 60 }, // per IP
} satisfies Record<string, RateLimitRule>;

export type RateLimitResult = { ok: boolean; remaining: number; retryAfterSeconds: number };

// Sliding-window log in a sorted set. The Lua script makes trim + count + add
// atomic so concurrent requests cannot both slip under the limit.
const SLIDING_WINDOW = `
local key    = KEYS[1]
local now    = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit  = tonumber(ARGV[3])
local member = ARGV[4]
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)
if count >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  return {0, count, tonumber(oldest[2])}
end
redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, window)
return {1, count + 1, 0}
`;

/** Clears a budget, e.g. an account's failed-login count once it signs in successfully. */
export async function resetRateLimit(policy: keyof typeof RATE_LIMITS, identifier: string) {
  await redis.del(`rl:${policy}:${identifier}`).catch(() => {});
}

export async function rateLimit(
  policy: keyof typeof RATE_LIMITS,
  identifier: string,
): Promise<RateLimitResult> {
  const { limit, windowSeconds } = RATE_LIMITS[policy];
  const windowMs = windowSeconds * 1000;
  const now = Date.now();
  const member = `${now}-${Math.random().toString(36).slice(2)}`;
  try {
    const [allowed, count, oldest] = (await redis.eval(
      SLIDING_WINDOW,
      1,
      `rl:${policy}:${identifier}`,
      now,
      windowMs,
      limit,
      member,
    )) as [number, number, number];
    return {
      ok: allowed === 1,
      remaining: Math.max(0, limit - count),
      retryAfterSeconds: allowed === 1 ? 0 : Math.ceil((oldest + windowMs - now) / 1000),
    };
  } catch {
    // Fail closed for auth-sensitive policies, open for read paths.
    const failOpen = policy === "search" || policy === "callClick" || policy === "geoLookup";
    return { ok: failOpen, remaining: 0, retryAfterSeconds: failOpen ? 0 : 60 };
  }
}
