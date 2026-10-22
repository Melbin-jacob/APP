// Who operates the site. Shown in the legal pages, the footer and in every
// commercial email (CAN-SPAM and CASL both require a physical mailing
// address and a way to reach the sender). Set these per deployment.
export const COMPANY = {
  name: process.env.LEGAL_ENTITY_NAME ?? "HomeServices Direct Inc.",
  address: process.env.LEGAL_ADDRESS ?? "[Registered mailing address — set LEGAL_ADDRESS]",
  privacyEmail: process.env.PRIVACY_EMAIL ?? "privacy@homeservices.direct",
  securityEmail: process.env.SECURITY_EMAIL ?? "security@homeservices.direct",
  supportEmail: process.env.SUPPORT_EMAIL ?? "support@homeservices.direct",
  // Quebec Law 25 / PIPEDA: the person accountable for personal information.
  privacyOfficer: process.env.PRIVACY_OFFICER ?? "Privacy Officer",
  jurisdiction: process.env.LEGAL_JURISDICTION ?? "[Governing law — set LEGAL_JURISDICTION]",
};
