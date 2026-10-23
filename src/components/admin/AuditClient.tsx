"use client";

import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { PageTitle } from "./ui";

type Log = { id: string; action: string; entityType: string; entityId: string | null; metadata: unknown; createdAt: string; actor: { email: string } | null };

export function AdminAuditClient() {
  const [action, setAction] = useState("");
  const q = useInfiniteQuery({
    queryKey: ["audit", action],
    initialPageParam: "",
    queryFn: ({ pageParam }) =>
      api<{ logs: Log[]; nextCursor: string | null }>(`/api/admin/audit-logs?action=${encodeURIComponent(action)}${pageParam ? `&cursor=${pageParam}` : ""}`),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const logs = q.data?.pages.flatMap((p) => p.logs) ?? [];
  const verify = useMutation({
    mutationFn: () => api<{ ok: boolean; checked: number; brokenAt?: { seq: string; createdAt: string; reason: string } }>("/api/admin/audit-logs/verify", { method: "POST" }),
  });

  return (
    <>
      <PageTitle actions={
        <div className="flex flex-wrap items-center gap-2">
          <input value={action} onChange={(e) => setAction(e.target.value)} placeholder="Filter by action prefix, e.g. review." className="input w-72" />
          <button className="btn-ghost" disabled={verify.isPending} onClick={() => verify.mutate()}>{verify.isPending ? "Checking…" : "Verify integrity"}</button>
        </div>
      }>Audit log</PageTitle>
      {verify.data && (
        <p role="status" className={`mb-4 rounded-md p-3 text-sm ${verify.data.ok ? "bg-brand-50 text-brand-700" : "bg-rose-50 text-rose-700"}`}>
          {verify.data.ok
            ? `✓ Intact: all ${verify.data.checked} chained entries match their hashes.`
            : `✗ Tampering detected at entry #${verify.data.brokenAt?.seq} (${new Date(verify.data.brokenAt!.createdAt).toLocaleString("en-GB")}): ${verify.data.brokenAt?.reason}. The security contact has been alerted.`}
        </p>
      )}
      <p className="mb-4 text-xs text-ink-500">Entries are append-only and hash-chained: the database refuses edits, and any change or removal shows up in the integrity check.</p>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-ink-100 uppercase text-ink-500">
            <tr><th className="p-2">When</th><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th></tr>
          </thead>
          <tbody className="divide-y divide-ink-200 font-mono">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap p-2">{new Date(l.createdAt).toLocaleString("en-GB")}</td>
                <td>{l.actor?.email ?? "system/anonymous"}</td>
                <td>{l.action}</td>
                <td>{l.entityType}:{l.entityId}</td>
                <td className="max-w-md truncate">{l.metadata ? JSON.stringify(l.metadata) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {q.hasNextPage && <button className="btn-ghost mt-4" onClick={() => q.fetchNextPage()}>Load more</button>}
    </>
  );
}
