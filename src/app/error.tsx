"use client";

import Link from "next/link";
import { useEffect } from "react";
import { sendClientError } from "@/components/analytics/ErrorReporter";
import { usePrefs } from "@/components/providers/PreferencesProvider";

// Shown when a page crashes. The error is reported to us (it was already
// logged on the server if it happened there; `digest` links the two).
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = usePrefs();
  useEffect(() => {
    sendClientError({ name: error.name, message: error.message, stack: error.stack, digest: error.digest });
  }, [error]);
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-bold text-ink-900">{t("errorPage.title")}</h1>
      <p className="text-sm text-ink-700">{t("errorPage.body")}</p>
      <div className="flex gap-3">
        <button type="button" className="btn-primary" onClick={reset}>{t("errorPage.retry")}</button>
        <Link href="/" className="btn-ghost">{t("errorPage.home")}</Link>
      </div>
    </main>
  );
}
