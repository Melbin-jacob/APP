import { CategoryGrid } from "@/components/home/CategoryGrid";
import { SiteShell } from "@/components/layout/SiteShell";
import { getPopularCategories } from "@/server/services/catalog";

export const metadata = { title: "All categories" };

export default async function CategoriesPage() {
  return (
    <SiteShell>
      <CategoryGrid categories={await getPopularCategories(100)} />
    </SiteShell>
  );
}
