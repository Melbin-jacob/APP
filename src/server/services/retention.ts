import { db } from "@/lib/db";

// Storage limitation (GDPR Art. 5(1)(e), CCPA/CPRA, PIPEDA principle 4.5,
// Quebec Law 25 s.23). These periods are published in the Privacy Policy;
// change both together.
export const RETENTION_DAYS = {
  searchQueries: 395, // ~13 months of search analytics
  callEvents: 730, // 24 months of click-to-call stats for businesses
  quoteRequests: 730, // 24 months: the business's record of who asked for what
  decidedClaims: 730, // listing claims, 24 months after the decision
  consentRecords: 730, // proof of cookie consent (the cookie itself lasts 6 months)
  closedIncidents: 1095, // breach register: PIPEDA requires 24 months; we keep 36
  auditLogs: 730, // 24 months of security / admin audit trail
  expiredReviewLinks: 90, // unused review links, after they expire
  unconfirmedNewsletter: 30, // sign-ups never confirmed by email
  deletedAccounts: 30, // de-identified account shells, then hard-deleted
} as const;

const ago = (days: number) => new Date(Date.now() - days * 86_400_000);

/** Deletes data past its retention period. Safe to run repeatedly. */
export async function applyRetention() {
  const now = new Date();
  const [searches, calls, audits, tokens, links, newsletter, accounts, quotes, claims, consents, incidents] = await db.$transaction([
    db.searchQuery.deleteMany({ where: { createdAt: { lt: ago(RETENTION_DAYS.searchQueries) } } }),
    db.callEvent.deleteMany({ where: { createdAt: { lt: ago(RETENTION_DAYS.callEvents) } } }),
    db.auditLog.deleteMany({ where: { createdAt: { lt: ago(RETENTION_DAYS.auditLogs) } } }),
    db.verificationToken.deleteMany({ where: { expires: { lt: now } } }),
    db.reviewRequest.deleteMany({
      where: { usedAt: null, review: null, expiresAt: { lt: ago(RETENTION_DAYS.expiredReviewLinks) } },
    }),
    db.newsletterSubscriber.deleteMany({
      where: { confirmedAt: null, createdAt: { lt: ago(RETENTION_DAYS.unconfirmedNewsletter) } },
    }),
    db.user.deleteMany({ where: { status: "PENDING_DELETION", deletedAt: { lt: ago(RETENTION_DAYS.deletedAccounts) } } }),
    db.quoteRequest.deleteMany({ where: { createdAt: { lt: ago(RETENTION_DAYS.quoteRequests) } } }),
    db.listingClaim.deleteMany({ where: { status: { not: "PENDING" }, decidedAt: { lt: ago(RETENTION_DAYS.decidedClaims) } } }),
    db.consentRecord.deleteMany({ where: { createdAt: { lt: ago(RETENTION_DAYS.consentRecords) } } }),
    db.securityIncident.deleteMany({ where: { status: "CLOSED", updatedAt: { lt: ago(RETENTION_DAYS.closedIncidents) } } }),
  ]);
  return {
    searchQueries: searches.count, callEvents: calls.count, auditLogs: audits.count, verificationTokens: tokens.count,
    reviewLinks: links.count, unconfirmedNewsletter: newsletter.count, deletedAccounts: accounts.count,
    quoteRequests: quotes.count, decidedClaims: claims.count, consentRecords: consents.count, closedIncidents: incidents.count,
  };
}
