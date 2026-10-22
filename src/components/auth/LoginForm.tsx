"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const ERRORS: Record<string, string> = {
  CredentialsSignin: "Email or password is incorrect.",
  RateLimited: "Too many attempts. Please wait a few minutes and try again.",
  AccountDisabled: "This account has been suspended. Contact support.",
  AccessDenied: "This account has been suspended. Contact support.",
  EmailSignin: "We couldn't send the sign-in link. Try again shortly.",
};

export function LoginForm({ sent, error, callbackUrl }: { sent: boolean; error?: string; callbackUrl: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState(error ? (ERRORS[error] ?? "Sign-in failed.") : "");
  const [busy, setBusy] = useState(false);

  if (sent) {
    return (
      <div className="card p-8 text-center" role="status">
        <h1 className="text-xl font-bold">Check your email</h1>
        <p className="mt-2 text-sm text-ink-500">We&apos;ve sent you a sign-in link. It expires in 10 minutes.</p>
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
    if (res?.error) setMsg(ERRORS[res.error] ?? "Sign-in failed.");
    else router.push(res?.url ?? callbackUrl);
  };

  return (
    <form onSubmit={submit} className="card space-y-4 p-8">
      <h1 className="text-xl font-bold">Sign in</h1>
      <div className="flex rounded-full bg-ink-100 p-1 text-sm" role="tablist">
        {(["password", "magic"] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
            className={`flex-1 rounded-full py-1.5 ${mode === m ? "bg-white shadow-card" : "text-ink-500"}`}>
            {m === "password" ? "Password" : "Email me a link"}
          </button>
        ))}
      </div>
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
      </div>
      {mode === "password" && (
        <div>
          <label htmlFor="password" className="label">Password</label>
          <input id="password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
        </div>
      )}
      {msg && <p role="alert" className="text-sm text-rose-600">{msg}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full">{mode === "password" ? "Sign in" : "Send magic link"}</button>
      <p className="text-center text-sm text-ink-500">
        New here? <Link href="/register" className="font-medium text-brand-600">Create an account</Link>
      </p>
    </form>
  );
}
