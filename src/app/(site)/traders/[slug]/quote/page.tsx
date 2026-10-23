import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/layout/SiteShell";
import { LegalDisclaimer } from "@/components/legal/LegalDisclaimer";
import { QuoteForm } from "@/components/quotes/QuoteForm";
import { BusinessAvatar } from "@/components/traders/BusinessAvatar";
import { db } from "@/lib/db";
import { isSupportedCountry } from "@/lib/postcode";
import { getI18n } from "@/i18n/server";
import { getPrincipal } from "@/server/auth";
import { getPublicTrader } from "@/server/services/catalog";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [trader, { t }] = await Promise.all([getPublicTrader((await params).slug), getI18n()]);
  return trader ? { title: t("quote.title", { name: trader.businessName }), robots: { index: false } } : {};
}

export default async function QuotePage({ params }: Props) {
  const [trader, { t }, principal] = await Promise.all([getPublicTrader((await params).slug), getI18n(), getPrincipal()]);
  if (!trader) notFound();
  const me = principal ? await db.user.findUnique({ where: { id: principal.id }, select: { name: true, email: true, phone: true, addressLine: true, city: true, postcode: true } }) : null;

  return (
    <SiteShell>
      <div className="mx-auto grid max-w-5xl gap-6 py-10 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <header className="flex items-center gap-4">
            <BusinessAvatar name={trader.businessName} logoUrl={trader.logoUrl} className="h-14 w-14 rounded-lg" textClassName="text-lg" />
            <div>
              <h1 className="text-2xl font-bold">{t("quote.title", { name: trader.businessName })}</h1>
              <p className="text-sm text-ink-500">{t("quote.intro", { name: trader.businessName })}</p>
            </div>
          </header>
          <QuoteForm
            slug={trader.slug}
            businessName={trader.businessName}
            claimed={trader.claimed}
            country={isSupportedCountry(trader.country) ? trader.country : "US"}
            defaults={{
              name: me?.name ?? "", email: me?.email ?? "", phone: me?.phone ?? "",
              addressLine: me?.addressLine ?? "", city: me?.city ?? "", postcode: me?.postcode ?? "",
            }}
          />
        </div>
        <aside className="space-y-4">
          <Link href={`/traders/${trader.slug}`} className="text-sm text-brand-700 underline">← {t("quote.back", { name: trader.businessName })}</Link>
          <LegalDisclaimer />
        </aside>
      </div>
    </SiteShell>
  );
}
