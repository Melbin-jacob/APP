import { redirect } from "next/navigation";
import { SiteShell } from "@/components/layout/SiteShell";
import { AcceptTermsForm } from "@/components/legal/AcceptTermsForm";
import { getI18n } from "@/i18n/server";
import { TOS_VERSION } from "@/lib/legal";
import { getPrincipal, needsTerms } from "@/server/auth";

export async function generateMetadata() {
  return { title: (await getI18n()).t("acceptTerms.title"), robots: { index: false } };
}

const safeNext = (v?: string) => (v?.startsWith("/") && !v.startsWith("//") ? v : "/account");

export default async function AcceptTermsPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  const user = await getPrincipal();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(`/legal/accept-terms?next=${next}`)}`);
  if (!needsTerms(user)) redirect(next);
  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl py-12">
        <AcceptTermsForm version={TOS_VERSION} next={next} />
      </div>
    </SiteShell>
  );
}
