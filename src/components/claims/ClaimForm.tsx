"use client";

import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { usePrefs } from "@/components/providers/PreferencesProvider";
import { api, ClientApiError } from "@/lib/api-client";
import { PHONE_PATTERN } from "@/lib/quotes";

export function ClaimForm({ slug, businessName, defaultName }: { slug: string; businessName: string; defaultName: string }) {
  const { t } = usePrefs();
  const [f, setF] = useState({ contactName: defaultName, jobTitle: "", phone: "", message: "" });
  const [authorised, setAuthorised] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF((v) => ({ ...v, [k]: e.target.value })); m.reset(); };
  const m = useMutation({
    mutationFn: () => api(`/api/traders/${slug}/claim`, { method: "POST", json: { ...f, message: f.message.trim() || undefined, authorised: true } }),
  });
  const badPhone = f.phone.trim() !== "" && !PHONE_PATTERN.test(f.phone.trim());

  if (m.isSuccess) {
    return (
      <div className="card space-y-2 p-6" role="status">
        <h2 className="font-semibold">✓ {t("claim.sentTitle")}</h2>
        <p className="text-sm text-ink-700">{t("claim.sentBody", { name: businessName })}</p>
      </div>
    );
  }
  // Business-rule refusals (already claimed, pending…) come from the server.
  const err = m.error instanceof ClientApiError && m.error.status === 409 ? m.error.message
    : m.error instanceof ClientApiError && m.error.status === 429 ? m.error.message
    : m.error ? t("common.somethingWrong") : "";

  return (
    <form onSubmit={(e: FormEvent) => { e.preventDefault(); if (!badPhone && authorised) m.mutate(); }} className="card space-y-4 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="c-name" className="label">{t("claim.contactName")}</label>
          <input id="c-name" required minLength={2} maxLength={80} value={f.contactName} onChange={set("contactName")} className="input" autoComplete="name" />
        </div>
        <div>
          <label htmlFor="c-title" className="label">{t("claim.jobTitle")}</label>
          <input id="c-title" required minLength={2} maxLength={80} value={f.jobTitle} onChange={set("jobTitle")} className="input" placeholder={t("claim.jobTitlePlaceholder")} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="c-phone" className="label">{t("claim.phone")}</label>
          <input id="c-phone" type="tel" required value={f.phone} onChange={set("phone")} className="input" autoComplete="tel" dir="ltr" aria-invalid={badPhone} />
          <p className={`mt-1 text-xs ${badPhone ? "text-rose-600" : "text-ink-500"}`}>{badPhone ? t("register.errors.phone") : t("claim.phoneHint")}</p>
        </div>
      </div>
      <div>
        <label htmlFor="c-msg" className="label">{t("claim.message")}</label>
        <textarea id="c-msg" rows={3} maxLength={1000} value={f.message} onChange={set("message")} className="input" />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" required checked={authorised} onChange={(e) => setAuthorised(e.target.checked)} className="mt-1" />
        <span>{t("claim.authorised", { name: businessName })}</span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={m.isPending || !authorised}>{t("claim.submit")}</button>
        {err && <span role="alert" className="text-sm text-rose-600">{err}</span>}
      </div>
    </form>
  );
}
