"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import { useState, type FormEvent } from "react";
import { usePrefs } from "@/components/providers/PreferencesProvider";
import { api, ClientApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/format";

type Status = { enabled: boolean; enabledAt: string | null; recoveryCodesLeft: number };

function RecoveryCodes({ codes }: { codes: string[] }) {
  const { t } = usePrefs();
  const text = codes.join("\n");
  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([`GetTradePros recovery codes\n\n${text}\n\nEach code works once.\n`], { type: "text/plain" }));
    a.download = "gettradepros-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className="space-y-3 rounded-md border border-accent-400/50 bg-[#f7f2e8] p-4">
      <p className="text-sm font-semibold">{t("security.recoveryTitle")}</p>
      <p className="text-sm text-ink-700">{t("security.recoveryBody")}</p>
      <ul className="grid grid-cols-2 gap-1 font-mono text-sm sm:grid-cols-5" dir="ltr">{codes.map((c) => <li key={c}>{c}</li>)}</ul>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost px-3 py-1.5 text-sm" onClick={download}>{t("security.download")}</button>
        <button type="button" className="btn-ghost px-3 py-1.5 text-sm" onClick={() => navigator.clipboard?.writeText(text)}>{t("security.copy")}</button>
      </div>
    </div>
  );
}

export function SecuritySettings({ required, isStaff, hasPassword }: { required: boolean; isStaff: boolean; hasPassword: boolean }) {
  const { t, locale } = usePrefs();
  const status = useQuery({ queryKey: ["mfa"], queryFn: () => api<Status>("/api/me/mfa") });
  const [setup, setSetup] = useState<{ qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"none" | "regen" | "disable">("none");

  const begin = useMutation({ mutationFn: () => api<{ qr: string; secret: string }>("/api/me/mfa/setup", { method: "POST" }), onSuccess: (d) => { setSetup(d); setCode(""); } });
  const confirm = useMutation({
    mutationFn: () => api<{ recoveryCodes: string[] }>("/api/me/mfa/confirm", { method: "POST", json: { code } }),
    onSuccess: (d) => { setCodes(d.recoveryCodes); setSetup(null); },
  });
  const regen = useMutation({
    mutationFn: () => api<{ recoveryCodes: string[] }>("/api/me/mfa/recovery-codes", { method: "POST", json: { code } }),
    onSuccess: (d) => { setCodes(d.recoveryCodes); setMode("none"); setCode(""); status.refetch(); },
  });
  const disable = useMutation({
    mutationFn: () => api("/api/me/mfa", { method: "DELETE", json: { password, code } }),
    onSuccess: () => signOut({ callbackUrl: "/login?notice=mfa_off" }),
  });
  const everywhere = useMutation({
    mutationFn: () => api("/api/me/sessions", { method: "DELETE" }),
    onSuccess: () => signOut({ callbackUrl: "/login?notice=signed_out_everywhere" }),
  });
  const err = (e: unknown) => (e instanceof ClientApiError && e.status < 500 ? e.message : e ? t("common.somethingWrong") : "");

  const enabled = status.data?.enabled;
  return (
    <div className="space-y-6">
      <section className="card space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">{t("security.mfaTitle")}</h2>
            <p className="mt-1 text-sm text-ink-500">{t("security.mfaBody")}</p>
          </div>
          {status.data && (
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${enabled ? "bg-brand-50 text-brand-700" : "bg-ink-100 text-ink-700"}`}>
              {enabled ? t("security.on") : t("security.off")}
            </span>
          )}
        </div>
        {required && !enabled && <p role="alert" className="rounded-md bg-[#f1ece2] p-3 text-sm text-ink-900">{t("security.requiredForStaff")}</p>}

        {codes && (
          <>
            <RecoveryCodes codes={codes} />
            {!status.data?.enabled || confirm.isSuccess ? (
              <div className="space-y-2">
                <p className="text-sm text-ink-700">{t("security.signInAgain")}</p>
                <button type="button" className="btn-primary" onClick={() => signOut({ callbackUrl: "/login?notice=mfa_on" })}>{t("security.continueSignIn")}</button>
              </div>
            ) : null}
          </>
        )}

        {!enabled && !setup && !codes && (
          <button type="button" className="btn-primary" disabled={begin.isPending || status.isLoading || !hasPassword} onClick={() => begin.mutate()}>{t("security.turnOn")}</button>
        )}

        {setup && (
          <form className="space-y-4" onSubmit={(e: FormEvent) => { e.preventDefault(); confirm.mutate(); }}>
            <ol className="list-decimal space-y-1 ps-5 text-sm text-ink-700">
              <li>{t("security.step1")}</li>
              <li>{t("security.step2")}</li>
              <li>{t("security.step3")}</li>
            </ol>
            <div className="flex flex-wrap items-center gap-6">
              {/* eslint-disable-next-line @next/next/no-img-element -- data: URL generated on our server */}
              <img src={setup.qr} alt={t("security.qrAlt")} width={180} height={180} className="rounded border border-ink-200" />
              <div className="text-sm">
                <p className="text-ink-500">{t("security.manualKey")}</p>
                <p className="mt-1 break-all font-mono text-ink-900" dir="ltr">{setup.secret.match(/.{1,4}/g)?.join(" ")}</p>
              </div>
            </div>
            <div className="max-w-xs">
              <label htmlFor="mfa-code" className="label">{t("security.codeLabel")}</label>
              <input id="mfa-code" required inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => { setCode(e.target.value); confirm.reset(); }} className="input tracking-widest" dir="ltr" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button className="btn-primary" disabled={confirm.isPending}>{t("security.verifyAndTurnOn")}</button>
              <button type="button" className="btn-ghost" onClick={() => setSetup(null)}>{t("business.cancel")}</button>
              {confirm.error && <span role="alert" className="text-sm text-rose-600">{err(confirm.error)}</span>}
            </div>
          </form>
        )}

        {enabled && !codes && status.data && (
          <div className="space-y-4">
            <p className="text-sm text-ink-700">
              {t("security.onSince", { date: formatDate(status.data.enabledAt!, locale) })} · {t("security.codesLeft", { count: status.data.recoveryCodesLeft })}
            </p>
            {mode === "none" && (
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-ghost" onClick={() => { setMode("regen"); setCode(""); }}>{t("security.newCodes")}</button>
                {!(isStaff && required) && <button type="button" className="btn-ghost text-rose-700" onClick={() => { setMode("disable"); setCode(""); setPassword(""); }}>{t("security.turnOff")}</button>}
              </div>
            )}
            {mode !== "none" && (
              <form className="max-w-sm space-y-3" onSubmit={(e: FormEvent) => { e.preventDefault(); (mode === "regen" ? regen : disable).mutate(); }}>
                {mode === "disable" && (
                  <div>
                    <label htmlFor="mfa-pw" className="label">{t("account.currentPassword")}</label>
                    <input id="mfa-pw" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
                  </div>
                )}
                <div>
                  <label htmlFor="mfa-code2" className="label">{t("security.codeLabel")}</label>
                  <input id="mfa-code2" required autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} className="input tracking-widest" dir="ltr" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button className={mode === "disable" ? "btn-ghost text-rose-700" : "btn-primary"} disabled={regen.isPending || disable.isPending}>
                    {mode === "disable" ? t("security.turnOff") : t("security.newCodes")}
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => setMode("none")}>{t("business.cancel")}</button>
                </div>
                {(regen.error || disable.error) && <p role="alert" className="text-sm text-rose-600">{err(regen.error ?? disable.error)}</p>}
              </form>
            )}
          </div>
        )}
        {!hasPassword && <p className="text-xs text-ink-500">{t("security.needsPassword")}</p>}
      </section>

      <section className="card space-y-3 p-6">
        <h2 className="font-semibold">{t("security.sessionsTitle")}</h2>
        <p className="text-sm text-ink-500">{t("security.sessionsBody")}</p>
        <button type="button" className="btn-ghost" disabled={everywhere.isPending}
          onClick={() => window.confirm(t("security.sessionsConfirm")) && everywhere.mutate()}>
          {t("security.signOutEverywhere")}
        </button>
      </section>
    </div>
  );
}
