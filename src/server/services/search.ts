import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";

export const searchQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.string().trim().max(60).regex(/^[a-z0-9-]*$/).optional(),
  location: z.string().trim().max(80).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().int().min(1).max(200).default(25),
  sort: z.enum(["relevance", "distance", "rating"]).default("relevance"),
  page: z.coerce.number().int().min(1).max(50).default(1),
  pageSize: z.coerce.number().int().min(1).max(48).default(12),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

export type TraderCard = {
  id: string;
  slug: string;
  businessName: string;
  city: string;
  postcode: string;
  addressLine: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  hourlyRatePence: number | null;
  currency: string;
  ratingAvg: number;
  ratingCount: number;
  categoryName: string | null;
  categorySlug: string | null;
  categoryIcon: string | null;
  distanceKm: number | null;
};

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * Resolve "City or Zip" to a point. Production should call a geocoder
 * (Mapbox / Google / postcodes.io) behind this function; this fallback
 * centres on the traders we already know in that city or postcode district.
 */
export async function geocode(location: string): Promise<{ lat: number; lng: number } | null> {
  const term = location.trim();
  if (!term) return null;
  const outward = term.toUpperCase().split(/\s+/)[0];
  const rows = await db.$queryRaw<{ lat: number | null; lng: number | null }[]>`
    SELECT AVG("latitude")::float AS lat, AVG("longitude")::float AS lng
    FROM "TraderProfile"
    WHERE "city" ILIKE ${escapeLike(term)} OR UPPER("postcode") LIKE ${escapeLike(outward) + "%"}`;
  const row = rows[0];
  return row?.lat != null && row.lng != null ? { lat: row.lat, lng: row.lng } : null;
}

/**
 * Geo + keyword + category search over approved traders.
 * All user input reaches SQL as bound parameters via Prisma.sql.
 */
export async function searchTraders(query: SearchQuery): Promise<{ items: TraderCard[]; total: number }> {
  let point: { lat: number; lng: number } | null =
    query.lat != null && query.lng != null ? { lat: query.lat, lng: query.lng } : null;
  if (!point && query.location) point = await geocode(query.location);

  const geoPoint = point
    ? Prisma.sql`ST_SetSRID(ST_MakePoint(${point.lng}, ${point.lat}), 4326)::geography`
    : null;

  const where: Prisma.Sql[] = [Prisma.sql`t."status" = 'APPROVED'`];

  if (query.category) {
    where.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "TraderCategory" tc2 JOIN "Category" c2 ON c2."id" = tc2."categoryId"
      WHERE tc2."traderId" = t."id" AND c2."slug" = ${query.category})`);
  }

  if (query.q) {
    const like = `%${escapeLike(query.q)}%`;
    where.push(Prisma.sql`(
      t."businessName" ILIKE ${like}
      OR similarity(t."businessName", ${query.q}) > 0.3
      OR EXISTS (
        SELECT 1 FROM "TraderCategory" tc3 JOIN "Category" c3 ON c3."id" = tc3."categoryId"
        WHERE tc3."traderId" = t."id" AND c3."name" ILIKE ${like})
      OR EXISTS (SELECT 1 FROM "Service" s WHERE s."traderId" = t."id" AND s."title" ILIKE ${like}))`);
  }

  if (geoPoint) {
    // Customer must be inside both the searched radius and the trader's own
    // service radius — or in a postcode the trader explicitly covers.
    const outward = query.location?.toUpperCase().split(/\s+/)[0] ?? "";
    where.push(Prisma.sql`(
      ST_DWithin(t."location", ${geoPoint}, LEAST(${query.radiusKm}, t."serviceRadiusKm") * 1000)
      OR (${outward} <> '' AND EXISTS (
        SELECT 1 FROM "ServiceArea" sa WHERE sa."traderId" = t."id" AND sa."postcode" = ${outward})))`);
  }

  const whereSql = Prisma.join(where, " AND ");
  const distanceSql = geoPoint ? Prisma.sql`ST_Distance(t."location", ${geoPoint}) / 1000.0` : Prisma.sql`NULL::float`;

  const orderSql =
    query.sort === "distance" && geoPoint
      ? Prisma.sql`"distanceKm" ASC NULLS LAST`
      : query.sort === "rating" || !geoPoint
        ? Prisma.sql`t."ratingAvg" DESC, t."ratingCount" DESC`
        : // relevance: Bayesian-ish rating weighted against distance
          Prisma.sql`(t."ratingAvg" * LEAST(t."ratingCount", 20) / 20.0) - (${distanceSql} / 10.0) DESC`;

  const offset = (query.page - 1) * query.pageSize;

  const [items, count] = await Promise.all([
    db.$queryRaw<TraderCard[]>`
      SELECT t."id", t."slug", t."businessName", t."city", t."postcode", t."addressLine",
             t."logoUrl", t."coverImageUrl", t."hourlyRatePence", t."currency",
             t."ratingAvg"::float AS "ratingAvg", t."ratingCount",
             pc."name" AS "categoryName", pc."slug" AS "categorySlug", pc."icon" AS "categoryIcon",
             ${distanceSql} AS "distanceKm"
      FROM "TraderProfile" t
      LEFT JOIN LATERAL (
        SELECT c."name", c."slug", c."icon" FROM "TraderCategory" tc
        JOIN "Category" c ON c."id" = tc."categoryId"
        WHERE tc."traderId" = t."id" ORDER BY tc."isPrimary" DESC LIMIT 1
      ) pc ON TRUE
      WHERE ${whereSql}
      ORDER BY ${orderSql}
      LIMIT ${query.pageSize} OFFSET ${offset}`,
    db.$queryRaw<{ total: bigint }[]>`SELECT COUNT(*) AS total FROM "TraderProfile" t WHERE ${whereSql}`,
  ]);

  return { items, total: Number(count[0]?.total ?? 0) };
}

/** Typeahead over categories + business names, trigram-ranked. */
export async function autocomplete(term: string) {
  const q = term.trim().slice(0, 40);
  if (q.length < 2) return [];
  const like = `${escapeLike(q)}%`;
  return db.$queryRaw<{ type: "category" | "trader"; label: string; slug: string }[]>`
    (SELECT 'category' AS type, "name" AS label, "slug" FROM "Category"
      WHERE "isActive" AND ("name" ILIKE ${like} OR similarity("name", ${q}) > 0.3)
      ORDER BY similarity("name", ${q}) DESC LIMIT 5)
    UNION ALL
    (SELECT 'trader' AS type, "businessName" AS label, "slug" FROM "TraderProfile"
      WHERE "status" = 'APPROVED' AND ("businessName" ILIKE ${like} OR similarity("businessName", ${q}) > 0.3)
      ORDER BY similarity("businessName", ${q}) DESC LIMIT 5)`;
}
