"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { api, ClientApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { Badge, PageTitle, statusTone } from "./ui";

type User = { id: string; email: string; name: string | null; role: string; status: string; createdAt: string; lastLoginAt: string | null };

const ROLES = { "": "All roles", CUSTOMER: "Customers", TRADER: "Traders", ADMIN: "Admins", SUPER_ADMIN: "Super-admins" } as const;
type RoleFilter = keyof typeof ROLES;

export function AdminUsersClient({ initialRole }: { initialRole?: string }) {
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [role, setRoleState] = useState<RoleFilter>(initialRole && initialRole in ROLES ? (initialRole as RoleFilter) : "");
  const setRole = (r: RoleFilter) => {
    setRoleState(r);
    router.replace(r ? `${pathname}?role=${r}` : pathname, { scroll: false });
  };
  const users = useQuery({
    queryKey: ["admin-users", q, role],
    queryFn: () => api<{ users: User[] }>(`/api/admin/users?q=${encodeURIComponent(q)}${role ? `&role=${role}` : ""}`),
  });
  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => {
      const reason = prompt(`Reason for setting ${status}?`);
      if (!reason) return Promise.resolve();
      return api(`/api/admin/users/${id}`, { method: "PATCH", json: { status, reason } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  return (
    <>
      <PageTitle actions={
        <div className="flex flex-wrap gap-2">
          <select value={role} onChange={(e) => setRole(e.target.value as RoleFilter)} className="input w-40" aria-label="Filter by role">
            {(Object.keys(ROLES) as RoleFilter[]).map((r) => <option key={r} value={r}>{ROLES[r]}</option>)}
          </select>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search email or name" className="input w-64" aria-label="Search users" />
        </div>
      }>Users</PageTitle>
      {update.error && <p className="mb-3 text-sm text-rose-600">{update.error instanceof ClientApiError ? update.error.message : "Failed"}</p>}
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-100 text-xs uppercase text-ink-500">
            <tr><th className="p-3">Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Last login</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-ink-200">
            {users.data?.users.map((u) => (
              <tr key={u.id}>
                <td className="p-3">{u.email}<span className="block text-xs text-ink-500">{u.name}</span></td>
                <td>{u.role}</td>
                <td><Badge tone={statusTone(u.status)}>{u.status}</Badge></td>
                <td>{formatDate(u.createdAt)}</td>
                <td>{u.lastLoginAt ? formatDate(u.lastLoginAt) : "—"}</td>
                <td className="space-x-2 pr-3 text-right">
                  {u.status === "ACTIVE" ? (
                    <>
                      <button className="text-xs underline" onClick={() => update.mutate({ id: u.id, status: "SUSPENDED" })}>Suspend</button>
                      <button className="text-xs text-rose-700 underline" onClick={() => update.mutate({ id: u.id, status: "BANNED" })}>Ban</button>
                    </>
                  ) : u.status !== "PENDING_DELETION" && (
                    <button className="text-xs text-brand-700 underline" onClick={() => update.mutate({ id: u.id, status: "ACTIVE" })}>Reinstate</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
