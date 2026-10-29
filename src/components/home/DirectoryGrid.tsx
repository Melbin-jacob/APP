"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { withFeedAd } from "@/components/ads/withFeedAd";
import { usePrefs } from "@/components/providers/PreferencesProvider";
import { TraderCard } from "@/components/traders/TraderCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/format";
import type { TraderCard as TraderCardData } from "@/server/services/search";

type Tab = { slug: string };

/** "Explore Directory Category": pill filter tabs over a 4-up card grid. */
/** `ad`: the in-listing banner, rendered on the server and slotted between cards. */
export function DirectoryGrid({ tabs, initial, ad }: { tabs: Tab[]; initial: TraderCardData[]; ad?: ReactNode }) {
  const { t, country } = usePrefs();
  const [active, setActive] = useState("");
  const { data, isFetching } = useQuery({
    // Keyed by market so switching country never shows stale listings.
    queryKey: ["directory", country, active],
    queryFn: () =>
      api<{ items: TraderCardData[] }>(`/api/search?sort=rating&pageSize=8${active ? `&category=${active}` : ""}`).then((r) => r.items),
    initialData: active === "" ? initial : undefined,
  });

  return (
    <section aria-labelledby="explore-heading" className="py-14">
      <div id="explore-heading">
        <SectionHeading title={t("directory.title")} subtitle={t("directory.subtitle")} />
      </div>
      <div role="tablist" aria-label={t("directory.filter")} className="mb-8 flex flex-wrap justify-center gap-2">
        {[{ slug: "" }, ...tabs].map((tab) => (
          <button
            key={tab.slug || "all"}
            role="tab"
            aria-selected={active === tab.slug}
            onClick={() => setActive(tab.slug)}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition",
              active === tab.slug ? "bg-ink-900 text-white" : "bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-ink-100",
            )}
          >
            {tab.slug ? t.maybe(`categories.names.${tab.slug}`, tab.slug) : t("directory.all")}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-busy={isFetching} className={cn("grid gap-5 sm:grid-cols-2 lg:grid-cols-4", isFetching && "opacity-60")}>
        {withFeedAd((data ?? []).map((trader) => <TraderCard key={trader.id} trader={trader} />), ad)}
        {data && data.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-ink-500">{t("directory.empty")}</p>
        )}
      </div>
    </section>
  );
}
