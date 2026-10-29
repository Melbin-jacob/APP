import type { Banner, BannerSlot } from "@prisma/client";
import { cache } from "react";
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

export const BANNER_SLOTS = ["LEFT", "RIGHT", "LEADERBOARD", "MOBILE"] as const;

/**
 * One banner per slot, or nothing when the global kill switch is off.
 * The switch is checked on every render so an admin toggle takes effect
 * site-wide within the settings cache TTL (seconds).
 */
export type BannerSet = Partial<Record<BannerSlot, PublicBanner>> & {
  /** Second phone / tablet banner, shown among listings; a different ad from the top one when the slot has several. */
  feed?: { MOBILE?: PublicBanner; LEADERBOARD?: PublicBanner };
};

const toPublic = (b: { id: string; slot: BannerSlot; kind: Banner["kind"]; imageUrl: string | null; scriptHtml: string | null; width: number; height: number; name: string; targetUrl: string | null }): PublicBanner => ({
  id: b.id, slot: b.slot, kind: b.kind, imageUrl: b.imageUrl, scriptHtml: b.scriptHtml, width: b.width, height: b.height, name: b.name,
  internal: !!b.targetUrl?.startsWith("/"),
});

// Once per request (React cache), so the page shell and the listings agree on
// which banners are showing and the in-listing banner can differ from the top one.
export const getBanners = cache(loadBanners);

async function loadBanners(): Promise<BannerSet> {
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

  const result: BannerSet = { feed: {} };
  for (const slot of BANNER_SLOTS) {
    const candidates = active.filter((b) => b.slot === slot);
    const chosen = pickWeighted(candidates);
    if (!chosen) continue;
    result[slot] = toPublic(chosen);
    if (slot === "MOBILE" || slot === "LEADERBOARD") {
      const others = candidates.filter((b) => b.id !== chosen.id);
      result.feed![slot] = toPublic(others.length ? pickWeighted(others)! : chosen);
    }
  }
  return result;
}

/**
 * Counts an impression. Called from the browser once the banner is actually
 * on screen: every slot is rendered, but CSS hides those that don't fit the
 * device (side rails on phones, the top banner on wide desktops).
 */
export async function recordBannerImpression(id: string) {
  const active = await cached("banners:active-ids", 60, async () => (await db.banner.findMany({ where: { isActive: true }, select: { id: true } })).map((b) => b.id));
  if (!active.includes(id)) return;
  await redis.hincrby(`banner:stats:${today()}`, `${id}:i`, 1).catch(() => {});
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
