"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { api, ClientApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/format";

type Job = {
  id: string; title: string; customerEmail: string; customerName: string | null; status: string; createdAt: string;
  reviewRequest: { status: string; sentAt: string | null; usedAt: string | null } | null;
};

const errText = (e: unknown) => (e instanceof ClientApiError ? e.message : e ? "Something went wrong" : "");

export function TraderDashboard() {
  const qc = useQueryClient();
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
        <h2 className="mb-4 font-semibold">Jobs</h2>
        <form onSubmit={onCreate} className="mb-6 grid gap-2 sm:grid-cols-4">
          <input name="title" required placeholder="Job (e.g. Boiler service)" className="input sm:col-span-2" />
          <input name="customerEmail" type="email" required placeholder="Customer email" className="input" />
          <button className="btn-primary" disabled={create.isPending}>Add job</button>
          <input name="customerName" placeholder="Customer name (optional)" className="input sm:col-span-2" />
          {create.error && <p className="text-sm text-rose-600 sm:col-span-4">{errText(create.error)}</p>}
        </form>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-ink-500">
            <tr><th className="py-2">Job</th><th>Customer</th><th>Added</th><th>Review</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-ink-200">
            {jobs.data?.map((j) => (
              <tr key={j.id}>
                <td className="py-2">{j.title}</td>
                <td>{j.customerName ?? j.customerEmail}</td>
                <td>{formatDate(j.createdAt)}</td>
                <td>{j.reviewRequest ? (j.reviewRequest.usedAt ? "Reviewed ✓" : `Email ${j.reviewRequest.status.toLowerCase()}`) : "—"}</td>
                <td className="text-right">
                  {j.status === "OPEN" && (
                    <button className="btn-primary px-3 py-1 text-xs" disabled={complete.isPending} onClick={() => complete.mutate(j.id)}>
                      Mark completed
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {complete.error && <p className="mt-2 text-sm text-rose-600">{errText(complete.error)}</p>}
        {jobs.data?.length === 0 && <p className="py-6 text-center text-sm text-ink-500">No jobs yet.</p>}
      </section>

      <section className="card p-6">
        <h2 className="font-semibold">Request a review</h2>
        <p className="mt-1 text-sm text-ink-500">We&apos;ll email your customer a secure, single-use link to rate your work.</p>
        <form
          className="mt-4 space-y-2"
          onSubmit={(e) => { e.preventDefault(); ask.mutate({ customerEmail: askEmail, customerName: askName || undefined }); }}
        >
          <input type="email" required value={askEmail} onChange={(e) => setAskEmail(e.target.value)} placeholder="customer@example.com" className="input" />
          <input value={askName} onChange={(e) => setAskName(e.target.value)} placeholder="Customer name (optional)" className="input" />
          <button className="btn-primary w-full" disabled={ask.isPending}>Send request</button>
          {ask.isSuccess && <p role="status" className="text-sm text-brand-700">Sent! The link expires in 14 days.</p>}
          {ask.error && <p role="alert" className="text-sm text-rose-600">{errText(ask.error)}</p>}
        </form>
      </section>
    </div>
  );
}
