"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
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

  return (
    <>
      <PageTitle actions={<input value={action} onChange={(e) => setAction(e.target.value)} placeholder="Filter by action prefix, e.g. review." className="input w-72" />}>Audit log</PageTitle>
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
