import type { Metadata } from "next";
import Link from "next/link";
import { FeedAd } from "@/components/ads/AdBanner";
import { withFeedAd } from "@/components/ads/withFeedAd";
import { SiteShell } from "@/components/layout/SiteShell";
import { SearchBar } from "@/components/search/SearchBar";
import { SortSelect } from "@/components/search/SortSelect";
import { TraderCard } from "@/components/traders/TraderCard";
import { db } from "@/lib/db";
import { getI18n } from "@/i18n/server";
import { getBanners } from "@/server/services/banners";
import { searchQuerySchema, searchTraders } from "@/server/services/search";

// A category's result page is worth indexing (e.g. "Plumbing"); keyword,
// location, sorted and later pages are endless variations of it, so they're
// kept out of search engines while their links are still followed.
export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string>> }): Promise<Metadata> {
  const raw = await searchParams;
  const { t } = await getI18n();
  const category = /^[a-z0-9-]{1,60}$/.test(raw.category ?? "") ? raw.category : undefined;
  const categoryOnly = !!category && Object.keys(raw).every((k) => k === "category");
  if (!categoryOnly) return { title: t("search.title"), robots: { index: false, follow: true } };
  const name = t.maybe(`categories.names.${category}`, category!.replace(/-/g, " "));
  return {
    title: `${name} near you`,
    description: `Find local ${name.toLowerCase()} businesses. Compare rates, read reviews and request free quotes on GetTradePros.`,
    alternates: { canonical: `/search?category=${category}` },
  };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const raw = await searchParams;
  const parsed = searchQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : searchQuerySchema.parse({});
  const { t, visitor } = await getI18n();
  const [{ items, total }, banners] = await Promise.all([searchTraders(query, visitor.country), getBanners().catch(() => ({}))]);
  if (query.q || query.location) {
    db.searchQuery.create({ data: { keyword: query.q, location: query.location, resultCount: total } }).catch(() => {});
  }
  const pages = Math.ceil(total / query.pageSize);
  const link = (page: number) => `/search?${new URLSearchParams({ ...raw, page: String(page) })}`;

  return (
    <SiteShell>
      <div className="py-8">
        <SearchBar initial={{ q: query.q, location: query.location }} />
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-500" aria-live="polite">
            {t(total === 1 ? "search.resultsOne" : "search.resultsOther", { count: total })}
            {query.location && <> · {t("search.near", { place: query.location })}</>}
          </p>
          {total > 1 && <SortSelect value={query.sort} hasLocation={!!query.location || query.lat != null} />}
        </div>
        {total === 0 && <p className="mt-6 rounded-md bg-white p-6 text-center text-sm text-ink-500 shadow-card">{t("search.noResults")}</p>}
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {withFeedAd(items.map((trader) => <TraderCard key={trader.id} trader={trader} />), <FeedAd banners={banners} label={t("common.advertisement")} />)}
        </div>
        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-8 flex justify-center gap-2">
            {query.page > 1 && <Link className="btn-ghost" href={link(query.page - 1)}>{t("search.previous")}</Link>}
            <span className="px-3 py-2 text-sm text-ink-500">{t("search.page", { page: query.page, pages })}</span>
            {query.page < pages && <Link className="btn-ghost" href={link(query.page + 1)}>{t("search.next")}</Link>}
          </nav>
        )}
      </div>
    </SiteShell>
  );
}
