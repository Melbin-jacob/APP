import { FeedAd } from "@/components/ads/AdBanner";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { DirectoryGrid } from "@/components/home/DirectoryGrid";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { NewsletterBanner } from "@/components/home/NewsletterBanner";
import { SiteShell } from "@/components/layout/SiteShell";
import { getI18n } from "@/i18n/server";
import { absoluteUrl, jsonLd, siteUrl } from "@/lib/seo";
import { getBanners } from "@/server/services/banners";
import { getFeaturedTraders, getPopularCategories } from "@/server/services/catalog";
import { getVisitor } from "@/server/visitor";

export const metadata = { alternates: { canonical: "/" } };

// Who we are, plus the site search so Google can offer a search box for us.
const SITE_JSON_LD = () => [
  { "@context": "https://schema.org", "@type": "Organization", name: "GetTradePros", url: siteUrl(), logo: absoluteUrl("/brand/gettradepros-mark.svg") },
  {
    "@context": "https://schema.org", "@type": "WebSite", name: "GetTradePros", url: siteUrl(),
    potentialAction: { "@type": "SearchAction", target: `${siteUrl()}/search?q={search_term_string}`, "query-input": "required name=search_term_string" },
  },
];

export default async function HomePage() {
  // Everything on the page is scoped to the visitor's market.
  const { country } = await getVisitor();
  const [categories, featured, banners, { t }] = await Promise.all([
    getPopularCategories(country, 16), getFeaturedTraders(country), getBanners().catch(() => ({})), getI18n(),
  ]);
  const tabs = categories.filter((c) => c.traderCount > 0).slice(0, 6).map((c) => ({ slug: c.slug }));

  return (
    <SiteShell fullBleed={<Hero />}>
      {/* eslint-disable-next-line react/no-danger -- JSON-LD, with "<" escaped by jsonLd() */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(SITE_JSON_LD()) }} />
      <CategoryGrid categories={categories} />
      <DirectoryGrid tabs={tabs} initial={featured} ad={<FeedAd banners={banners} label={t("common.advertisement")} />} />
      <NewsletterBanner />
      <HowItWorks />
    </SiteShell>
  );
}
