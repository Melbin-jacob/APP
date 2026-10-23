import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { hashToken, randomToken } from "@/lib/crypto";
import { plainText } from "@/lib/sanitize";
import { audit } from "../audit";
import { reviewRequestEmail } from "../email/templates";
import { sendEmail } from "../email/transport";
import { ApiError, conflict, notFound } from "../http";
import { getSetting } from "../settings";
import { invalidate } from "@/lib/redis";
import { isOptedOut, unsubscribeLinks } from "./email-prefs";

export const reviewRequestInput = z.object({
  customerEmail: z.string().trim().toLowerCase().email().max(254),
  customerName: z.string().trim().max(80).optional(),
  jobId: z.string().cuid().optional(),
});

export const reviewSubmitInput = z.object({
  token: z.string().min(40).max(64).regex(/^[A-Za-z0-9_-]+$/),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
  authorName: z.string().trim().min(1).max(60),
});

const RESEND_COOLDOWN_DAYS = 30;

/**
 * Step 1+2 of the post-job workflow: create a single-use token and email it.
 * Called when a trader completes a job or asks a customer for a review directly.
 */
export async function createReviewRequest(
  traderId: string,
  input: z.infer<typeof reviewRequestInput>,
  actorId: string,
) {
  const { APP_URL, REVIEW_TOKEN_PEPPER, REVIEW_TOKEN_TTL_DAYS } = env();

  const trader = await db.traderProfile.findUnique({
    where: { id: traderId },
    select: { id: true, businessName: true, status: true, user: { select: { email: true } } },
  });
  if (!trader) throw notFound("Trader");
  if (trader.status !== "APPROVED") throw new ApiError(403, "trader_not_approved", "Your profile must be approved first");
  if (trader.user?.email.toLowerCase() === input.customerEmail) throw conflict("You can't review your own business");

  // One live request per customer per trader per cooldown window — stops a
  // trader from carpet-bombing a customer or farming reviews via aliases.
  // Customers who unsubscribed from review requests are never emailed again.
  if (await isOptedOut(input.customerEmail, "REVIEW_REQUESTS")) {
    throw new ApiError(409, "customer_opted_out", "This customer has opted out of review requests");
  }

  const recent = await db.reviewRequest.findFirst({
    where: {
      traderId,
      customerEmail: input.customerEmail,
      createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_DAYS * 86_400_000) },
      status: { in: ["PENDING", "SENT", "USED"] },
    },
  });
  if (recent) throw conflict("A review was already requested from this customer recently");

  const token = randomToken();
  const expiresAt = new Date(Date.now() + REVIEW_TOKEN_TTL_DAYS * 86_400_000);

  const request = await db.$transaction(async (tx) => {
    if (input.jobId) {
      const job = await tx.job.findFirst({ where: { id: input.jobId, traderId } });
      if (!job) throw notFound("Job");
    }
    const created = await tx.reviewRequest.create({
      data: {
        traderId,
        jobId: input.jobId,
        customerEmail: input.customerEmail,
        customerName: input.customerName ? plainText(input.customerName, 80) : null,
        tokenHash: hashToken(token, REVIEW_TOKEN_PEPPER),
        expiresAt,
      },
    });
    await audit({ actorId, action: "review_request.create", entityType: "ReviewRequest", entityId: created.id }, tx);
    return created;
  });

  const reviewUrl = `${APP_URL}/review?token=${encodeURIComponent(token)}`;
  const unsubscribe = unsubscribeLinks(input.customerEmail, "REVIEW_REQUESTS");
  const mail = reviewRequestEmail({
    businessName: trader.businessName,
    customerName: request.customerName,
    reviewUrl,
    formAction: `${APP_URL}/api/reviews/email`,
    token,
    expiresAt,
    unsubscribeUrl: unsubscribe.url,
  });
  try {
    await sendEmail({ to: input.customerEmail, ...mail, tag: "review_request", unsubscribe });
  } catch (err) {
    // Revoke so the cooldown check above doesn't block a retry for 30 days.
    await db.reviewRequest.update({ where: { id: request.id }, data: { status: "REVOKED" } });
    throw err;
  }
  await db.reviewRequest.update({ where: { id: request.id }, data: { status: "SENT", sentAt: new Date() } });

  return { id: request.id, expiresAt };
}

