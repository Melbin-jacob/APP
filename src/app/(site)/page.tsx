import { CategoryGrid } from "@/components/home/CategoryGrid";
import { DirectoryGrid } from "@/components/home/DirectoryGrid";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { NewsletterBanner } from "@/components/home/NewsletterBanner";
import { SiteShell } from "@/components/layout/SiteShell";
import { getFeaturedTraders, getPopularCategories } from "@/server/services/catalog";
import { getVisitor } from "@/server/visitor";

export default async function HomePage() {
  // Everything on the page is scoped to the visitor's market.
  const { country } = await getVisitor();
  const [categories, featured] = await Promise.all([getPopularCategories(country, 16), getFeaturedTraders(country)]);
  const tabs = categories.filter((c) => c.traderCount > 0).slice(0, 6).map((c) => ({ slug: c.slug }));

  return (
    <SiteShell fullBleed={<Hero />}>
      <CategoryGrid categories={categories} />
      <DirectoryGrid tabs={tabs} initial={featured} />
      <NewsletterBanner />
      <HowItWorks />
    </SiteShell>
  );
}
