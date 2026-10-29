import { z } from "zod";
import { COMPANY } from "@/lib/company";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { PHONE_PATTERN } from "@/lib/quotes";
import { plainText } from "@/lib/sanitize";
import { audit } from "@/server/audit";
import { invalidatePrincipal } from "@/server/auth";
import { claimDecisionEmail, claimReceivedEmail } from "@/server/email/templates";
import { sendEmail } from "@/server/email/transport";
import { ApiError, conflict, notFound } from "@/server/http";
import { type ProcessedDocument, sealDocument } from "./claim-documents";
import { invalidateTrader } from "./traders";

export const claimInput = z.object({
  contactName: z.string().trim().min(2).max(80),
  jobTitle: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(PHONE_PATTERN, "Enter a valid phone number"),
  message: z.string().trim().max(1000).optional(),
  authorised: z.literal(true),
});

type Claimant = { id: string; email: string; role: string };

/** Why this user can't claim this listing right now, or null if they can. */
export async function claimBlocker(traderId: string, userId: string, role: string) {
  if (role === "ADMIN" || role === "SUPER_ADMIN") return "admin" as const;
  const [owned, existing] = await Promise.all([
    db.traderProfile.findUnique({ where: { userId }, select: { id: true } }),
    db.listingClaim.findUnique({ where: { traderId_userId: { traderId, userId } }, select: { status: true } }),
  ]);
  if (owned) return owned.id === traderId ? ("owner" as const) : ("hasBusiness" as const);
  if (existing?.status === "PENDING") return "pending" as const;
  if (existing?.status === "REJECTED") return "rejected" as const;
  return null;
}

export type ClaimDocuments = { REGISTRATION: ProcessedDocument; ID_PROOF: ProcessedDocument };

export async function submitClaim(slug: string, user: Claimant, input: z.infer<typeof claimInput>, documents: ClaimDocuments, ipHash: string) {
  const trader = await db.traderProfile.findFirst({
    where: { slug, status: "APPROVED" },
    select: { id: true, businessName: true, userId: true, phone: true },
  });
  if (!trader) throw notFound("Business");
  if (trader.userId) throw conflict("This listing is already managed by its business");
  const blocker = await claimBlocker(trader.id, user.id, user.role);
  if (blocker) {
    const messages = {
      admin: "Staff accounts can't claim listings",
      owner: "You already manage this listing",
      hasBusiness: "Your account already manages a business. Contact support to manage another one",
      pending: "We're already reviewing your claim for this listing",
      rejected: `We've already reviewed your claim for this listing. Contact ${COMPANY.supportEmail} for help`,
    } as const;
    throw new ApiError(409, `claim_${blocker}`, messages[blocker]);
  }

  const { APP_URL } = env();
  const data = {
    contactName: plainText(input.contactName, 80),
    jobTitle: plainText(input.jobTitle, 80),
    phone: input.phone,
    message: input.message ? plainText(input.message, 1000) || null : null,
  };
  const claim = await db.listingClaim.create({
    data: {
      ...data, traderId: trader.id, userId: user.id,
      documents: { create: (["REGISTRATION", "ID_PROOF"] as const).map((kind) => ({ kind, ...sealDocument(documents[kind]) })) },
    },
    select: { id: true },
  });
  await audit({ actorId: user.id, action: "listing.claim.submit", entityType: "TraderProfile", entityId: trader.id, ipHash });

  await sendEmail({
    to: COMPANY.supportEmail,
    ...claimReceivedEmail({
      businessName: trader.businessName, claimant: data.contactName, email: user.email, phone: data.phone,
      jobTitle: data.jobTitle, message: data.message, listingPhone: trader.phone, adminUrl: `${APP_URL}/admin/claims`, hasDocuments: true,
    }),
    tag: "listing_claim",
  }).catch((err) => console.error("[claims] ops email failed", err));
  return claim;
}

/**
 * Deletes the proof documents of decided claims, recording which kinds were
 * on file. Run in the decision transaction, so once a claim is approved or
 * rejected its ID and registration papers are gone.
 */
