"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { TraderCard } from "@/components/traders/TraderCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/format";
import type { TraderCard as TraderCardData } from "@/server/services/search";

type Tab = { slug: string; label: string };

/** "Explore Directory Category": pill filter tabs over a 4-up card grid. */
export function DirectoryGrid({ tabs, initial }: { tabs: Tab[]; initial: TraderCardData[] }) {
  const [active, setActive] = useState("");
  const { data, isFetching } = useQuery({
    queryKey: ["directory", active],
    queryFn: () =>
      api<{ items: TraderCardData[] }>(`/api/search?sort=rating&pageSize=8${active ? `&category=${active}` : ""}`).then((r) => r.items),
    initialData: active === "" ? initial : undefined,
  });

  return (
    <section aria-labelledby="explore-heading" className="py-14">
      <div id="explore-heading">
        <SectionHeading
          title="Explore Directory Category"
          subtitle="Top-rated, verified local professionals. Filter by trade to find the right person for the job."
        />
      </div>
      <div role="tablist" aria-label="Filter by category" className="mb-8 flex flex-wrap justify-center gap-2">
        {[{ slug: "", label: "All" }, ...tabs].map((t) => (
          <button
            key={t.slug || "all"}
            role="tab"
            aria-selected={active === t.slug}
            onClick={() => setActive(t.slug)}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition",
              active === t.slug ? "bg-brand-500 text-white" : "bg-accent-500 text-white hover:bg-accent-600",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-busy={isFetching} className={cn("grid gap-5 sm:grid-cols-2 lg:grid-cols-4", isFetching && "opacity-60")}>
        {(data ?? []).map((t) => <TraderCard key={t.id} trader={t} />)}
        {data && data.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-ink-500">No listings in this category yet.</p>
        )}
      </div>
    </section>
  );
}
