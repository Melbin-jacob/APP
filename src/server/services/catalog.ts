import { db } from "@/lib/db";
import { cached } from "@/lib/redis";
import { searchTraders } from "./search";

export type CategorySummary = { id: string; slug: string; name: string; icon: string; traderCount: number };

export function getPopularCategories(limit = 16): Promise<CategorySummary[]> {
  return cached(`categories:popular:${limit}`, 300, async () => {
    const rows = await db.$queryRaw<CategorySummary[]>`
      SELECT c."id", c."slug", c."name", c."icon", COUNT(t."id")::int AS "traderCount"
      FROM "Category" c
      LEFT JOIN "TraderCategory" tc ON tc."categoryId" = c."id"
      LEFT JOIN "TraderProfile" t ON t."id" = tc."traderId" AND t."status" = 'APPROVED'
      WHERE c."isActive"
      GROUP BY c."id"
      ORDER BY COUNT(t."id") DESC, c."sortOrder" ASC
      LIMIT ${limit}`;
    return rows;
  });
}

export function getFeaturedTraders(category?: string) {
  return cached(`traders:featured:${category ?? "all"}`, 120, async () =>
    (await searchTraders({ category, sort: "rating", page: 1, pageSize: 8, radiusKm: 25 })).items,
  );
}

/** Public profile view model. Never includes the raw phone number or credential documents. */
export function getPublicTrader(slug: string) {
  return cached(`trader:${slug}`, 120, async () => {
    const t = await db.traderProfile.findFirst({
      where: { slug, status: "APPROVED" },
      select: {
        id: true, slug: true, businessName: true, bio: true, hourlyRatePence: true, currency: true,
        logoUrl: true, coverImageUrl: true, addressLine: true, city: true, postcode: true,
        serviceRadiusKm: true, operatingHours: true, verifiedAt: true, ratingAvg: true, ratingCount: true,
        createdAt: true,
        categories: { select: { isPrimary: true, category: { select: { name: true, slug: true, icon: true } } } },
        services: { select: { id: true, title: true, description: true, priceFromPence: true, priceUnit: true } },
        serviceAreas: { select: { postcode: true } },
        gallery: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true, caption: true } },
        credentials: {
          where: { status: "VERIFIED" },
          select: { id: true, type: true, name: true, issuer: true, expiresAt: true },
        },
        reviews: {
          where: { status: "PUBLISHED" },
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { id: true, authorName: true, rating: true, comment: true, isVerified: true, createdAt: true },
        },
      },
    });
    return t ? { ...t, ratingAvg: Number(t.ratingAvg) } : null;
  });
}
