import { z } from "zod";
import { db } from "@/lib/db";
import { invalidate, invalidatePrefix } from "@/lib/redis";
import { ApiError, notFound } from "../http";

/** The signed-in trader's own profile, or 404. */
export async function myTraderProfile(userId: string) {
  const profile = await db.traderProfile.findUnique({ where: { userId } });
  if (!profile) throw notFound("Business profile");
  return profile;
}

/** Drop every cache that can show this business (profile, listings, category counts). */
export async function invalidateTrader(slug: string) {
  await invalidate(`trader:${slug}`);
  await invalidate("markets:counts");
  await invalidatePrefix("traders:featured:", "categories:popular:");
}

export const PRICE_UNITS = ["hour", "job", "visit", "day", "sqft", "sqm"] as const;

export const serviceInput = z.object({
  title: z.string().trim().min(2).max(120),
  categoryId: z.string().cuid(),
  description: z.string().max(1000).nullish(),
  priceFromPence: z.number().int().min(0).max(10_000_000).nullish(),
  priceUnit: z.enum(PRICE_UNITS).nullish(),
});

export const MAX_SERVICES = 50;

/** A service must belong to one of the business's own trades. */
export async function assertOwnTrade(traderId: string, categoryId: string) {
  const ok = await db.traderCategory.findUnique({ where: { traderId_categoryId: { traderId, categoryId } } });
  if (!ok) throw new ApiError(422, "invalid_category", "Choose one of your trades");
}
