import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/layout/SiteShell";
import { db } from "@/lib/db";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("review.thanks"), robots: { index: false, follow: false } };
}

type Props = { searchParams: Promise<{ status?: string; business?: string }> };

// Where the review form inside the invitation email lands after submitting.
export default async function ReviewThanksPage({ searchParams }: Props) {
  const { status = "", business = "" } = await searchParams;
  const { t } = await getI18n();
  const trader = /^[a-z0-9-]{1,80}$/.test(business)
    ? await db.traderProfile.findFirst({ where: { slug: business, status: "APPROVED" }, select: { businessName: true, slug: true } })
    : null;
  const ok = status === "published" || status === "pending";

  return (
    <SiteShell>
      <div className="mx-auto max-w-lg py-12">
        <div className="card p-8 text-center" role="status">
          {ok ? (
            <>
              <p className="text-4xl text-accent-500" aria-hidden="true">★</p>
              <h1 className="mt-2 text-xl font-bold">{t("review.thanks")}</h1>
              <p className="mt-2 text-sm text-ink-500">
                {status === "published" && trader ? t("review.live", { name: trader.businessName }) : t("review.pending")}
              </p>
              {trader && <Link href={`/traders/${trader.slug}`} className="btn-primary mt-6">{t("review.viewProfile")}</Link>}
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold">{status === "invalid" ? t("review.invalidTitle") : t("common.somethingWrong")}</h1>
              <p className="mt-2 text-sm text-ink-500">
                {status === "invalid" ? t("review.invalidBody") : status === "busy" ? t("review.busy") : t("review.error")}
              </p>
              <Link href="/" className="btn-primary mt-6">{t("review.home")}</Link>
            </>
          )}
        </div>
      </div>
    </SiteShell>
  );
}
