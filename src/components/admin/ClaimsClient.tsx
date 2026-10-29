"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { api, ClientApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { Badge, PageTitle, statusTone } from "./ui";

type ClaimDocument = { id: string; kind: "REGISTRATION" | "ID_PROOF"; fileName: string; contentType: string; size: number };
type Claim = {
  id: string; status: string; contactName: string; jobTitle: string; phone: string; message: string | null; createdAt: string;
  documents: ClaimDocument[]; documentsChecked: string | null; documentsDeletedAt: string | null;
  trader: { businessName: string; slug: string; city: string; phone: string; website: string | null; userId: string | null };
  user: { email: string; name: string | null; createdAt: string };
};

const DOC_LABELS = { REGISTRATION: "Company registration", ID_PROOF: "Photo ID" } as const;
const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** The proof documents, or what was checked once they've been deleted. */
function Documents({ claim }: { claim: Claim }) {
  if (claim.documents.length > 0) {
    return (
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-xs font-medium text-ink-700">Proof of ownership:</span>
        {claim.documents.map((d) => (
          <a key={d.id} href={`/api/admin/claims/${claim.id}/documents/${d.id}`} target="_blank" rel="noopener noreferrer"
            className="rounded-md border border-ink-200 px-2 py-1 text-xs hover:border-brand-500 hover:text-brand-700">
            {d.contentType === "application/pdf" ? "📄" : "🖼"} {DOC_LABELS[d.kind]} <span className="text-ink-500">({d.contentType === "application/pdf" ? "PDF" : "image"}, {kb(d.size)})</span>
          </a>
        ))}
      </div>
    );
  }
  if (claim.documentsDeletedAt) {
    const kinds = (claim.documentsChecked ?? "").split(",").filter(Boolean).map((k) => DOC_LABELS[k as keyof typeof DOC_LABELS] ?? k);
    return <p className="text-xs text-ink-500">🔒 {kinds.length ? `${kinds.join(" and ")} checked;` : "No documents were on file;"} deleted {formatDate(claim.documentsDeletedAt, "en")}</p>;
  }
  return <p className="text-xs text-amber-700">No documents uploaded with this claim, so it can only be rejected.</p>;
}

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
          Verify before approving: open both documents and check that the registration is for this business and the photo ID
          matches the claimant&apos;s name. Then call the number on the listing (not the one the claimant gave) and ask for them by name.
          Approving gives them full control of the listing. The documents are deleted automatically as soon as you approve or reject.
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
                <Documents claim={c} />
              </div>
              {c.status === "PENDING" && (
                <div className="flex gap-2">
                  <button className="btn-primary px-3 py-1 text-xs" disabled={decide.isPending || !!c.trader.userId || c.documents.length < 2}
                    onClick={() => window.confirm(`Give ${c.user.email} control of ${c.trader.businessName}? The uploaded documents will be deleted.`) && decide.mutate({ id: c.id, decision: "APPROVE" })}>
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
