// Bump TOS_VERSION whenever the Terms change; users on an older version are
// asked to re-accept before they can continue (see requireCurrentTerms in
// server/auth.ts and /legal/accept-terms).
export const TOS_VERSION = "2026-10-01";

// Bump when the Cookie Policy changes; consent records store the version agreed to.
export const COOKIE_POLICY_VERSION = "2026-10-01";

/** Shown as "Last updated" on every legal page. */
export const LEGAL_UPDATED = "October 22, 2026";

export const LIABILITY_DISCLAIMER =
  "This platform acts solely as a directory/marketplace connecting users with independent contractors. " +
  "The platform holds zero liability, warranty, or obligation regarding the quality, safety, legality, or outcome of work performed. " +
  "All contracts and disputes are strictly between the Customer and the Service Provider.";

export const PROFILE_DISCLAIMER_SHORT =
  "Independent contractor. GetTradePros is a directory only and is not party to any agreement or work performed.";
