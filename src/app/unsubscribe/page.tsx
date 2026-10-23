import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { UnsubscribeButton } from "@/components/legal/UnsubscribeButton";
import { getI18n } from "@/i18n/server";
import { readUnsubscribeToken } from "@/server/services/email-prefs";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("unsubscribe.title"), referrer: "no-referrer", robots: { index: false, follow: false } };
}

// Opening the page changes nothing (mail scanners pre-fetch links); the
// visitor confirms with a button.
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t: token = "" } = await searchParams;
  const [{ t }, target] = [await getI18n(), readUnsubscribeToken(token)];

  return (
    <SiteShell>
      <div className="mx-auto max-w-lg py-10">
        <div className="card space-y-4 p-8 text-center">
          <h1 className="text-xl font-bold">{t("unsubscribe.title")}</h1>
          {target ? (
            <>
              <p className="text-sm text-ink-700">
                {t(target.scope === "NEWSLETTER" ? "unsubscribe.newsletter" : "unsubscribe.reviewRequests", { email: target.email })}
              </p>
              <UnsubscribeButton token={token} />
            </>
          ) : (
            <p className="text-sm text-rose-700">{t("unsubscribe.invalid")}</p>
          )}
        </div>
      </div>
    </SiteShell>
  );
}
