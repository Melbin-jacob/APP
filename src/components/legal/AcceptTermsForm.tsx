"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePrefs } from "@/components/providers/PreferencesProvider";
import { BirthDateFields } from "@/components/auth/BirthDateFields";
import { api, ClientApiError } from "@/lib/api-client";
import { LIABILITY_DISCLAIMER } from "@/lib/legal";

/** `askAge`: the account never confirmed its age (Google / email-link sign-up). */
export function AcceptTermsForm({ version, next, askAge = false }: { version: string; next: string; askAge?: boolean }) {
  const { t, locale } = usePrefs();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [birth, setBirth] = useState({ month: "", year: "" });
  const [tooYoung, setTooYoung] = useState(false);
  const ageMissing = askAge && (!birth.month || !birth.year);

  const accept = async () => {
    setBusy(true);
    setError(false);
    try {
      await api("/api/me/accept-terms", {
        method: "POST",
        json: { acceptTerms: true, version, ...(askAge ? { birthMonth: Number(birth.month), birthYear: Number(birth.year) } : {}) },
      });
      router.push(next);
      router.refresh();
    } catch (err) {
      // Under-age: the account has been deleted on the server and signed out.
      if (err instanceof ClientApiError && err.code === "too_young") setTooYoung(true);
      else setError(true);
      setBusy(false);
    }
  };

  if (tooYoung) {
    return (
      <div className="card space-y-3 p-8 text-center" role="status">
        <h1 className="text-xl font-bold">{t("age.tooYoungTitle")}</h1>
        <p className="text-sm text-ink-700">{t("age.accountRemoved")}</p>
        <Link href="/" className="btn-ghost inline-flex">{t("age.backHome")}</Link>
      </div>
    );
  }

  return (
    <div className="card space-y-4 p-8">
      <h1 className="text-xl font-bold">{t("acceptTerms.title")}</h1>
      <p className="text-sm text-ink-700">{t("acceptTerms.body")}</p>
      <div className="max-h-40 overflow-y-auto rounded bg-ink-100 p-3 text-xs leading-relaxed text-ink-700">
        <p>{t("legal.disclaimer")}</p>
        {locale !== "en" && (
          <>
            <p className="mt-2 italic text-ink-500">{t("legal.translationNote")}</p>
            <p className="mt-2" lang="en" dir="ltr">{LIABILITY_DISCLAIMER}</p>
          </>
        )}
      </div>
      {askAge && <BirthDateFields value={birth} onChange={setBirth} />}
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        <span>
          {t.rich("register.accept", {
            terms: <Link key="terms" href="/terms" target="_blank" className="underline">{t("register.terms")}</Link>,
            privacy: <Link key="privacy" href="/privacy" target="_blank" className="underline">{t("register.privacy")}</Link>,
          })}
        </span>
      </label>
      {error && <p role="alert" className="text-sm text-rose-600">{t("common.somethingWrong")}</p>}
      <button type="button" className="btn-primary w-full" disabled={!checked || busy || ageMissing} onClick={accept}>{t("acceptTerms.continue")}</button>
      <p className="text-center text-xs text-ink-500"><Link href="/account" className="underline">{t("acceptTerms.manageData")}</Link></p>
    </div>
  );
}
