"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { api, ClientApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { Badge, PageTitle, statusTone } from "./ui";

type Claim = {
  id: string; status: string; contactName: string; jobTitle: string; phone: string; message: string | null; createdAt: string;
  trader: { businessName: string; slug: string; city: string; phone: string; website: string | null; userId: string | null };
  user: { email: string; name: string | null; createdAt: string };
};

const VIEWS = { PENDING: "To verify", APPROVED: "Approved", REJECTED: "Rejected" } as const;
type View = keyof typeof VIEWS;

export function AdminClaimsClient() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<View>("PENDING");
  const q = useQuery({ queryKey: ["admin-claims", status], queryFn: () => api<{ claims: Claim[] }>(`/api/admin/claims?status=${status}`) });
  const decide = useMutation({
    mutationFn: ({ id, decision, note }: { id: string; decision: "APPROVE" | "REJECT"; note?: string }) =>
      api(`/api/admin/claims/${id}`, { method: "PATCH", json: { decision, note } }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["admin-claims"] }),
  });

  return (
    <>
      <PageTitle actions={
        <select value={status} onChange={(e) => setStatus(e.target.value as View)} className="input w-44" aria-label="Show claims">
          {(Object.keys(VIEWS) as View[]).map((v) => <option key={v} value={v}>{VIEWS[v]}</option>)}
        </select>
      }>Listing claims</PageTitle>
      {status === "PENDING" && (
        <p className="mb-4 rounded-md bg-sky-50 p-3 text-sm text-sky-900">
          Verify before approving: call the number on the listing (not the one the claimant gave) and ask for them by name,
          or check that their email domain matches the business website. Approving gives them full control of the listing.
        </p>
      )}
      {decide.error && <p role="alert" className="mb-3 text-sm text-rose-600">{decide.error instanceof ClientApiError ? decide.error.message : "Something went wrong"}</p>}
      <div className="space-y-3">
        {q.data?.claims.map((c) => (
          <article key={c.id} className="card p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <h2 className="font-semibold">
                  <Link href={`/traders/${c.trader.slug}`} target="_blank" className="hover:underline">{c.trader.businessName}</Link>{" "}
                  <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                </h2>
                <p className="text-ink-500">{c.trader.city} · listing phone {c.trader.phone || "none"}{c.trader.website && <> · <a href={c.trader.website} target="_blank" rel="noopener noreferrer" className="underline">website</a></>}</p>
                <p><strong>{c.contactName}</strong> ({c.jobTitle}) · {c.user.email} · {c.phone}</p>
                {c.message && <p className="whitespace-pre-line text-ink-700">“{c.message}”</p>}
                <p className="text-xs text-ink-500">Claimed {formatDate(c.createdAt, "en")} · account created {formatDate(c.user.createdAt, "en")}</p>
              </div>
              {c.status === "PENDING" && (
                <div className="flex gap-2">
                  <button className="btn-primary px-3 py-1 text-xs" disabled={decide.isPending || !!c.trader.userId}
                    onClick={() => window.confirm(`Give ${c.user.email} control of ${c.trader.businessName}?`) && decide.mutate({ id: c.id, decision: "APPROVE" })}>
                    Approve
                  </button>
                  <button className="btn-ghost px-3 py-1 text-xs" disabled={decide.isPending}
                    onClick={() => {
                      const note = window.prompt("Reason (emailed to the claimant, optional):");
                      if (note !== null) decide.mutate({ id: c.id, decision: "REJECT", note });
                    }}>
                    Reject
                  </button>
                </div>
              )}
            </div>
          </article>
        ))}
        {q.data?.claims.length === 0 && <p className="py-8 text-center text-sm text-ink-500">Nothing here.</p>}
      </div>
    </>
  );
}
