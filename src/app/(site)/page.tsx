import { CategoryGrid } from "@/components/home/CategoryGrid";
import { DirectoryGrid } from "@/components/home/DirectoryGrid";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { NewsletterBanner } from "@/components/home/NewsletterBanner";
import { SiteShell } from "@/components/layout/SiteShell";
import { getFeaturedTraders, getPopularCategories } from "@/server/services/catalog";

export default async function HomePage() {
  const [categories, featured] = await Promise.all([getPopularCategories(16), getFeaturedTraders()]);
  const tabs = categories.slice(0, 6).map((c) => ({ slug: c.slug, label: c.name }));

  return (
    <SiteShell fullBleed={<Hero />}>
      <CategoryGrid categories={categories} />
      <DirectoryGrid tabs={tabs} initial={featured} />
      <NewsletterBanner />
      <HowItWorks />
    </SiteShell>
  );
}
