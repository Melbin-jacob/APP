import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { cached } from "@/lib/redis";
import { absoluteUrl } from "@/lib/seo";

// Built on request (it needs the database) and cached for an hour.
export const dynamic = "force-dynamic";

const STATIC = [
  ["/", 1, "daily"], ["/categories", 0.8, "weekly"], ["/contact", 0.3, "yearly"],
  ["/terms", 0.2, "yearly"], ["/privacy", 0.2, "yearly"], ["/legal", 0.2, "yearly"], ["/legal/cookies", 0.1, "yearly"],
  ["/legal/disclaimer", 0.1, "yearly"], ["/legal/accessibility", 0.1, "yearly"], ["/legal/security", 0.1, "yearly"],
  ["/legal/copyright", 0.1, "yearly"], ["/legal/privacy-rights", 0.1, "yearly"], ["/legal/privacy-choices", 0.1, "yearly"],
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [traders, categories] = await cached("sitemap:data", 60 * 60, () =>
    Promise.all([
      db.traderProfile.findMany({ where: { status: "APPROVED" }, select: { slug: true, updatedAt: true }, orderBy: { slug: "asc" } }),
      // Only categories with at least one listed business: empty result pages aren't worth indexing.
      db.category.findMany({ where: { isActive: true, traders: { some: { trader: { status: "APPROVED" } } } }, select: { slug: true } }),
    ]),
  );
  return [
    ...STATIC.map(([path, priority, changeFrequency]) => ({ url: absoluteUrl(path), priority, changeFrequency })),
    ...categories.map((c) => ({ url: absoluteUrl(`/search?category=${c.slug}`), priority: 0.7, changeFrequency: "daily" as const })),
    ...traders.map((t) => ({ url: absoluteUrl(`/traders/${t.slug}`), lastModified: new Date(t.updatedAt), priority: 0.6, changeFrequency: "weekly" as const })),
  ];
}
