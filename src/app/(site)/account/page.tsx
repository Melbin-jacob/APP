import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteShell } from "@/components/layout/SiteShell";
import { PrivacyControls } from "@/components/auth/PrivacyControls";
import { getI18n } from "@/i18n/server";
import Link from "next/link";
import { getPrincipal, needsTerms } from "@/server/auth";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t("account.title") };
}

export default async function AccountPage() {
  const [user, { t }] = await Promise.all([getPrincipal(), getI18n()]);
  if (!user) redirect("/login?callbackUrl=/account");
  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl space-y-6 py-10">
        <section className="card p-6">
          <h1 className="text-xl font-bold">{t("account.title")}</h1>
          <p className="mt-1 text-sm text-ink-500">{t("account.signedInAs", { email: user.email })}</p>
          {needsTerms(user) && (
            <p className="mt-3 rounded-md bg-accent-400/15 p-3 text-sm">
              <Link href="/legal/accept-terms?next=/account" className="font-medium underline">{t("acceptTerms.title")}</Link>
            </p>
          )}
        </section>
        <PrivacyControls />
      </div>
    </SiteShell>
  );
}