async function purgeDocuments(tx: Pick<typeof db, "claimDocument" | "listingClaim">, claimIds: string[], now: Date) {
  if (claimIds.length === 0) return;
  const docs = await tx.claimDocument.findMany({ where: { claimId: { in: claimIds } }, select: { claimId: true, kind: true } });
  for (const id of claimIds) {
    const kinds = docs.filter((d) => d.claimId === id).map((d) => d.kind).sort();
    await tx.listingClaim.update({ where: { id }, data: { documentsChecked: kinds.join(",") || null, documentsDeletedAt: now } });
  }
  await tx.claimDocument.deleteMany({ where: { claimId: { in: claimIds } } });
}

/**
 * Approve: attach the listing to the claimant's account (making them a
 * business user) and turn down any other pending claims for it. Reject: just
 * record it. Either way the proof documents are deleted and the claimant is
 * emailed.
 */
export async function decideClaim(claimId: string, decision: "APPROVE" | "REJECT", actorId: string, note?: string) {
  const claim = await db.listingClaim.findUnique({
    where: { id: claimId },
    include: { trader: { select: { id: true, slug: true, businessName: true, userId: true } }, user: { select: { id: true, email: true, role: true, status: true } } },
  });
  if (!claim) throw notFound("Claim");
  if (claim.status !== "PENDING") throw conflict("This claim has already been decided");
  const now = new Date();
  const { APP_URL } = env();

  if (decision === "APPROVE") {
    if (claim.trader.userId) throw conflict("This listing already has an owner");
    if (claim.user.status !== "ACTIVE") throw conflict("The claimant's account isn't active");
    if (claim.user.role === "ADMIN" || claim.user.role === "SUPER_ADMIN") throw conflict("Staff accounts can't own listings");
    if (await db.traderProfile.findUnique({ where: { userId: claim.userId }, select: { id: true } })) {
      throw conflict("The claimant already manages another business");
    }
    if ((await db.claimDocument.count({ where: { claimId: claim.id } })) < 2) {
      throw conflict("This claim doesn't have both documents (registration and photo ID), so it can't be approved");
    }
    await db.$transaction(async (tx) => {
      // Conditional update: fails if someone else got the listing in the meantime.
      const taken = await tx.traderProfile.updateMany({ where: { id: claim.traderId, userId: null }, data: { userId: claim.userId } });
      if (taken.count !== 1) throw conflict("This listing already has an owner");
      await tx.user.update({ where: { id: claim.userId }, data: { role: "TRADER" } });
      await tx.listingClaim.update({ where: { id: claim.id }, data: { status: "APPROVED", decidedAt: now, decidedById: actorId } });
      const others = await tx.listingClaim.findMany({ where: { traderId: claim.traderId, status: "PENDING", id: { not: claim.id } }, select: { id: true } });
      await tx.listingClaim.updateMany({
        where: { id: { in: others.map((o) => o.id) } },
        data: { status: "REJECTED", decidedAt: now, decidedById: actorId },
      });
      await purgeDocuments(tx, [claim.id, ...others.map((o) => o.id)], now);
      await audit({ actorId, action: "listing.claim.approve", entityType: "TraderProfile", entityId: claim.traderId, metadata: { claimId, userId: claim.userId } }, tx);
    });
    await Promise.all([invalidatePrincipal(claim.userId), invalidateTrader(claim.trader.slug)]);
  } else {
    await db.$transaction(async (tx) => {
      await tx.listingClaim.update({ where: { id: claim.id }, data: { status: "REJECTED", decidedAt: now, decidedById: actorId } });
      await purgeDocuments(tx, [claim.id], now);
      await audit({ actorId, action: "listing.claim.reject", entityType: "TraderProfile", entityId: claim.traderId, metadata: { claimId, note: note ?? null } }, tx);
    });
  }

  await sendEmail({
    to: claim.user.email,
    ...claimDecisionEmail({ businessName: claim.trader.businessName, approved: decision === "APPROVE", dashboardUrl: `${APP_URL}/dashboard`, note }),
    tag: "listing_claim_decision",
  }).catch((err) => console.error("[claims] decision email failed", err));
}
