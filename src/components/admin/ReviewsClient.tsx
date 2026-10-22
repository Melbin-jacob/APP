"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { StarRating } from "@/components/ui/StarRating";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { Badge, PageTitle, statusTone } from "./ui";

type Review = {
  id: string; authorName: string; rating: number; comment: string | null; status: string; isVerified: boolean;
  reportCount: number; createdAt: string; trader: { businessName: string; slug: string };
  reports: { id: string; reason: string; details: string | null }[];
};

const FILTERS = { "Needs moderation": "status=PENDING_MODERATION", Reported: "reported=1", Published: "status=PUBLISHED", Removed: "status=REMOVED" } as const;
type Filter = keyof typeof FILTERS;
// URL slug ↔ tab, so dashboard tiles can deep-link (/admin/reviews?filter=published).
const SLUGS: Record<string, Filter> = { moderation: "Needs moderation", reported: "Reported", published: "Published", removed: "Removed" };
const slugOf = (f: Filter) => Object.keys(SLUGS).find((k) => SLUGS[k] === f)!;

export function AdminReviewsClient({ initialFilter }: { initialFilter?: string }) {
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const [filter, setFilterState] = useState<Filter>((initialFilter && SLUGS[initialFilter]) || "Needs moderation");
  const setFilter = (f: Filter) => {
    setFilterState(f);
    router.replace(`${pathname}?filter=${slugOf(f)}`, { scroll: false });
  };
  const q = useQuery({ queryKey: ["admin-reviews", filter], queryFn: () => api<{ reviews: Review[] }>(`/api/admin/reviews?${FILTERS[filter]}`) });
  const act = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: string; reason?: string }) =>
      api(`/api/admin/reviews/${id}`, { method: "PATCH", json: { action, reason } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reviews"] }),
  });

  return (
    <>
      <PageTitle actions={
        <div className="flex gap-1">
          {(Object.keys(FILTERS) as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 text-xs ${filter === f ? "bg-brand-500 text-white" : "bg-white"}`}>{f}</button>
          ))}
        </div>
      }>Review moderation</PageTitle>
      <div className="space-y-3">
        {q.data?.reviews.map((r) => (
          <article key={r.id} className="card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                <StarRating value={r.rating} />
                <strong>{r.trader.businessName}</strong>
                <span className="text-ink-500">by {r.authorName} · {formatDate(r.createdAt)}</span>
                <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                {r.isVerified && <Badge tone="good">Verified</Badge>}
                {r.reportCount > 0 && <Badge tone="bad">{r.reportCount} reports</Badge>}
              </div>
              <div className="flex gap-2">
                {r.status !== "PUBLISHED" && <button className="btn-primary px-3 py-1 text-xs" onClick={() => act.mutate({ id: r.id, action: "publish" })}>Publish</button>}
                {r.status !== "REMOVED" && (
                  <button className="btn-ghost px-3 py-1 text-xs" onClick={() => {
                    const reason = prompt("Removal reason (shown in audit log)") ?? undefined;
                    act.mutate({ id: r.id, action: "remove", reason });
                  }}>Remove</button>
                )}
                {r.reports.length > 0 && <button className="btn-ghost px-3 py-1 text-xs" onClick={() => act.mutate({ id: r.id, action: "dismiss_reports" })}>Dismiss reports</button>}
              </div>
            </div>
            {r.comment && <p className="mt-2 text-sm text-ink-700">{r.comment}</p>}
            {r.reports.length > 0 && (
              <ul className="mt-2 space-y-0.5 border-t border-ink-200 pt-2 text-xs text-ink-500">
                {r.reports.map((rep) => <li key={rep.id}>⚑ {rep.reason}{rep.details && ` — ${rep.details}`}</li>)}
              </ul>
            )}
          </article>
        ))}
        {q.data?.reviews.length === 0 && <p className="text-sm text-ink-500">Queue is empty.</p>}
      </div>
    </>
  );
}
