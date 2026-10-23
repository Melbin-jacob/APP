"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { usePrefs } from "@/components/providers/PreferencesProvider";
import { setReauthPrompt } from "@/lib/api-client";

/**
 * "Confirm it's you" dialog for sensitive actions. Mounted once; api() opens it
 * when the server answers reauth_required, then retries the original request.
 */
export function ReauthDialog() {
  const { t } = usePrefs();
  const [open, setOpen] = useState(false);
  const [needCode, setNeedCode] = useState(true);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    setReauthPrompt(() => new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setPassword(""); setCode(""); setError(""); setOpen(true);
      fetch("/api/me/mfa", { credentials: "same-origin" }).then((r) => r.json()).then((s) => setNeedCode(!!s.enabled)).catch(() => setNeedCode(true));
    }));
    return () => setReauthPrompt(null);
  }, []);

  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);

  const finish = (ok: boolean) => {
    setOpen(false);
    resolver.current?.(ok);
    resolver.current = null;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/me/reauth", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, code: needCode ? code : undefined }),
    });
    setBusy(false);
    if (res.ok) finish(true);
    else setError(res.status === 429 ? t("security.tooManyTries") : t("security.reauthWrong"));
  };

  return (
    <dialog ref={dialog} onCancel={(e) => { e.preventDefault(); finish(false); }} className="w-full max-w-sm rounded-xl p-0 shadow-xl backdrop:bg-ink-900/50">
      {open && <form onSubmit={submit} className="space-y-4 p-6">
        <div>
          <h2 className="text-lg font-semibold">{t("security.reauthTitle")}</h2>
          <p className="mt-1 text-sm text-ink-500">{t("security.reauthBody")}</p>
        </div>
        <div>
          <label htmlFor="reauth-pw" className="label">{t("account.currentPassword")}</label>
          <input id="reauth-pw" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" autoFocus />
        </div>
        {needCode && (
          <div>
            <label htmlFor="reauth-code" className="label">{t("security.codeLabel")}</label>
            <input id="reauth-code" required inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} className="input tracking-widest" dir="ltr" />
          </div>
        )}
        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => finish(false)}>{t("business.cancel")}</button>
          <button className="btn-primary" disabled={busy}>{t("security.confirm")}</button>
        </div>
      </form>}
    </dialog>
  );
}
