import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BusinessProfileEditor, type EditorData } from "@/components/business/BusinessProfileEditor";
import { SiteShell } from "@/components/layout/SiteShell";
import { db } from "@/lib/db";
import { COUNTRIES, isSupportedCountry } from "@/lib/postcode";
import { getI18n } from "@/i18n/server";
import { getPrincipal, requireCurrentTerms } from "@/server/auth";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t("business.title") };
}

export default async function BusinessProfilePage() {
  const [user, { t }] = await Promise.all([getPrincipal(), getI18n()]);
  if (!user || user.role !== "TRADER") redirect("/login?callbackUrl=/dashboard/profile");
  requireCurrentTerms(user, "/dashboard/profile");

  const [trader, categories] = await Promise.all([
    db.traderProfile.findUnique({
      where: { userId: user.id },
      include: {
        categories: { select: { categoryId: true, isPrimary: true } },
        services: { orderBy: { createdAt: "asc" } },
        serviceAreas: { orderBy: { postcode: "asc" } },
        gallery: { orderBy: { sortOrder: "asc" } },
      },
    }),
    db.category.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, slug: true, name: true } }),
  ]);
  if (!trader) redirect("/register?type=trader");

  const data: EditorData = {
    slug: trader.slug,
    status: trader.status,
    currency: trader.currency,
    country: trader.country,
    areaExample: isSupportedCountry(trader.country) ? COUNTRIES[trader.country].areaExample : "",
    details: {
      businessName: trader.businessName,
      phone: trader.phone,
      bio: trader.bio ?? "",
      hourlyRatePence: trader.hourlyRatePence,
      serviceRadiusKm: trader.serviceRadiusKm,
      logoUrl: trader.logoUrl ?? "",
      coverImageUrl: trader.coverImageUrl ?? "",
    },
    location: { city: trader.city, postcode: trader.postcode },
    hours: (trader.operatingHours ?? {}) as EditorData["hours"],
    categories,
    trades: trader.categories,
    services: trader.services.map((s) => ({
      id: s.id, title: s.title, categoryId: s.categoryId, description: s.description ?? "", priceFromPence: s.priceFromPence, priceUnit: s.priceUnit,
    })),
    areas: trader.serviceAreas.map((a) => a.postcode),
    gallery: trader.gallery.map((g) => ({ url: g.url, caption: g.caption ?? "" })),
  };

  return (
    <SiteShell>
      <div className="space-y-6 py-10">
        <header className="card flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <Link href="/dashboard" className="text-sm text-brand-700 hover:underline">← {t("business.back")}</Link>
            <h1 className="mt-1 text-xl font-bold">{t("business.title")}</h1>
            <p className="text-sm text-ink-500">{t("business.intro")}</p>
          </div>
          {trader.status === "APPROVED" && <Link href={`/traders/${trader.slug}`} className="btn-ghost">{t("business.viewPublic")}</Link>}
        </header>
        <BusinessProfileEditor data={data} />
      </div>
    </SiteShell>
  );
}
