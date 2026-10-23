import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";

type DailyPoint = { day: string; count: number };

// Table identifiers can't be query parameters, so each is a fixed SQL fragment;
// nothing user-supplied ever reaches the SQL text.
const TABLES = { User: Prisma.raw('"User"'), SearchQuery: Prisma.raw('"SearchQuery"'), Review: Prisma.raw('"Review"') } as const;

const daily = (table: keyof typeof TABLES, days: number) =>
  db.$queryRaw<DailyPoint[]>`
    SELECT to_char(d, 'YYYY-MM-DD') AS day, COUNT(x."id")::int AS count
    FROM generate_series(current_date - (${days}::int - 1), current_date, '1 day') d
    LEFT JOIN ${TABLES[table]} x ON x."createdAt"::date = d
    GROUP BY d ORDER BY d`;

export async function getDashboard(days = 30) {
  const started = Date.now();
  const [signups, searches, reviews, totals, pending, topSearches, dbPing, redisPing] = await Promise.all([
    daily("User", days),
    daily("SearchQuery", days),
    daily("Review", days),
    Promise.all([
      db.user.count({ where: { role: "CUSTOMER", deletedAt: null } }),
      db.traderProfile.count({ where: { status: "APPROVED" } }),
      db.review.count({ where: { status: "PUBLISHED" } }),
    ]),
    Promise.all([
      db.traderProfile.count({ where: { status: "PENDING" } }),
      db.review.count({ where: { status: "PENDING_MODERATION" } }),
      db.credential.count({ where: { status: "PENDING" } }),
      db.listingClaim.count({ where: { status: "PENDING" } }),
      db.quoteRequest.count({ where: { status: "NEW", trader: { userId: null } } }),
    ]),
    db.$queryRaw<{ keyword: string; count: number }[]>`
      SELECT LOWER("keyword") AS keyword, COUNT(*)::int AS count FROM "SearchQuery"
      WHERE "keyword" IS NOT NULL AND "createdAt" > now() - interval '7 days'
      GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
    (async () => { const t = Date.now(); await db.$queryRaw`SELECT 1`; return Date.now() - t; })().catch(() => -1),
    (async () => { const t = Date.now(); await redis.ping(); return Date.now() - t; })().catch(() => -1),
  ]);

  return {
    totals: { customers: totals[0], traders: totals[1], reviews: totals[2] },
    queues: { pendingTraders: pending[0], pendingReviews: pending[1], pendingCredentials: pending[2], pendingClaims: pending[3], quotesToForward: pending[4] },
    series: { signups, searches, reviews },
    topSearches,
    health: {
      postgresMs: dbPing, redisMs: redisPing, generatedInMs: Date.now() - started,
      memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024), uptimeS: Math.round(process.uptime()),
    },
  };
}
