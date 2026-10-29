"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api, ClientApiError } from "@/lib/api-client";

const errorText = (e: unknown) => (e instanceof ClientApiError ? e.message : e ? "Something went wrong" : "");

/** Approve / reject / suspend / reinstate a business from its details page. */
export function TraderStatusActions({ id, status, name }: { id: string; status: string; name: string }) {
  const router = useRouter();
  const m = useMutation({
    mutationFn: (body: { status: string; reason?: string }) => api(`/api/admin/traders/${id}`, { method: "PATCH", json: body }),
    onSuccess: () => router.refresh(),
  });
  const ask = (next: string, question: string, required: boolean) => {
    const reason = window.prompt(question);
    if (reason === null || (required && !reason.trim())) return;
    m.mutate({ status: next, reason: reason.trim() || undefined });
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== "APPROVED" && (
        <button className="btn-primary px-4 py-2 text-sm" disabled={m.isPending}
          onClick={() => window.confirm(`Approve ${name}? It will be listed publicly straight away.`) && m.mutate({ status: "APPROVED" })}>
          {status === "PENDING" ? "Approve" : "Reinstate"}
        </button>
      )}
      {status === "PENDING" && (
        <button className="btn-ghost px-4 py-2 text-sm" disabled={m.isPending} onClick={() => ask("REJECTED", "Reason for rejecting (kept in the audit log):", false)}>Reject</button>
      )}
      {status === "APPROVED" && (
        <button className="btn-ghost px-4 py-2 text-sm text-rose-700" disabled={m.isPending} onClick={() => ask("SUSPENDED", "Reason for suspension (required):", true)}>Suspend</button>
      )}
      {m.error && <span role="alert" className="text-sm text-rose-600">{errorText(m.error)}</span>}
    </div>
  );
}

export function CredentialActions({ id }: { id: string }) {
  const router = useRouter();
  const m = useMutation({
    mutationFn: (status: "VERIFIED" | "REJECTED") => api(`/api/admin/credentials/${id}`, { method: "PATCH", json: { status } }),
    onSuccess: () => router.refresh(),
  });
  return (
    <span className="flex gap-3 text-xs">
      <button className="text-brand-700 underline" disabled={m.isPending} onClick={() => m.mutate("VERIFIED")}>Verify</button>
      <button className="text-rose-700 underline" disabled={m.isPending} onClick={() => m.mutate("REJECTED")}>Reject</button>
      {m.error && <span role="alert" className="text-rose-600">{errorText(m.error)}</span>}
    </span>
  );
}

/** Takes a business's logo down (copyright notice, offensive image…). Reason goes to the audit log. */
export function RemoveLogoButton({ id }: { id: string }) {
  const router = useRouter();
  const m = useMutation({
    mutationFn: (reason: string) => api(`/api/admin/traders/${id}/logo`, { method: "DELETE", json: { reason } }),
    onSuccess: () => router.refresh(),
  });
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" className="text-xs text-rose-700 underline" disabled={m.isPending}
        onClick={() => {
          const reason = window.prompt("Why is the logo being removed? (e.g. DMCA notice received 2026-10-29; kept in the audit log)");
          if (reason?.trim()) m.mutate(reason.trim());
        }}>
        Remove logo
      </button>
      {m.error && <span role="alert" className="text-xs text-rose-600">{errorText(m.error)}</span>}
    </span>
  );
}
