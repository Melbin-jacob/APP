import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";

// Privacy-friendly visitor counting (no cookies, nothing stored on the device):
// a visitor is sha256(daily key + IP + browser), and the daily key is random
// and expires after two days, so hashes can't be linked across days or traced
// back to anyone. Redis keeps only HyperLogLog sketches (counts) and totals;
// Postgres keeps one row of totals per day.

const TZ = process.env.STATS_TIMEZONE || "America/Toronto";
const KEEP_SECONDS = 40 * 86_400;
const BOTS = /bot|crawl|spider|slurp|headless|lighthouse|preview|monitor|curl|wget|python|axios|httpclient|java\/|go-http|facebookexternalhit|embedly/i;

/** Calendar day (YYYY-MM-DD) in the business's timezone. */
export function statDay(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

const k = (day: string, part: string) => `v:${day}:${part}`;

async function dailyKey(day: string) {
  const fresh = randomBytes(32).toString("hex");
  await redis.set(`v:salt:${day}`, fresh, "EX", 2 * 86_400, "NX");
  return (await redis.get(`v:salt:${day}`)) ?? fresh;
}

/** Normalises a page path for the "top pages" list; null = don't count. */
export function countablePath(path: string): string | null {
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  const clean = path.split(/[?#]/)[0]!.replace(/\/+$/, "") || "/";
  if (/^\/(admin|api|_next|account|dashboard|review|unsubscribe|start)(\/|$)/.test(clean)) return null;
  return clean.slice(0, 120);
}

export async function recordVisit(input: { ip: string; userAgent: string; path: string; country: string | null }) {
  if (!input.userAgent || BOTS.test(input.userAgent)) return false;
  const path = countablePath(input.path);
  if (!path) return false;
  const day = statDay();
  const visitor = createHash("sha256").update(`${await dailyKey(day)}|${input.ip}|${input.userAgent}`).digest("hex").slice(0, 32);
  const country = input.country && /^[A-Z]{2}$/.test(input.country) ? input.country : "??";
  const m = redis.multi();
  m.pfadd(k(day, "u"), visitor);
  m.pfadd(k(day, `c:${country}`), visitor);
  m.sadd(k(day, "countries"), country);
  m.incr(k(day, "pv"));
  m.zincrby(k(day, "pages"), 1, path);
  for (const part of ["u", `c:${country}`, "countries", "pv", "pages"]) m.expire(k(day, part), KEEP_SECONDS);
  await m.exec();
  return true;
}

/** Live numbers for one day, straight from Redis. */
export async function dayTotals(day: string) {
  const [visitors, pv] = await Promise.all([redis.pfcount(k(day, "u")), redis.get(k(day, "pv"))]);
  return { visitors, pageViews: Number(pv ?? 0) };
}

/** Copies the last `days` days of totals into Postgres (Redis keeps them 40 days). */
export async function syncVisitorStats(days = 35) {
  let synced = 0;
  for (let i = 0; i < days; i++) {
    const day = statDay(new Date(Date.now() - i * 86_400_000));
    const t = await dayTotals(day);
    if (!t.visitors && !t.pageViews) continue;
    const date = new Date(`${day}T00:00:00Z`);
    await db.dailyVisitorStat.upsert({ where: { day: date }, create: { day: date, ...t }, update: t });
    synced++;
  }
  return synced;
}

export async function getVisitorStats(days = 30) {
  await syncVisitorStats(Math.min(days + 5, 35)).catch(() => 0);
  const today = statDay();
  const from = new Date(Date.now() - (days - 1) * 86_400_000);
  const rows = await db.dailyVisitorStat.findMany({ where: { day: { gte: new Date(`${statDay(from)}T00:00:00Z`) } } });
  const byDay = new Map(rows.map((r) => [r.day.toISOString().slice(0, 10), r]));
  const series = Array.from({ length: days }, (_, i) => {
    const day = statDay(new Date(Date.now() - (days - 1 - i) * 86_400_000));
    return { day, visitors: byDay.get(day)?.visitors ?? 0, pageViews: byDay.get(day)?.pageViews ?? 0 };
  });

  const [live, countries, pages] = await Promise.all([
    dayTotals(today).catch(() => ({ visitors: 0, pageViews: 0 })),
    redis.smembers(k(today, "countries")).catch(() => [] as string[]),
    redis.zrevrange(k(today, "pages"), 0, 9, "WITHSCORES").catch(() => [] as string[]),
  ]);
  const byCountry = (await Promise.all(countries.map(async (c) => ({ country: c, visitors: await redis.pfcount(k(today, `c:${c}`)) }))))
    .sort((a, b) => b.visitors - a.visitors);
  const topPages = [];
  for (let i = 0; i < pages.length; i += 2) topPages.push({ path: pages[i]!, views: Number(pages[i + 1]) });

  const last = series.at(-1)!;
  last.visitors = live.visitors; // today is live
  last.pageViews = live.pageViews;
  const past = series.slice(0, -1);
  return {
    timezone: TZ,
    today: live,
    yesterday: series.at(-2) ?? { visitors: 0, pageViews: 0 },
    avgVisitors: past.length ? Math.round(past.reduce((s, d) => s + d.visitors, 0) / past.length) : 0,
    series,
    byCountry,
    topPages,
  };
}
