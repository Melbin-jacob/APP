"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { usePrefs } from "@/components/providers/PreferencesProvider";
import { api, ClientApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/format";

type Job = {
  id: string; title: string; customerEmail: string; customerName: string | null; status: string; createdAt: string;
  reviewRequest: { status: string; sentAt: string | null; usedAt: string | null } | null;
};


export function TraderDashboard() {
  const qc = useQueryClient();
  const { t, locale } = usePrefs();
  // Business-rule messages (e.g. review cooldown) come from the server in English.
  const errText = (e: unknown) => (e instanceof ClientApiError && e.status < 500 ? e.message : e ? t("common.somethingWrong") : "");
  const jobs = useQuery({ queryKey: ["jobs"], queryFn: () => api<{ jobs: Job[] }>("/api/trader/jobs").then((r) => r.jobs) });

  const create = useMutation({
    mutationFn: (body: object) => api("/api/trader/jobs", { method: "POST", json: body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });
  const complete = useMutation({
    mutationFn: (id: string) => api(`/api/trader/jobs/${id}/complete`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });
  const ask = useMutation({ mutationFn: (body: object) => api("/api/trader/review-requests", { method: "POST", json: body }) });

  const [askEmail, setAskEmail] = useState("");
  const [askName, setAskName] = useState("");

  const onCreate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    create.mutate({ title: f.get("title"), customerEmail: f.get("customerEmail"), customerName: f.get("customerName") || undefined });
    e.currentTarget.reset();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="card p-6 lg:col-span-2">
        <h2 className="mb-4 font-semibold">{t("dashboard.jobs")}</h2>
        <form onSubmit={onCreate} className="mb-6 grid gap-2 sm:grid-cols-4">
          <input name="title" required placeholder={t("dashboard.jobPlaceholder")} className="input sm:col-span-2" />
          <input name="customerEmail" type="email" required placeholder={t("dashboard.customerEmail")} className="input" dir="ltr" />
          <button className="btn-primary" disabled={create.isPending}>{t("dashboard.addJob")}</button>
          <input name="customerName" placeholder={t("dashboard.customerName")} className="input sm:col-span-2" />
          {create.error && <p className="text-sm text-rose-600 sm:col-span-4">{errText(create.error)}</p>}
        </form>
        <table className="w-full text-start text-sm">
          <thead className="text-xs uppercase text-ink-500">
            <tr className="text-start"><th className="py-2 text-start">{t("dashboard.colJob")}</th><th className="text-start">{t("dashboard.colCustomer")}</th><th className="text-start">{t("dashboard.colAdded")}</th><th className="text-start">{t("dashboard.colReview")}</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-ink-200">
            {jobs.data?.map((j) => (
              <tr key={j.id}>
                <td className="py-2">{j.title}</td>
                <td>{j.customerName ?? j.customerEmail}</td>
                <td>{formatDate(j.createdAt, locale)}</td>
                <td>{j.reviewRequest ? (j.reviewRequest.usedAt ? t("dashboard.reviewed") : t.maybe(`dashboard.requestStatus.${j.reviewRequest.status}`, j.reviewRequest.status)) : "—"}</td>
                <td className="text-end">
                  {j.status === "OPEN" && (
                    <button className="btn-primary px-3 py-1 text-xs" disabled={complete.isPending} onClick={() => complete.mutate(j.id)}>
                      {t("dashboard.markCompleted")}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {complete.error && <p className="mt-2 text-sm text-rose-600">{errText(complete.error)}</p>}
        {jobs.data?.length === 0 && <p className="py-6 text-center text-sm text-ink-500">{t("dashboard.noJobs")}</p>}
      </section>

      <section className="card p-6">
        <h2 className="font-semibold">{t("dashboard.requestTitle")}</h2>
        <p className="mt-1 text-sm text-ink-500">{t("dashboard.requestBody")}</p>
        <form
          className="mt-4 space-y-2"
          onSubmit={(e) => { e.preventDefault(); ask.mutate({ customerEmail: askEmail, customerName: askName || undefined }); }}
        >
          <input type="email" required value={askEmail} onChange={(e) => setAskEmail(e.target.value)} placeholder="customer@example.com" className="input" dir="ltr" />
          <input value={askName} onChange={(e) => setAskName(e.target.value)} placeholder={t("dashboard.customerName")} className="input" />
          <button className="btn-primary w-full" disabled={ask.isPending}>{t("dashboard.send")}</button>
          {ask.isSuccess && <p role="status" className="text-sm text-brand-700">{t("dashboard.sent")}</p>}
          {ask.error && <p role="alert" className="text-sm text-rose-600">{errText(ask.error)}</p>}
        </form>
      </section>
    </div>
  );
}
