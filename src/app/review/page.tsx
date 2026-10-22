import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/layout/SiteHeader";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { resolveReviewToken } from "@/server/services/reviews";

// The token is in the URL: never leak it via Referer, never index the page.
export const metadata: Metadata = { title: "Leave a review", referrer: "no-referrer", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ token?: string; rating?: string }> };

// Opening this page does NOT consume the token (email security scanners
// pre-fetch links); only the POST from the form does.
export default async function ReviewPage({ searchParams }: Props) {
  const { token = "", rating } = await searchParams;
  const request = await resolveReviewToken(token);
  const preset = Number(rating);

  return (
    <div className="min-h-screen bg-ink-100 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="card p-6 sm:p-8">
          {request ? (
            <>
              <h1 className="text-xl font-bold">How was your service with {request.trader.businessName}?</h1>
              <p className="mt-1 text-sm text-ink-500">Your review will appear on their public profile as a verified customer review.</p>
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
              <h1 className="text-xl font-bold">This review link is no longer valid</h1>
              <p className="mt-2 text-sm text-ink-500">
                Links work once and expire after a couple of weeks. If you still want to leave a review, ask the business to send a new link.
              </p>
              <Link href="/" className="btn-primary mt-6">Go to homepage</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
