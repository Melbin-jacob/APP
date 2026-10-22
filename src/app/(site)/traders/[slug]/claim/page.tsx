import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClaimForm } from "@/components/claims/ClaimForm";
import { SiteShell } from "@/components/layout/SiteShell";
import { BusinessAvatar } from "@/components/traders/BusinessAvatar";
import { COMPANY } from "@/lib/company";
import { db } from "@/lib/db";
import { getI18n } from "@/i18n/server";
import { getPrincipal } from "@/server/auth";
import { claimBlocker } from "@/server/services/claims";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug;
  const [trader, { t }] = await Promise.all([db.traderProfile.findFirst({ where: { slug, status: "APPROVED" }, select: { businessName: true } }), getI18n()]);
  return trader ? { title: t("claim.title", { name: trader.businessName }), robots: { index: false } } : {};
}

export default async function ClaimPage({ params }: Props) {
  const slug = (await params).slug;
  const [trader, { t }, user] = await Promise.all([
    db.traderProfile.findFirst({ where: { slug, status: "APPROVED" }, select: { id: true, slug: true, businessName: true, city: true, logoUrl: true, userId: true } }),
    getI18n(),
    getPrincipal(),
  ]);
  if (!trader) notFound();
  const here = `/traders/${trader.slug}/claim`;
  const blocker = user && !trader.userId ? await claimBlocker(trader.id, user.id, user.role) : null;
  const me = user && !blocker && !trader.userId ? await db.user.findUnique({ where: { id: user.id }, select: { name: true } }) : null;

  const note = (text: string) => <p className="card p-6 text-sm text-ink-700" role="status">{text}</p>;

  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl space-y-6 py-10">
        <header className="flex items-center gap-4">
          <BusinessAvatar name={trader.businessName} logoUrl={trader.logoUrl} className="h-14 w-14 rounded-lg" textClassName="text-lg" />
          <div>
            <h1 className="text-2xl font-bold">{t("claim.title", { name: trader.businessName })}</h1>
            <p className="text-sm text-ink-500">{trader.city}</p>
          </div>
        </header>
        <section className="space-y-2 text-sm text-ink-700">
          <p>{t("claim.intro")}</p>
          <ul className="list-disc space-y-1 ps-5">
            <li>{t("claim.benefitLogo")}</li>
            <li>{t("claim.benefitDetails")}</li>
            <li>{t("claim.benefitQuotes")}</li>
          </ul>
          <p className="text-ink-500">{t("claim.howVerify")}</p>
        </section>

        {trader.userId ? note(t("claim.alreadyClaimed", { email: COMPANY.supportEmail }))
          : !user ? (
            <div className="card flex flex-wrap items-center gap-3 p-6">
              <p className="w-full text-sm text-ink-700">{t("claim.signInFirst")}</p>
              <Link href={`/login?callbackUrl=${encodeURIComponent(here)}`} className="btn-primary">{t("claim.signIn")}</Link>
              <Link href={`/register?next=${encodeURIComponent(here)}`} className="btn-ghost">{t("claim.createAccount")}</Link>
            </div>
          )
          : blocker === "pending" ? note(t("claim.pending", { name: trader.businessName }))
          : blocker === "owner" ? note(t("claim.youOwn"))
          : blocker === "hasBusiness" ? note(t("claim.hasBusiness", { email: COMPANY.supportEmail }))
          : blocker === "rejected" ? note(t("claim.rejected", { email: COMPANY.supportEmail }))
          : blocker === "admin" ? note(t("claim.staff"))
          : <ClaimForm slug={trader.slug} businessName={trader.businessName} defaultName={me?.name ?? ""} />}

        <p className="text-xs text-ink-500">
          <Link href={`/traders/${trader.slug}`} className="underline">← {t("quote.back", { name: trader.businessName })}</Link>
        </p>
      </div>
    </SiteShell>
  );
}
