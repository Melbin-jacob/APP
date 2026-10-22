"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { Badge, PageTitle } from "./ui";

type Quote = {
  id: string; name: string; email: string | null; phone: string; addressLine: string; city: string; postcode: string;
  description: string; contactTimes: string[]; contactNote: string | null; status: string; createdAt: string;
  trader: { businessName: string; slug: string; phone: string; userId: string | null };
};

const TIMES: Record<string, string> = {
  WEEKDAY_MORNING: "Weekday mornings", WEEKDAY_AFTERNOON: "Weekday afternoons", WEEKDAY_EVENING: "Weekday evenings", WEEKEND: "Weekends", ANYTIME: "Any time",
};
const VIEWS = { forward: "To pass on (unclaimed listings)", all: "All quote requests" } as const;
type View = keyof typeof VIEWS;

export function AdminQuotesClient() {
  const qc = useQueryClient();
  const [view, setView] = useState<View>("forward");
  const q = useQuery({ queryKey: ["admin-quotes", view], queryFn: () => api<{ quotes: Quote[] }>(`/api/admin/quotes?view=${view}`) });
  const set = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api(`/api/admin/quotes/${id}`, { method: "PATCH", json: { status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-quotes"] }),
  });

  return (
    <>
      <PageTitle actions={
        <select value={view} onChange={(e) => setView(e.target.value as View)} className="input w-64" aria-label="Show quote requests">
          {(Object.keys(VIEWS) as View[]).map((v) => <option key={v} value={v}>{VIEWS[v]}</option>)}
        </select>
      }>Quote requests</PageTitle>
      {view === "forward" && (
        <p className="mb-4 rounded-md bg-sky-50 p-3 text-sm text-sky-900">
          These businesses haven&apos;t claimed their listing, so nobody else has seen these requests. Call the business, pass the
          request on, invite them to claim their listing, then mark it passed on.
        </p>
      )}
      <div className="space-y-3">
        {q.data?.quotes.map((r) => (
          <article key={r.id} className="card p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <h2 className="font-semibold">
                  For <Link href={`/traders/${r.trader.slug}`} target="_blank" className="hover:underline">{r.trader.businessName}</Link>
                  {r.trader.phone && <> · <a href={`tel:${r.trader.phone.replace(/[^+\d]/g, "")}`} className="font-normal text-brand-700">{r.trader.phone}</a></>}{" "}
                  <Badge tone={r.status === "NEW" ? "warn" : r.status === "CONTACTED" ? "good" : "neutral"}>{r.status}</Badge>
                  {!r.trader.userId && <> <Badge>unclaimed</Badge></>}
                </h2>
                <p><strong>{r.name}</strong> · {r.phone}{r.email && <> · {r.email}</>}</p>
                <p className="text-ink-500">{r.addressLine}, {r.city}, {r.postcode}</p>
                <p className="text-ink-500">Best time: {r.contactTimes.map((c) => TIMES[c] ?? c).join(", ")}{r.contactNote && <> · {r.contactNote}</>}</p>
                <p className="whitespace-pre-line rounded bg-ink-100 p-2 text-ink-700">{r.description}</p>
                <p className="text-xs text-ink-500">{formatDate(r.createdAt, "en")}</p>
              </div>
              <div className="flex flex-col gap-2">
                {r.status === "NEW" && <button className="btn-primary px-3 py-1 text-xs" disabled={set.isPending} onClick={() => set.mutate({ id: r.id, status: "CONTACTED" })}>Mark passed on</button>}
                {r.status !== "CLOSED" && <button className="btn-ghost px-3 py-1 text-xs" disabled={set.isPending} onClick={() => set.mutate({ id: r.id, status: "CLOSED" })}>Close</button>}
              </div>
            </div>
          </article>
        ))}
        {q.data?.quotes.length === 0 && <p className="py-8 text-center text-sm text-ink-500">Nothing to pass on.</p>}
      </div>
    </>
  );
}
