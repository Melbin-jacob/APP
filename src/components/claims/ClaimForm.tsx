"use client";

import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { usePrefs } from "@/components/providers/PreferencesProvider";
import { apiForm, ClientApiError } from "@/lib/api-client";
import { PHONE_PATTERN } from "@/lib/quotes";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";
const DOCS = [
  { kind: "REGISTRATION", label: "claim.registrationDoc", hint: "claim.registrationHint" },
  { kind: "ID_PROOF", label: "claim.idDoc", hint: "claim.idHint" },
] as const;
type DocKind = (typeof DOCS)[number]["kind"];

/** Client-side check so people see a clear message before uploading; the server re-checks. */
function fileProblem(file: File | undefined) {
  if (!file) return "claim.fileMissing" as const;
  if (file.size > MAX_FILE_BYTES) return "claim.fileTooBig" as const;
  if (file.type && !ACCEPT.split(",").includes(file.type)) return "claim.fileType" as const;
  return null;
}

export function ClaimForm({ slug, businessName, defaultName }: { slug: string; businessName: string; defaultName: string }) {
  const { t } = usePrefs();
  const [f, setF] = useState({ contactName: defaultName, jobTitle: "", phone: "", message: "" });
  const [authorised, setAuthorised] = useState(false);
  const [files, setFiles] = useState<Partial<Record<DocKind, File>>>({});
  const [showFileErrors, setShowFileErrors] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF((v) => ({ ...v, [k]: e.target.value })); m.reset(); };
  const m = useMutation({
    mutationFn: () => {
      const body = new FormData();
      for (const [k, v] of Object.entries(f)) body.set(k, v.trim());
      body.set("authorised", "true");
      for (const { kind } of DOCS) body.set(kind, files[kind]!);
      return apiForm(`/api/traders/${slug}/claim`, body);
    },
  });
  const fileErrors = Object.fromEntries(DOCS.map(({ kind }) => [kind, fileProblem(files[kind])])) as Record<DocKind, ReturnType<typeof fileProblem>>;
  const filesOk = DOCS.every(({ kind }) => !fileErrors[kind]);
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
  const err = m.error instanceof ClientApiError && [400, 409, 413, 415, 429].includes(m.error.status) ? m.error.message
    : m.error ? t("common.somethingWrong") : "";

  return (
    <form onSubmit={(e: FormEvent) => { e.preventDefault(); setShowFileErrors(true); if (!badPhone && authorised && filesOk) m.mutate(); }} className="card space-y-4 p-6">
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
      <fieldset className="space-y-3 rounded-lg border border-ink-200 p-4">
        <legend className="px-1 font-semibold">{t("claim.docsTitle")}</legend>
        <p className="text-sm text-ink-700">🔒 {t("claim.docsIntro")}</p>
        {DOCS.map(({ kind, label, hint }) => {
          const problem = showFileErrors || files[kind] ? fileErrors[kind] : null;
          const id = `c-doc-${kind}`;
          return (
            <div key={kind}>
              <label htmlFor={id} className="label">{t(label)}</label>
              <input id={id} name={kind} type="file" accept={ACCEPT} required aria-invalid={!!problem} aria-describedby={`${id}-hint`}
                onChange={(e) => { setFiles((v) => ({ ...v, [kind]: e.target.files?.[0] })); m.reset(); }}
                className="block w-full text-sm text-ink-700 file:me-3 file:rounded-md file:border-0 file:bg-ink-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-ink-200" />
              <p id={`${id}-hint`} className={`mt-1 text-xs ${problem ? "text-rose-600" : "text-ink-500"}`}>{problem ? t(problem) : t(hint)}</p>
            </div>
          );
        })}
        <p className="text-xs text-ink-500">{t("claim.fileFormats")}</p>
      </fieldset>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" required checked={authorised} onChange={(e) => setAuthorised(e.target.checked)} className="mt-1" />
        <span>{t("claim.authorised", { name: businessName })}</span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={m.isPending || !authorised}>{m.isPending ? t("claim.uploading") : t("claim.submit")}</button>
        {err && <span role="alert" className="text-sm text-rose-600">{err}</span>}
      </div>
    </form>
  );
}