/** Trader marks a job complete → review request goes out automatically. */
export async function completeJob(traderId: string, jobId: string, actorId: string) {
  const job = await db.job.findFirst({ where: { id: jobId, traderId } });
  if (!job) throw notFound("Job");
  if (job.status === "COMPLETED") throw conflict("Job already completed");
  await db.job.update({ where: { id: jobId }, data: { status: "COMPLETED", completedAt: new Date() } });
  return createReviewRequest(
    traderId,
    { customerEmail: job.customerEmail, customerName: job.customerName ?? undefined, jobId },
    actorId,
  );
}

/** Validates a token for the review page without consuming it. */
export async function resolveReviewToken(token: string) {
  const parsed = reviewSubmitInput.shape.token.safeParse(token);
  if (!parsed.success) return null;
  const request = await db.reviewRequest.findUnique({
    where: { tokenHash: hashToken(token, env().REVIEW_TOKEN_PEPPER) },
    include: { trader: { select: { businessName: true, slug: true, logoUrl: true } } },
  });
  if (!request || request.usedAt || !["PENDING", "SENT"].includes(request.status)) return null;
  if (request.expiresAt < new Date()) {
    await db.reviewRequest.update({ where: { id: request.id }, data: { status: "EXPIRED" } });
    return null;
  }
  return request;
}

const LINK_RE = /(https?:\/\/|www\.)\S+/i;

/** Cheap spam signals; anything tripped goes to the moderation queue instead of live. */
export function looksSpammy(comment: string): boolean {
  if (LINK_RE.test(comment)) return true;
  if (/(.)\1{7,}/.test(comment)) return true;
  const letters = comment.replace(/[^a-z]/gi, "");
  return letters.length > 20 && letters === letters.toUpperCase();
}

/** Step 3: consume the token exactly once, store a verified review, refresh aggregates. */
export async function submitReview(input: z.infer<typeof reviewSubmitInput>, ipHash: string) {
  const tokenHash = hashToken(input.token, env().REVIEW_TOKEN_PEPPER);
  const comment = input.comment ? plainText(input.comment, 2000) : null;
  const authorName = plainText(input.authorName, 60) || "Verified customer";
  const autoPublish = await getSetting("reviews.autoPublish");
  const status = !autoPublish || (comment && looksSpammy(comment)) ? "PENDING_MODERATION" : "PUBLISHED";

  const review = await db.$transaction(
    async (tx) => {
      const request = await tx.reviewRequest.findUnique({ where: { tokenHash } });
      if (!request) throw new ApiError(410, "token_invalid", "This review link is invalid or has already been used");

      // Atomic claim: the conditional update succeeds for exactly one caller
      // even if the link is submitted twice concurrently.
      const claimed = await tx.reviewRequest.updateMany({
        where: { id: request.id, usedAt: null, status: { in: ["PENDING", "SENT"] }, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date(), status: "USED" },
      });
      if (claimed.count !== 1) throw new ApiError(410, "token_invalid", "This review link is invalid or has already been used");

      const customer = await tx.user.findUnique({ where: { email: request.customerEmail }, select: { id: true } });
      const created = await tx.review.create({
        data: {
          traderId: request.traderId,
          reviewRequestId: request.id,
          authorId: customer?.id,
          authorName,
          rating: input.rating,
          comment,
          status,
          isVerified: true,
          publishedAt: status === "PUBLISHED" ? new Date() : null,
        },
      });
      await recomputeTraderRating(request.traderId, tx);
      await audit({ action: "review.submit", entityType: "Review", entityId: created.id, ipHash, metadata: { status } }, tx);
      return created;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
  );

  return { id: review.id, status: review.status };
}

export async function recomputeTraderRating(traderId: string, tx: Prisma.TransactionClient = db) {
  const agg = await tx.review.aggregate({
    where: { traderId, status: "PUBLISHED" },
    _avg: { rating: true },
    _count: true,
  });
  const trader = await tx.traderProfile.update({
    where: { id: traderId },
    data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count },
    select: { slug: true },
  });
  await invalidate(`trader:${trader.slug}`);
}
