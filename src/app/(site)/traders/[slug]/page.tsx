import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/layout/SiteShell";
import { LegalDisclaimer } from "@/components/legal/LegalDisclaimer";
import { BusinessAvatar } from "@/components/traders/BusinessAvatar";
import { CallButton } from "@/components/traders/CallButton";
import { Price } from "@/components/traders/Price";
import { ReportReviewButton } from "@/components/traders/ReportReviewButton";
import { Icon } from "@/components/ui/Icon";
import { StarRating } from "@/components/ui/StarRating";
import { COMPANY } from "@/lib/company";
import { countryName, formatDate } from "@/lib/format";
import { getI18n } from "@/i18n/server";
import { getPublicTrader } from "@/server/services/catalog";

type Props = { params: Promise<{ slug: string }> };

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
type Hours = Partial<Record<(typeof DAYS)[number], { open: string; close: string }[]>>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const trader = await getPublicTrader((await params).slug);
  return trader ? { title: `${trader.businessName} · ${trader.city}`, description: trader.bio?.slice(0, 155) } : {};
}

// Reachable by direct link from any country (e.g. a shared URL); listings and
// search only ever show businesses in the visitor's own market.
export default async function TraderProfilePage({ params }: Props) {
  const [trader, { t, visitor }] = await Promise.all([getPublicTrader((await params).slug), getI18n()]);
  if (!trader) notFound();
  const primary = trader.categories.find((c) => c.isPrimary)?.category ?? trader.categories[0]?.category;
  const hours = (trader.operatingHours ?? {}) as Hours;
  const categoryLabel = (c: { slug: string; name: string }) => t.maybe(`categories.names.${c.slug}`, c.name);

  return (
    <SiteShell>
      <article className="py-8">
        {trader.country !== visitor.country && (
          <p className="mb-4 rounded-md bg-sky-50 px-4 py-2 text-sm text-sky-800" role="note">
            {t("profile.otherCountry", { country: countryName(trader.country, visitor.locale) })}
          </p>
        )}
        {!trader.claimed && (
          // Listings imported from public directories: unconfirmed until the owner claims them.
          <aside role="note" className="mb-4 rounded-md border border-accent-400/40 bg-accent-400/10 p-4 text-sm text-ink-700">
            <strong className="block text-ink-900">{t("profile.unclaimedTitle")}</strong>
            <p className="mt-1">{t("profile.unclaimedBody")}</p>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <Link className="font-medium text-brand-700 underline" href={`/traders/${trader.slug}/claim`}>
                {t("profile.claim")}
              </Link>
              <a className="text-ink-500 underline" href={`mailto:${COMPANY.privacyEmail}?subject=${encodeURIComponent(`Remove listing: ${trader.slug}`)}`}>
                {t("profile.requestRemoval")}
              </a>
            </p>
          </aside>
        )}
        <header className="card overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {trader.coverImageUrl && <img src={trader.coverImageUrl} alt="" className="h-48 w-full object-cover sm:h-64" />}
          <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
            <BusinessAvatar name={trader.businessName} logoUrl={trader.logoUrl} alt={t("profile.logo", { name: trader.businessName })} />
            <div className="flex-1">
              {primary && <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">{categoryLabel(primary)}</span>}
              <h1 className="text-2xl font-bold">{trader.businessName}</h1>
              <p className="mt-1 flex items-center gap-1 text-sm text-ink-500">
                <Icon name="pin" className="h-4 w-4" />
                {t("profile.location", { place: [trader.addressLine, trader.city, trader.postcode].filter(Boolean).join(", "), km: trader.serviceRadiusKm })}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <StarRating value={trader.ratingAvg} count={trader.ratingCount} size="md" />
                {trader.verifiedAt && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                    <Icon name="check" className="h-3 w-3" /> {t("profile.verified")}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              {trader.hourlyRatePence != null && (
                <p className="text-lg font-semibold">
                  <Price minor={trader.hourlyRatePence} currency={trader.currency} />
                  <span className="text-sm font-normal text-ink-500">{t("profile.perHour")}</span>
                </p>
              )}
              {trader.canCall && <CallButton slug={trader.slug} className="btn-primary" />}
              {trader.website && (
                <a href={trader.website} target="_blank" rel="nofollow noopener noreferrer ugc" className="text-sm text-brand-700 underline">
                  {t("profile.website")}
                </a>
              )}
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {trader.bio && (
              <section className="card p-6">
                <h2 className="mb-2 font-semibold">{t("profile.about")}</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-ink-700">{trader.bio}</p>
              </section>
            )}
            {trader.services.length > 0 && (
              <section className="card p-6">
                <h2 className="mb-3 font-semibold">{t("profile.services")}</h2>
                <ul className="divide-y divide-ink-200">
                  {trader.services.map((s) => (
                    <li key={s.id} className="flex justify-between gap-4 py-2 text-sm">
                      <span><strong>{s.title}</strong>{s.description && <span className="block text-ink-500">{s.description}</span>}</span>
                      {s.priceFromPence != null && (
                        <span className="shrink-0">
                          <Price minor={s.priceFromPence} currency={trader.currency} label="profile.from" />
                          {s.priceUnit && `/${s.priceUnit}`}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {trader.gallery.length > 0 && (
              <section className="card p-6">
                <h2 className="mb-3 font-semibold">{t("profile.gallery")}</h2>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {trader.gallery.map((g) => (
                    <li key={g.id}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g.url} alt={g.caption ?? t("profile.workExample")} className="aspect-square w-full rounded-md object-cover" loading="lazy" />
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section className="card p-6" aria-labelledby="reviews-heading">
              <h2 id="reviews-heading" className="mb-3 font-semibold">{t("profile.reviews")}</h2>
              {trader.reviews.length === 0 && <p className="text-sm text-ink-500">{t("profile.noReviews")}</p>}
              <ul className="space-y-4">
                {trader.reviews.map((r) => (
                  <li key={r.id} className="border-b border-ink-200 pb-4 last:border-0">
                    <div className="flex items-center justify-between">
                      <StarRating value={r.rating} />
                      <span className="text-xs text-ink-500">{formatDate(r.createdAt, visitor.locale)}</span>
                    </div>
                    {/* Rendered as text: React escapes it, and markup was stripped on write. */}
                    {r.comment && <p className="mt-2 text-sm text-ink-700">{r.comment}</p>}
                    <div className="mt-2 flex items-center justify-between text-xs text-ink-500">
                      <span>
                        {r.authorName}
                        {r.isVerified && <span className="ms-2 rounded bg-brand-50 px-1.5 py-0.5 text-brand-700">{t("profile.verifiedCustomer")}</span>}
                      </span>
                      <ReportReviewButton reviewId={r.id} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="space-y-6">
            <section id="quote" className="card p-6">
              <h2 className="mb-2 font-semibold">{t("profile.quoteTitle")}</h2>
              <p className="mb-4 text-sm text-ink-500">{t("profile.quoteBody", { name: trader.businessName })}</p>
              <div className="space-y-2">
                <Link href={`/traders/${trader.slug}/quote`} className="btn-primary w-full">{t("profile.quoteButton")}</Link>
                {trader.canCall && <CallButton slug={trader.slug} className="btn-ghost w-full" />}
              </div>
            </section>
            {Object.keys(hours).length > 0 && (
              <section className="card p-6">
                <h2 className="mb-2 font-semibold">{t("profile.hours")}</h2>
                <dl className="text-sm">
                  {DAYS.map((d) => (
                    <div key={d} className="flex justify-between py-0.5">
                      <dt className="text-ink-500">{t(`profile.days.${d}`)}</dt>
                      <dd dir="ltr">{hours[d]?.length ? hours[d]!.map((h) => `${h.open}–${h.close}`).join(", ") : t("profile.closed")}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
            {trader.credentials.length > 0 && (
              <section className="card p-6">
                <h2 className="mb-2 font-semibold">{t("profile.credentials")}</h2>
                <ul className="space-y-1 text-sm">
                  {trader.credentials.map((c) => (
                    <li key={c.id} className="flex items-start gap-2">
                      <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                      <span>{c.name}{c.issuer && <span className="text-ink-500"> · {c.issuer}</span>}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-ink-500">{t("profile.credentialsNote")}</p>
              </section>
            )}
            <LegalDisclaimer />
          </aside>
        </div>
      </article>
    </SiteShell>
  );
}
