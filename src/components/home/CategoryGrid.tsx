import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getI18n } from "@/i18n/server";
import type { CategorySummary } from "@/server/services/catalog";

// Rotating icon tints, as in the reference grid.
const TINTS = ["bg-brand-500", "bg-accent-500", "bg-sky-500", "bg-rose-500", "bg-violet-500", "bg-teal-500"];

export async function CategoryGrid({ categories, title }: { categories: CategorySummary[]; title?: string }) {
  const { t } = await getI18n();
  return (
    <section aria-labelledby="popular-heading" className="py-14">
      <div id="popular-heading">
        <SectionHeading title={title ?? t("categories.popular")} />
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((c, i) => (
          <li key={c.id}>
            <Link
              href={`/search?category=${c.slug}`}
              className="card flex items-center gap-3 px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-white ${TINTS[i % TINTS.length]}`}>
                <Icon name={c.icon} className="h-4 w-4" />
              </span>
              <span className="flex-1 truncate text-sm text-ink-700">{t.maybe(`categories.names.${c.slug}`, c.name)}</span>
              <span className="text-xs text-ink-500">({c.traderCount})</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-8 text-center">
        <Link href="/categories" className="btn-primary">{t("categories.browseAll")}</Link>
      </div>
    </section>
  );
}
