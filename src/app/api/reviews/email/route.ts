import { NextResponse, type NextRequest } from "next/server";
import { ApiError, enforceRateLimit, ipHash, route } from "@/server/http";
import { resolveReviewToken, reviewSubmitInput, submitReview } from "@/server/services/reviews";

const MAX_BODY = 16 * 1024;

// POST /api/reviews/email — the review form inside the invitation email.
// Mail apps submit it as a plain form post from outside our site, so there's
// no Origin to check: the single-use token in the form is the authorisation
// (same as the web form). Always answers with a redirect to a page, since the
// customer sees whatever comes back in their browser.
export const POST = route(async (req: NextRequest) => {
  const back = (path: string) => NextResponse.redirect(new URL(path, req.nextUrl.origin), 303);
  const ip = ipHash(req);
  try {
    await enforceRateLimit("reviewSubmit", ip);
  } catch {
    return back("/review/thanks?status=busy");
  }
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY) return back("/review/thanks?status=error");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return back("/review/thanks?status=error");
  }
  const field = (k: string) => String(form.get(k) ?? "").trim();
  const token = field("token");
  const request = await resolveReviewToken(token);
  if (!request) return back("/review/thanks?status=invalid");

  const parsed = reviewSubmitInput.safeParse({
    token,
    rating: Number(field("rating")),
    comment: field("comment") || undefined,
    authorName: field("authorName") || request.customerName || "Verified customer",
  });
  // No star chosen (or tampered values): open the web form for this invitation instead.
  if (!parsed.success) return back(`/review?token=${encodeURIComponent(token)}&missing=rating`);

  try {
    const result = await submitReview(parsed.data, ip);
    const status = result.status === "PUBLISHED" ? "published" : "pending";
    return back(`/review/thanks?status=${status}&business=${encodeURIComponent(request.trader.slug)}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 410) return back("/review/thanks?status=invalid");
    throw err;
  }
}, { sameOrigin: false });
