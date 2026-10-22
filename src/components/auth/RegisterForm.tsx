"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState, type FormEvent, type ReactNode } from "react";
import { api, ClientApiError } from "@/lib/api-client";
import { LIABILITY_DISCLAIMER } from "@/lib/legal";
import { PostcodeLookup, type VerifiedLocation } from "./PostcodeLookup";

type Category = { id: string; name: string };
type Errors = Record<string, string>;

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

export function RegisterForm({ initialType, categories }: { initialType: "customer" | "trader"; categories: Category[] }) {
  const [type, setType] = useState(initialType);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | { status?: string }>(null);
  // Businesses must enter a postcode that resolves to a real place before the
  // rest of their details can be filled in or submitted.
  const [location, setLocation] = useState<VerifiedLocation | null>(null);
  const locked = type === "trader" && !location;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const str = (k: string) => String(f.get(k) ?? "").trim();
    const payload: Record<string, unknown> = {
      accountType: type,
      name: str("name"),
      email: str("email"),
      password: str("password"),
      acceptTerms: f.get("acceptTerms") === "on",
      marketingOptIn: f.get("marketingOptIn") === "on",
    };
    if (type === "trader") {
      if (!location) return;
      Object.assign(payload, {
        businessName: str("businessName"),
        phone: str("phone"),
        categoryId: str("categoryId"),
        hourlyRatePence: str("hourlyRate") ? Math.round(Number(str("hourlyRate")) * 100) : undefined,
        // The server re-resolves the postcode; city and coordinates come from there.
        postcode: location.postcode,
        serviceRadiusKm: Number(str("serviceRadiusKm") || 25),
        servicePostcodes: str("servicePostcodes").split(/[\s,]+/).filter(Boolean),
      });
    }
    setBusy(true);
    setErrors({});
    setFormError("");
    try {
      const res = await api<{ status?: string }>("/api/auth/register", { method: "POST", json: payload });
      await signIn("credentials", { email: payload.email, password: payload.password, redirect: false });
      setDone(res);
    } catch (err) {
      if (err instanceof ClientApiError && err.issues) {
        setErrors(Object.fromEntries(err.issues.map((i) => [i.path, i.message])));
      }
      if (err instanceof ClientApiError && err.code === "postcode_not_found") {
        setErrors({ postcode: err.message });
        setLocation(null);
      }
      setFormError(err instanceof ClientApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="card p-8 text-center" role="status">
        <h1 className="text-xl font-bold">Welcome aboard!</h1>
        <p className="mt-2 text-sm text-ink-500">
          {type === "trader" && done.status === "PENDING"
            ? "Your business profile has been submitted and will be visible once our team approves it."
            : "Your account is ready."}
        </p>
        <Link href={type === "trader" ? "/dashboard" : "/"} className="btn-primary mt-6">Continue</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-5 p-8" noValidate>
      <h1 className="text-xl font-bold">Create your account</h1>
      <div className="flex rounded-full bg-ink-100 p-1 text-sm" role="tablist">
        {(["customer", "trader"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={type === t} onClick={() => setType(t)}
            className={`flex-1 rounded-full py-1.5 ${type === t ? "bg-white shadow-card" : "text-ink-500"}`}>
            {t === "customer" ? "I'm looking for a pro" : "I'm a business"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="name" label="Your name" error={errors.name}><input id="name" name="name" required className="input" autoComplete="name" /></Field>
        <Field id="email" label="Email" error={errors.email}><input id="email" name="email" type="email" required className="input" autoComplete="email" /></Field>
        <Field id="password" label="Password (12+ characters)" error={errors.password}>
          <input id="password" name="password" type="password" required minLength={12} className="input" autoComplete="new-password" />
        </Field>
      </div>

      {type === "trader" && (
        <div className="space-y-4 border-t border-ink-200 pt-5">
          <h2 className="text-sm font-semibold">Business details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <PostcodeLookup onChange={setLocation} serverError={errors.postcode} />
          </div>
          {/* A disabled fieldset disables every control inside it. */}
          <fieldset disabled={locked} aria-describedby={locked ? "postcode-status" : undefined}
            className={`grid gap-4 transition sm:grid-cols-2 ${locked ? "pointer-events-none opacity-50" : ""}`}>
            <legend className="sr-only">Business information</legend>
            <Field id="city" label="Area (from your postcode)">
              <input id="city" readOnly tabIndex={-1} value={location ? [location.city, location.region].filter((v, i, a) => v && a.indexOf(v) === i).join(", ") : ""}
                placeholder="Filled in from your postcode" className="input bg-ink-100" />
            </Field>
            <Field id="businessName" label="Business name" error={errors.businessName}><input id="businessName" name="businessName" required className="input" /></Field>
            <Field id="phone" label="Phone number" error={errors.phone}><input id="phone" name="phone" type="tel" required className="input" autoComplete="tel" /></Field>
            <Field id="categoryId" label="Trade category" error={errors.categoryId}>
              <select id="categoryId" name="categoryId" required className="input" defaultValue="">
                <option value="" disabled>Choose…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field id="hourlyRate" label={`Hourly rate (${location?.country === "US" ? "$" : "£"})`} error={errors.hourlyRatePence}>
              <input id="hourlyRate" name="hourlyRate" type="number" min={0} step="1" className="input" />
            </Field>
            <Field id="serviceRadiusKm" label="Service radius (km)" error={errors.serviceRadiusKm}><input id="serviceRadiusKm" name="serviceRadiusKm" type="number" min={1} max={300} defaultValue={25} className="input" /></Field>
            <div className="sm:col-span-2">
              <Field id="servicePostcodes" label="Also cover these postcode areas (optional)" error={errors.servicePostcodes}><input id="servicePostcodes" name="servicePostcodes" placeholder="SW1A, SW1B" className="input" /></Field>
            </div>
          </fieldset>
        </div>
      )}

      <div className="space-y-3 border-t border-ink-200 pt-5">
        <div className="max-h-28 overflow-y-auto rounded bg-ink-100 p-3 text-xs leading-relaxed text-ink-700">{LIABILITY_DISCLAIMER}</div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="acceptTerms" required className="mt-1" />
          <span>
            I have read and accept the <Link href="/terms" target="_blank" className="underline">Terms of Service</Link> and{" "}
            <Link href="/privacy" target="_blank" className="underline">Privacy Policy</Link>, including the disclaimer above.
          </span>
        </label>
        {errors.acceptTerms && <p className="text-xs text-rose-600">{errors.acceptTerms}</p>}
        <label className="flex items-start gap-2 text-sm text-ink-700">
          <input type="checkbox" name="marketingOptIn" className="mt-1" />
          <span>Send me occasional tips and offers (optional).</span>
        </label>
      </div>

      {formError && <p role="alert" className="text-sm text-rose-600">{formError}</p>}
      <button type="submit" disabled={busy || locked} className="btn-primary w-full">
        {busy ? "Creating account…" : locked ? "Enter a valid postcode to continue" : "Create account"}
      </button>
    </form>
  );
}
