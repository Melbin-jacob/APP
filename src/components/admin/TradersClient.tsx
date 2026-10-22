"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { Badge, PageTitle, statusTone } from "./ui";

type Trader = {
  id: string; businessName: string; slug: string; city: string; postcode: string; status: string; createdAt: string;
  user: { email: string }; categories: { category: { name: string } }[];
  credentials: { id: string; type: string; name: string; status: string; expiresAt: string | null }[];
};

// "CREDENTIALS" lists traders of any status with documents awaiting checks.
const VIEWS = { PENDING: "Pending approval", APPROVED: "Approved", SUSPENDED: "Suspended", REJECTED: "Rejected", CREDENTIALS: "Credentials to check" } as const;
type View = keyof typeof VIEWS;

export function AdminTradersClient({ initialStatus }: { initialStatus?: string }) {
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatusState] = useState<View>(initialStatus && initialStatus in VIEWS ? (initialStatus as View) : "PENDING");
  const setStatus = (v: View) => {
    setStatusState(v);
    router.replace(`${pathname}?status=${v}`, { scroll: false });
  };
  const q = useQuery({
    queryKey: ["admin-traders", status],
    queryFn: () => api<{ traders: Trader[] }>(status === "CREDENTIALS" ? "/api/admin/traders?credentials=PENDING" : `/api/admin/traders?status=${status}`),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-traders"] });
  const setTrader = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      api(`/api/admin/traders/${id}`, { method: "PATCH", json: { status, reason } }),
    onSuccess: refresh,
  });
  const setCred = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api(`/api/admin/credentials/${id}`, { method: "PATCH", json: { status } }),
    onSuccess: refresh,
  });

  return (
    <>
      <PageTitle actions={
        <select value={status} onChange={(e) => setStatus(e.target.value as View)} className="input w-52" aria-label="Show traders">
          {(Object.keys(VIEWS) as View[]).map((v) => <option key={v} value={v}>{VIEWS[v]}</option>)}
        </select>
      }>Traders</PageTitle>
      <div className="space-y-3">
        {q.data?.traders.map((t) => (
          <article key={t.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{t.businessName} <Badge tone={statusTone(t.status)}>{t.status}</Badge></h2>
                <p className="text-sm text-ink-500">
                  {t.categories.map((c) => c.category.name).join(", ")} · {t.city} {t.postcode} · {t.user.email} · joined {formatDate(t.createdAt)}
                </p>
              </div>
              <div className="flex gap-2">
                {t.status !== "APPROVED" && <button className="btn-primary px-3 py-1 text-xs" onClick={() => setTrader.mutate({ id: t.id, status: "APPROVED" })}>Approve</button>}
                {t.status === "APPROVED" && (
                  <button className="btn-ghost px-3 py-1 text-xs" onClick={() => {
                    const reason = prompt("Reason for suspension?");
                    if (reason) setTrader.mutate({ id: t.id, status: "SUSPENDED", reason });
                  }}>Suspend</button>
                )}
                {t.status === "PENDING" && <button className="btn-ghost px-3 py-1 text-xs" onClick={() => setTrader.mutate({ id: t.id, status: "REJECTED" })}>Reject</button>}
              </div>
            </div>
            {t.credentials.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-ink-200 pt-3 text-sm">
                {t.credentials.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2">
                    <span>{c.type}: {c.name} <Badge tone={statusTone(c.status)}>{c.status}</Badge></span>
                    {c.status === "PENDING" && (
                      <span className="flex gap-2">
                        <button className="text-xs text-brand-700 underline" onClick={() => setCred.mutate({ id: c.id, status: "VERIFIED" })}>Verify</button>
                        <button className="text-xs text-rose-700 underline" onClick={() => setCred.mutate({ id: c.id, status: "REJECTED" })}>Reject</button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
        {q.data?.traders.length === 0 && <p className="text-sm text-ink-500">Nothing here.</p>}
      </div>
    </>
  );
}
