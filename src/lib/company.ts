// Who operates the site. Shown in the legal pages, the footer and in every
// commercial email (CAN-SPAM and CASL both require a physical mailing
// address and a way to reach the sender). Set these per deployment.
export const COMPANY = {
  name: process.env.LEGAL_ENTITY_NAME ?? "GetTradePros Inc.",
  address: process.env.LEGAL_ADDRESS ?? "[Registered mailing address — set LEGAL_ADDRESS]",
  privacyEmail: process.env.PRIVACY_EMAIL ?? "privacy@gettradepros.com",
  securityEmail: process.env.SECURITY_EMAIL ?? "security@gettradepros.com",
  supportEmail: process.env.SUPPORT_EMAIL ?? "support@gettradepros.com",
  // DMCA designated agent (17 U.S.C. § 512(c)(2)). Must match the agent
  // registered at https://dmca.copyright.gov (renew every 3 years).
  dmcaAgent: {
    name: process.env.DMCA_AGENT_NAME ?? "[Designated agent — register at dmca.copyright.gov and set DMCA_AGENT_NAME]",
    email: process.env.COPYRIGHT_EMAIL ?? "copyright@gettradepros.com",
    phone: process.env.DMCA_AGENT_PHONE ?? "",
    address: process.env.DMCA_AGENT_ADDRESS ?? process.env.LEGAL_ADDRESS ?? "[Agent mailing address — set DMCA_AGENT_ADDRESS]",
  },
  // Contact page. Left as placeholders until set; the page shows "Coming soon".
  phone: process.env.CONTACT_PHONE ?? "[Phone — set CONTACT_PHONE]",
  hours: process.env.CONTACT_HOURS ?? "[Office hours — set CONTACT_HOURS]",
  // Quebec Law 25 / PIPEDA: the person accountable for personal information.
  privacyOfficer: process.env.PRIVACY_OFFICER ?? "Privacy Officer",
  jurisdiction: process.env.LEGAL_JURISDICTION ?? "[Governing law — set LEGAL_JURISDICTION]",
};

/** True for a value still at its "[… — set X]" placeholder. */
export const isPlaceholder = (value: string) => value.startsWith("[");
