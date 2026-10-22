import type { Metadata } from "next";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { SiteShell } from "@/components/layout/SiteShell";
import { getI18n } from "@/i18n/server";
import { getPopularCategories } from "@/server/services/catalog";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t("categories.all") };
}

export default async function CategoriesPage() {
  const { t, visitor } = await getI18n();
  return (
    <SiteShell>
      <CategoryGrid categories={await getPopularCategories(visitor.country, 100)} title={t("categories.all")} />
    </SiteShell>
  );
}
