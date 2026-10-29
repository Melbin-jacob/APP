import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { type CountryCode, parsePostcode } from "@/lib/postcode";
import { cached } from "@/lib/redis";
import { lookupPostcode } from "./geo";

/** Result orderings offered in the "Sort by" menu. "distance" needs a location. */
export const SEARCH_SORTS = ["relevance", "rating", "reviews", "distance", "price_low", "price_high", "newest", "name"] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];

export const searchQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.string().trim().max(60).regex(/^[a-z0-9-]*$/).optional(),
  location: z.string().trim().max(80).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().int().min(1).max(200).default(25),
  sort: z.enum(SEARCH_SORTS).catch("relevance").default("relevance"),
  page: z.coerce.number().int().min(1).max(500).default(1),
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
  canCall: boolean;
};

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * Resolve "City or ZIP" to a point within the visitor's country. Full
 * postal codes go through the postal-code lookup; city names and partial
 * codes centre on the professionals we already list there.
 */
export async function geocode(location: string, country: CountryCode): Promise<{ lat: number; lng: number } | null> {
  const term = location.trim();
  if (!term) return null;
  // A full postal code resolves exactly; search must still work if the
  // lookup service is down, so failures fall through to the estimate below.
  if (parsePostcode(country, term)) {
    const hit = await lookupPostcode(country, term).catch(() => null);
    if (hit) return { lat: hit.latitude, lng: hit.longitude };
  }
  const outward = term.toUpperCase().split(/\s+/)[0];
  const rows = await db.$queryRaw<{ lat: number | null; lng: number | null }[]>`
    SELECT AVG("latitude")::float AS lat, AVG("longitude")::float AS lng
    FROM "TraderProfile"
    WHERE "country" = ${country}
      AND ("city" ILIKE ${escapeLike(term)} OR UPPER("postcode") LIKE ${escapeLike(outward) + "%"})`;
  const row = rows[0];
  return row?.lat != null && row.lng != null ? { lat: row.lat, lng: row.lng } : null;
}

/**
 * Geo + keyword + category search over approved traders in one country.
 * `country` comes from the visitor (location or their choice), never from the
 * query string, so listings never cross markets.
 * All user input reaches SQL as bound parameters via Prisma.sql.
 */
export async function searchTraders(query: SearchQuery, country: CountryCode): Promise<{ items: TraderCard[]; total: number }> {
  let point: { lat: number; lng: number } | null =
    query.lat != null && query.lng != null ? { lat: query.lat, lng: query.lng } : null;
  if (!point && query.location) point = await geocode(query.location, country);

  const geoPoint = point
    ? Prisma.sql`ST_SetSRID(ST_MakePoint(${point.lng}, ${point.lat}), 4326)::geography`
    : null;

  const where: Prisma.Sql[] = [Prisma.sql`t."status" = 'APPROVED'`, Prisma.sql`t."country" = ${country}`];

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

  // "Highest rated" uses a Bayesian average (as if every business also had 5
  // reviews at 4.0), so one 5-star review doesn't outrank fifty 4.9s.
  const bayesian = Prisma.sql`((t."ratingAvg" * t."ratingCount" + 4.0 * 5) / (t."ratingCount" + 5))`;
  const orders: Record<SearchSort, Prisma.Sql> = {
    // Best match: rating (trusted more as reviews grow) weighed against distance when there's a location.
    relevance: geoPoint
      ? Prisma.sql`(t."ratingAvg" * LEAST(t."ratingCount", 20) / 20.0) - (${distanceSql} / 10.0) DESC`
      : Prisma.sql`${bayesian} DESC, t."ratingCount" DESC`,
    rating: Prisma.sql`${bayesian} DESC, t."ratingCount" DESC`,
    reviews: Prisma.sql`t."ratingCount" DESC, t."ratingAvg" DESC`,
    distance: geoPoint ? Prisma.sql`"distanceKm" ASC NULLS LAST` : Prisma.sql`${bayesian} DESC`,
    // Businesses without a listed rate go last either way.
    price_low: Prisma.sql`t."hourlyRatePence" ASC NULLS LAST`,
    price_high: Prisma.sql`t."hourlyRatePence" DESC NULLS LAST`,
    newest: Prisma.sql`t."createdAt" DESC`,
    name: Prisma.sql`lower(t."businessName") ASC`,
  };
  // Tie-break on id so paging never repeats or skips a business.
  const orderSql = Prisma.sql`${orders[query.sort]}, t."id" ASC`;

  const offset = (query.page - 1) * query.pageSize;

  const [items, count] = await Promise.all([
    db.$queryRaw<TraderCard[]>`
      SELECT t."id", t."slug", t."businessName", t."city", t."postcode", t."addressLine",
             t."logoUrl", t."coverImageUrl", t."hourlyRatePence", t."currency",
             t."ratingAvg"::float AS "ratingAvg", t."ratingCount",
             pc."name" AS "categoryName", pc."slug" AS "categorySlug", pc."icon" AS "categoryIcon",
             ${distanceSql} AS "distanceKm", (t."phone" <> '') AS "canCall"
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

const fold = (v: string) => v.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Typeahead: categories matched in the visitor's language (and English),
 * plus approved businesses in their country, trigram-ranked.
 */
export async function autocomplete(term: string, country: CountryCode, categoryLabel: (slug: string, fallback: string) => string) {
  const q = term.trim().slice(0, 40);
  if (q.length < 2) return [];
  const needle = fold(q);
  const categories = await cached("categories:active", 300, () =>
    db.category.findMany({ where: { isActive: true }, select: { slug: true, name: true }, orderBy: { sortOrder: "asc" } }),
  );
  const categoryHits = categories
    .filter((c) => fold(categoryLabel(c.slug, c.name)).includes(needle) || fold(c.name).includes(needle))
    .map((c) => ({ type: "category" as const, label: categoryLabel(c.slug, c.name), slug: c.slug }))
    .sort((a, b) => Number(fold(b.label).startsWith(needle)) - Number(fold(a.label).startsWith(needle)))
    .slice(0, 5);

  const like = `${escapeLike(q)}%`;
  const traders = await db.$queryRaw<{ type: "trader"; label: string; slug: string }[]>`
    SELECT 'trader' AS type, "businessName" AS label, "slug" FROM "TraderProfile"
    WHERE "status" = 'APPROVED' AND "country" = ${country}
      AND ("businessName" ILIKE ${like} OR similarity("businessName", ${q}) > 0.3)
    ORDER BY similarity("businessName", ${q}) DESC LIMIT 5`;
  return [...categoryHits, ...traders];
}
