"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { usePrefs } from "@/components/providers/PreferencesProvider";
import type { MessageKey } from "@/i18n";
import type { SearchSort } from "@/server/services/search";

const LABEL_KEYS: Record<SearchSort, MessageKey> = {
  relevance: "search.sort.relevance",
  rating: "search.sort.rating",
  reviews: "search.sort.reviews",
  distance: "search.sort.distance",
  price_low: "search.sort.priceLow",
  price_high: "search.sort.priceHigh",
  newest: "search.sort.newest",
  name: "search.sort.name",
};

/** "Sort by" menu for search results. Changing it reloads page 1 in the new order. */
export function SortSelect({ value, hasLocation }: { value: SearchSort; hasLocation: boolean }) {
  const { t } = usePrefs();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  // "Nearest" only means something once a location has been entered.
  const options = (Object.keys(LABEL_KEYS) as SearchSort[]).filter((s) => s !== "distance" || hasLocation);

  return (
    <label className="flex items-center gap-2 text-sm text-ink-500">
      <span className="whitespace-nowrap">{t("search.sortBy")}</span>
      <select
        value={options.includes(value) ? value : "relevance"}
        onChange={(e) => {
          const next = new URLSearchParams(params);
          if (e.target.value === "relevance") next.delete("sort"); else next.set("sort", e.target.value);
          next.delete("page");
          router.push(`${pathname}?${next}`);
        }}
        className="input w-auto py-1.5 pe-8 text-sm text-ink-900"
      >
        {options.map((s) => <option key={s} value={s}>{t(LABEL_KEYS[s])}</option>)}
      </select>
    </label>
  );
}
