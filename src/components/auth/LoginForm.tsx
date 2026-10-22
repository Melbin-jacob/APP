"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useT } from "@/components/providers/PreferencesProvider";

const KNOWN_ERRORS = ["CredentialsSignin", "RateLimited", "AccountDisabled", "EmailSignin"] as const;
type KnownError = (typeof KNOWN_ERRORS)[number];
const errorKey = (code: string) =>
  `login.errors.${(code === "AccessDenied" ? "AccountDisabled" : (KNOWN_ERRORS as readonly string[]).includes(code) ? code : "default") as KnownError | "default"}` as const;

export function LoginForm({ sent, error, callbackUrl }: { sent: boolean; error?: string; callbackUrl: string }) {
  const router = useRouter();
  const t = useT();
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState(error ? t(errorKey(error)) : "");
  const [busy, setBusy] = useState(false);

  if (sent) {
    return (
      <div className="card p-8 text-center" role="status">
        <h1 className="text-xl font-bold">{t("login.checkEmail")}</h1>
        <p className="mt-2 text-sm text-ink-500">{t("login.checkEmailBody")}</p>
      </div>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    if (mode === "magic") {
      await signIn("email", { email, callbackUrl });
      return;
    }
    const res = await signIn("credentials", { email, password, redirect: false, callbackUrl });
    setBusy(false);
    if (res?.error) setMsg(t(errorKey(res.error)));
    else router.push(res?.url ?? callbackUrl);
  };

  return (
    <form onSubmit={submit} className="card space-y-4 p-8">
      <h1 className="text-xl font-bold">{t("login.title")}</h1>
      <div className="flex rounded-full bg-ink-100 p-1 text-sm" role="tablist">
        {(["password", "magic"] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
            className={`flex-1 rounded-full py-1.5 ${mode === m ? "bg-white shadow-card" : "text-ink-500"}`}>
            {m === "password" ? t("login.password") : t("login.magic")}
          </button>
        ))}
      </div>
      <div>
        <label htmlFor="email" className="label">{t("login.email")}</label>
        <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
      </div>
      {mode === "password" && (
        <div>
          <label htmlFor="password" className="label">{t("login.password")}</label>
          <input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
        </div>
      )}
      {msg && <p role="alert" className="text-sm text-rose-600">{msg}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full">{mode === "password" ? t("login.submit") : t("login.sendLink")}</button>
      <p className="text-center text-sm text-ink-500">
        {t("login.newHere")} <Link href="/register" className="font-medium text-brand-600">{t("login.create")}</Link>
      </p>
    </form>
  );
}
