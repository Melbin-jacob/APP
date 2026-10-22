import Link from "next/link";
import { SiteShell } from "@/components/layout/SiteShell";
import { SearchBar } from "@/components/search/SearchBar";
import { TraderCard } from "@/components/traders/TraderCard";
import { db } from "@/lib/db";
import { searchQuerySchema, searchTraders } from "@/server/services/search";

export const metadata = { title: "Find a local professional" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const raw = await searchParams;
  const parsed = searchQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : searchQuerySchema.parse({});
  const { items, total } = await searchTraders(query);
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
          {total} {total === 1 ? "professional" : "professionals"} found
          {query.location && <> near <strong>{query.location}</strong></>}
        </p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((t) => <TraderCard key={t.id} trader={t} />)}
        </div>
        {pages > 1 && (
          <nav aria-label="Pagination" className="mt-8 flex justify-center gap-2">
            {query.page > 1 && <Link className="btn-ghost" href={link(query.page - 1)}>Previous</Link>}
            <span className="px-3 py-2 text-sm text-ink-500">Page {query.page} of {pages}</span>
            {query.page < pages && <Link className="btn-ghost" href={link(query.page + 1)}>Next</Link>}
          </nav>
        )}
      </div>
    </SiteShell>
  );
}
