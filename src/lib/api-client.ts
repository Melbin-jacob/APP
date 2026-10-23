// Thin fetch wrapper for client components. Same-origin only; the server's
// Origin check is the CSRF guard, so no token plumbing is needed here.
export class ClientApiError extends Error {
  constructor(public status: number, public code: string, message: string, public issues?: { path: string; message: string }[]) {
    super(message);
  }
}

// Set by <ReauthDialog>: asks the user to confirm it's them (password + code)
// and resolves true once the server accepts it, false if they cancel.
type ReauthPrompt = () => Promise<boolean>;
let reauthPrompt: ReauthPrompt | null = null;
export const setReauthPrompt = (fn: ReauthPrompt | null) => { reauthPrompt = fn; };

async function send(path: string, init: RequestInit): Promise<Response> {
  const res = await fetch(path, { ...init, credentials: "same-origin" });
  // Sensitive actions answer "reauth_required": confirm identity, then retry once.
  if (res.status === 401 && reauthPrompt) {
    const body = await res.clone().json().catch(() => ({}));
    if (body?.error?.code === "reauth_required" && (await reauthPrompt())) {
      return fetch(path, { ...init, credentials: "same-origin" });
    }
  }
  return res;
}

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ClientApiError(res.status, body?.error?.code ?? "error", body?.error?.message ?? "Request failed", body?.error?.issues);
  }
  return res.json() as Promise<T>;
}

export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  return parse<T>(await send(path, {
    ...rest,
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...rest.headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  }));
}

/** Multipart upload (e.g. images) with the same error handling and re-confirmation. */
export async function apiForm<T>(path: string, form: FormData, method = "POST"): Promise<T> {
  return parse<T>(await send(path, { method, body: form }));
}
