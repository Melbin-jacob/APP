import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/layout/SiteShell";
import { LegalDisclaimer } from "@/components/legal/LegalDisclaimer";
import { CallButton } from "@/components/traders/CallButton";
import { ReportReviewButton } from "@/components/traders/ReportReviewButton";
import { Icon } from "@/components/ui/Icon";
import { StarRating } from "@/components/ui/StarRating";
import { formatDate, formatMoney } from "@/lib/format";
import { getPublicTrader } from "@/server/services/catalog";

type Props = { params: Promise<{ slug: string }> };

const DAYS = [["mon", "Monday"], ["tue", "Tuesday"], ["wed", "Wednesday"], ["thu", "Thursday"], ["fri", "Friday"], ["sat", "Saturday"], ["sun", "Sunday"]] as const;
type Hours = Partial<Record<(typeof DAYS)[number][0], { open: string; close: string }[]>>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getPublicTrader((await params).slug);
  return t ? { title: `${t.businessName} — ${t.city}`, description: t.bio?.slice(0, 155) } : {};
}

export default async function TraderProfilePage({ params }: Props) {
  const t = await getPublicTrader((await params).slug);
  if (!t) notFound();
  const primary = t.categories.find((c) => c.isPrimary)?.category ?? t.categories[0]?.category;
  const rate = formatMoney(t.hourlyRatePence, t.currency);
  const hours = (t.operatingHours ?? {}) as Hours;

  return (
    <SiteShell>
      <article className="py-8">
        <header className="card overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {t.coverImageUrl && <img src={t.coverImageUrl} alt="" className="h-48 w-full object-cover sm:h-64" />}
          <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {t.logoUrl && <img src={t.logoUrl} alt={`${t.businessName} logo`} className="h-20 w-20 rounded-lg border border-ink-200 object-cover" />}
            <div className="flex-1">
              {primary && <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">{primary.name}</span>}
              <h1 className="text-2xl font-bold">{t.businessName}</h1>
              <p className="mt-1 flex items-center gap-1 text-sm text-ink-500">
                <Icon name="pin" className="h-4 w-4" /> {t.city}, {t.postcode} · serves within {t.serviceRadiusKm} km
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <StarRating value={t.ratingAvg} count={t.ratingCount} size="md" />
                {t.verifiedAt && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                    <Icon name="check" className="h-3 w-3" /> Profile verified
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              {rate && <p className="text-lg font-semibold">{rate}<span className="text-sm font-normal text-ink-500">/hr</span></p>}
              <CallButton slug={t.slug} className="btn-primary" />
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {t.bio && (
              <section className="card p-6">
                <h2 className="mb-2 font-semibold">About</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-ink-700">{t.bio}</p>
              </section>
            )}
            {t.services.length > 0 && (
              <section className="card p-6">
                <h2 className="mb-3 font-semibold">Services</h2>
                <ul className="divide-y divide-ink-200">
                  {t.services.map((s) => (
                    <li key={s.id} className="flex justify-between gap-4 py-2 text-sm">
                      <span><strong>{s.title}</strong>{s.description && <span className="block text-ink-500">{s.description}</span>}</span>
                      {s.priceFromPence != null && <span className="shrink-0">from {formatMoney(s.priceFromPence, t.currency)}{s.priceUnit && `/${s.priceUnit}`}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {t.gallery.length > 0 && (
              <section className="card p-6">
                <h2 className="mb-3 font-semibold">Work gallery</h2>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {t.gallery.map((g) => (
                    <li key={g.id}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g.url} alt={g.caption ?? "Work example"} className="aspect-square w-full rounded-md object-cover" loading="lazy" />
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section className="card p-6" aria-labelledby="reviews-heading">
              <h2 id="reviews-heading" className="mb-3 font-semibold">Customer reviews</h2>
              {t.reviews.length === 0 && <p className="text-sm text-ink-500">No reviews yet.</p>}
              <ul className="space-y-4">
                {t.reviews.map((r) => (
                  <li key={r.id} className="border-b border-ink-200 pb-4 last:border-0">
                    <div className="flex items-center justify-between">
                      <StarRating value={r.rating} />
                      <span className="text-xs text-ink-500">{formatDate(r.createdAt)}</span>
                    </div>
                    {/* Rendered as text — React escapes it; it was also stripped of markup on write. */}
                    {r.comment && <p className="mt-2 text-sm text-ink-700">{r.comment}</p>}
                    <div className="mt-2 flex items-center justify-between text-xs text-ink-500">
                      <span>
                        {r.authorName}
                        {r.isVerified && <span className="ml-2 rounded bg-brand-50 px-1.5 py-0.5 text-brand-700">Verified customer</span>}
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
              <h2 className="mb-2 font-semibold">Request a quote</h2>
              <p className="mb-4 text-sm text-ink-500">Call {t.businessName} directly to discuss your job and agree a price.</p>
              <CallButton slug={t.slug} className="btn-primary w-full" />
            </section>
            {Object.keys(hours).length > 0 && (
              <section className="card p-6">
                <h2 className="mb-2 font-semibold">Opening hours</h2>
                <dl className="text-sm">
                  {DAYS.map(([k, label]) => (
                    <div key={k} className="flex justify-between py-0.5">
                      <dt className="text-ink-500">{label}</dt>
                      <dd>{hours[k]?.length ? hours[k]!.map((h) => `${h.open}–${h.close}`).join(", ") : "Closed"}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
            {t.credentials.length > 0 && (
              <section className="card p-6">
                <h2 className="mb-2 font-semibold">Verified credentials</h2>
                <ul className="space-y-1 text-sm">
                  {t.credentials.map((c) => (
                    <li key={c.id} className="flex items-start gap-2">
                      <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                      <span>{c.name}{c.issuer && <span className="text-ink-500"> · {c.issuer}</span>}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-ink-500">Checked against documents supplied by the trader at the time of review.</p>
              </section>
            )}
            <LegalDisclaimer />
          </aside>
        </div>
      </article>
    </SiteShell>
  );
}
