import type { Banner, BannerSlot } from "@prisma/client";
import { db } from "@/lib/db";
import { cached, redis } from "@/lib/redis";
import { getSetting } from "../settings";

export type PublicBanner = Pick<Banner, "id" | "slot" | "kind" | "imageUrl" | "scriptHtml" | "width" | "height" | "name"> & {
  /** Links to a page on this site (house ad): opens in the same tab. */
  internal: boolean;
};

const today = () => new Date().toISOString().slice(0, 10);

function pickWeighted<T extends { weight: number }>(items: T[]): T | undefined {
  const total = items.reduce((s, b) => s + Math.max(1, b.weight), 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= Math.max(1, item.weight);
    if (r <= 0) return item;
  }
  return items[0];
}

/**
 * One banner per side, or nothing when the global kill switch is off.
 * The switch is checked on every render so an admin toggle takes effect
 * site-wide within the settings cache TTL (seconds).
 */
export async function getSideBanners(): Promise<Partial<Record<BannerSlot, PublicBanner>>> {
  if (!(await getSetting("ads.sideBanners.enabled"))) return {};

  const now = new Date();
  const active = await cached("banners:active", 60, () =>
    db.banner.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        ],
      },
      select: { id: true, slot: true, kind: true, imageUrl: true, targetUrl: true, scriptHtml: true, width: true, height: true, name: true, weight: true },
    }),
  );

  const result: Partial<Record<BannerSlot, PublicBanner>> = {};
  for (const slot of ["LEFT", "RIGHT"] as const) {
    const chosen = pickWeighted(active.filter((b) => b.slot === slot));
    if (chosen) {
      result[slot] = {
        id: chosen.id, slot: chosen.slot, kind: chosen.kind, imageUrl: chosen.imageUrl,
        scriptHtml: chosen.scriptHtml, width: chosen.width, height: chosen.height, name: chosen.name,
        internal: !!chosen.targetUrl?.startsWith("/"),
      };
      redis.hincrby(`banner:stats:${today()}`, `${chosen.id}:i`, 1).catch(() => {});
    }
  }
  return result;
}

export async function recordBannerClick(id: string): Promise<string | null> {
  const banner = await db.banner.findUnique({ where: { id }, select: { targetUrl: true, kind: true } });
  if (!banner || banner.kind !== "IMAGE" || !banner.targetUrl) return null;
  await redis.hincrby(`banner:stats:${today()}`, `${id}:c`, 1).catch(() => {});
  return banner.targetUrl;
}

/** Moves Redis counters into BannerStat. Run every few minutes from cron. */
export async function flushBannerStats(day = today()) {
  const key = `banner:stats:${day}`;
  const tmp = `${key}:flush:${Date.now()}`;
  // RENAME is atomic: increments that land mid-flush go to a fresh hash.
  try {
    await redis.rename(key, tmp);
  } catch {
    return 0; // nothing to flush
  }
  const counts = await redis.hgetall(tmp);
  const perBanner = new Map<string, { i: number; c: number }>();
  for (const [field, value] of Object.entries(counts)) {
    const [id, kind] = field.split(":") as [string, "i" | "c"];
    const entry = perBanner.get(id) ?? { i: 0, c: 0 };
    entry[kind] += Number(value);
    perBanner.set(id, entry);
  }
  const date = new Date(`${day}T00:00:00Z`);
  const existing = new Set((await db.banner.findMany({ where: { id: { in: [...perBanner.keys()] } }, select: { id: true } })).map((b) => b.id));
  for (const [bannerId, { i, c }] of perBanner) {
    if (!existing.has(bannerId)) continue;
    await db.bannerStat.upsert({
      where: { bannerId_day: { bannerId, day: date } },
      create: { bannerId, day: date, impressions: i, clicks: c },
      update: { impressions: { increment: i }, clicks: { increment: c } },
    });
  }
  await redis.del(tmp);
  return perBanner.size;
}
