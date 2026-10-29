// Who operates the site. Shown in the legal pages, the footer and in every
// commercial email (CAN-SPAM and CASL both require a physical mailing
// address and a way to reach the sender). Set these per deployment.
export const COMPANY = {
  name: process.env.LEGAL_ENTITY_NAME ?? "GetTradePros Inc.",
  address: process.env.LEGAL_ADDRESS ?? "[Registered mailing address — set LEGAL_ADDRESS]",
  privacyEmail: process.env.PRIVACY_EMAIL ?? "privacy@gettradepros.com",
  securityEmail: process.env.SECURITY_EMAIL ?? "security@gettradepros.com",
  supportEmail: process.env.SUPPORT_EMAIL ?? "support@gettradepros.com",
  // Contact page. Left as placeholders until set; the page shows "Coming soon".
  phone: process.env.CONTACT_PHONE ?? "[Phone — set CONTACT_PHONE]",
  hours: process.env.CONTACT_HOURS ?? "[Office hours — set CONTACT_HOURS]",
  // Quebec Law 25 / PIPEDA: the person accountable for personal information.
  privacyOfficer: process.env.PRIVACY_OFFICER ?? "Privacy Officer",
  jurisdiction: process.env.LEGAL_JURISDICTION ?? "[Governing law — set LEGAL_JURISDICTION]",
};

/** True for a value still at its "[… — set X]" placeholder. */
export const isPlaceholder = (value: string) => value.startsWith("[");
