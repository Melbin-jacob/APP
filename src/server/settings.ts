import { db } from "@/lib/db";
import { cached, invalidate } from "@/lib/redis";

// Every feature switch with its default. Reading an unknown key is a type error.
export const SETTINGS = {
  "ads.sideBanners.enabled": true as boolean,
  "reviews.autoPublish": true as boolean,
  "reviews.reportThreshold": 3 as number,
  "traders.requireApproval": true as boolean,
  // Home page background: an uploaded image (/api/media/…), or "" for the built-in picture.
  "home.heroImageUrl": "" as string,
};

export type SettingKey = keyof typeof SETTINGS;
type SettingValue<K extends SettingKey> = (typeof SETTINGS)[K];

const CACHE_KEY = "settings:all";

async function loadAll(): Promise<Partial<typeof SETTINGS>> {
  const rows = await db.siteSetting.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export async function getSetting<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
  // Short TTL plus explicit invalidation on write: an admin toggle propagates
  // to every instance within seconds.
  const all = await cached(CACHE_KEY, 30, loadAll);
  return (all[key] ?? SETTINGS[key]) as SettingValue<K>;
}

export async function getAllSettings() {
  return { ...SETTINGS, ...(await cached(CACHE_KEY, 30, loadAll)) };
}

export async function setSetting<K extends SettingKey>(key: K, value: SettingValue<K>, actorId: string) {
  await db.siteSetting.upsert({
    where: { key },
    create: { key, value, updatedById: actorId },
    update: { value, updatedById: actorId },
  });
  await invalidate(CACHE_KEY);
}
