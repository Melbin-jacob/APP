"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePrefs } from "@/components/providers/PreferencesProvider";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/format";

type Quote = {
  id: string; name: string; email: string | null; phone: string; addressLine: string; city: string; postcode: string;
  description: string; contactTimes: string[]; contactNote: string | null; status: "NEW" | "CONTACTED" | "CLOSED"; createdAt: string;
};

export function QuoteRequests() {
  const qc = useQueryClient();
  const { t, locale } = usePrefs();
  const q = useQuery({ queryKey: ["quotes"], queryFn: () => api<{ quotes: Quote[] }>("/api/trader/quotes").then((r) => r.quotes) });
  const set = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Quote["status"] }) => api(`/api/trader/quotes/${id}`, { method: "PATCH", json: { status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotes"] }),
  });
  const open = q.data?.filter((r) => r.status === "NEW").length ?? 0;

  return (
    <section className="card p-6" aria-labelledby="quotes-heading">
      <h2 id="quotes-heading" className="mb-1 font-semibold">
        {t("dashboard.quotes")} {open > 0 && <span className="ms-1 rounded-full bg-accent-500 px-2 py-0.5 text-xs text-white">{open}</span>}
      </h2>
      <p className="mb-4 text-sm text-ink-500">{t("dashboard.quotesHint")}</p>
      {q.data?.length === 0 && <p className="py-4 text-center text-sm text-ink-500">{t("dashboard.noQuotes")}</p>}
      <ul className="divide-y divide-ink-200">
        {q.data?.map((r) => (
          <li key={r.id} className={`py-4 text-sm ${r.status === "CLOSED" ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-medium">
                  {r.name} · <a href={`tel:${r.phone.replace(/[^+\d]/g, "")}`} className="text-brand-700" dir="ltr">{r.phone}</a>
                  {r.email && <> · <a href={`mailto:${r.email}`} className="text-brand-700">{r.email}</a></>}
                </p>
                <p className="text-ink-500">{r.addressLine}, {r.city}, {r.postcode}</p>
                <p className="text-ink-500">
                  {t("dashboard.quoteWhen")}: {r.contactTimes.map((c) => t.maybe(`quote.times.${c}`, c)).join(", ")}{r.contactNote && <> · {r.contactNote}</>}
                </p>
                <p className="whitespace-pre-line rounded bg-ink-100 p-2 text-ink-700">{r.description}</p>
                <p className="text-xs text-ink-500">{formatDate(r.createdAt, locale)} · {t(`dashboard.quoteStatus.${r.status}`)}</p>
              </div>
              <div className="flex flex-col gap-2">
                {r.status === "NEW" && (
                  <button className="btn-primary px-3 py-1 text-xs" disabled={set.isPending} onClick={() => set.mutate({ id: r.id, status: "CONTACTED" })}>
                    {t("dashboard.markContacted")}
                  </button>
                )}
                {r.status !== "CLOSED" ? (
                  <button className="btn-ghost px-3 py-1 text-xs" disabled={set.isPending} onClick={() => set.mutate({ id: r.id, status: "CLOSED" })}>{t("dashboard.closeQuote")}</button>
                ) : (
                  <button className="btn-ghost px-3 py-1 text-xs" disabled={set.isPending} onClick={() => set.mutate({ id: r.id, status: "NEW" })}>{t("dashboard.reopenQuote")}</button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
