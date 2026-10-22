// Thin fetch wrapper for client components. Same-origin only; the server's
// Origin check is the CSRF guard, so no token plumbing is needed here.
export class ClientApiError extends Error {
  constructor(public status: number, public code: string, message: string, public issues?: { path: string; message: string }[]) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(path, {
    ...rest,
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...rest.headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    credentials: "same-origin",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ClientApiError(res.status, body?.error?.code ?? "error", body?.error?.message ?? "Request failed", body?.error?.issues);
  }
  return res.json() as Promise<T>;
}
