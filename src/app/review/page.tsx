import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/layout/SiteShell";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { getI18n } from "@/i18n/server";
import { resolveReviewToken } from "@/server/services/reviews";

// The token is in the URL: never leak it via Referer, never index the page.
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("review.pageTitle"), referrer: "no-referrer", robots: { index: false, follow: false } };
}

type Props = { searchParams: Promise<{ token?: string; rating?: string }> };

// Opening this page does NOT consume the token (email security scanners
// pre-fetch links); only the POST from the form does.
export default async function ReviewPage({ searchParams }: Props) {
  const { token = "", rating } = await searchParams;
  const [request, { t }] = await Promise.all([resolveReviewToken(token), getI18n()]);
  const preset = Number(rating);

  return (
    <SiteShell>
      <div className="mx-auto max-w-lg py-10">
        <div className="card p-6 sm:p-8">
          {request ? (
            <>
              <h1 className="text-xl font-bold">{t("review.title", { name: request.trader.businessName })}</h1>
              <p className="mt-1 text-sm text-ink-500">{t("review.intro")}</p>
              <ReviewForm
                token={token}
                businessName={request.trader.businessName}
                profileHref={`/traders/${request.trader.slug}`}
                defaultName={request.customerName ?? ""}
                defaultRating={preset >= 1 && preset <= 5 ? preset : 0}
              />
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold">{t("review.invalidTitle")}</h1>
              <p className="mt-2 text-sm text-ink-500">{t("review.invalidBody")}</p>
              <Link href="/" className="btn-primary mt-6">{t("review.home")}</Link>
            </>
          )}
        </div>
      </div>
    </SiteShell>
  );
}
