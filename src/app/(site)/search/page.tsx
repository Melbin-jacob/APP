import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/layout/SiteShell";
import { SearchBar } from "@/components/search/SearchBar";
import { TraderCard } from "@/components/traders/TraderCard";
import { db } from "@/lib/db";
import { getI18n } from "@/i18n/server";
import { searchQuerySchema, searchTraders } from "@/server/services/search";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t("search.title") };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const raw = await searchParams;
  const parsed = searchQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : searchQuerySchema.parse({});
  const { t, visitor } = await getI18n();
  const { items, total } = await searchTraders(query, visitor.country);
  if (query.q || query.location) {
    db.searchQuery.create({ data: { keyword: query.q, location: query.location, resultCount: total } }).catch(() => {});
  }
  const pages = Math.ceil(total / query.pageSize);
  const link = (page: number) => `/search?${new URLSearchParams({ ...raw, page: String(page) })}`;

  return (
    <SiteShell>
      <div className="py-8">
        <SearchBar initial={{ q: query.q, location: query.location }} />
        <p className="mt-6 text-sm text-ink-500" aria-live="polite">
          {t(total === 1 ? "search.resultsOne" : "search.resultsOther", { count: total })}
          {query.location && <> · {t("search.near", { place: query.location })}</>}
        </p>
        {total === 0 && <p className="mt-6 rounded-md bg-white p-6 text-center text-sm text-ink-500 shadow-card">{t("search.noResults")}</p>}
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((trader) => <TraderCard key={trader.id} trader={trader} />)}
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
