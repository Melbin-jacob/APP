import Link from "next/link";
import { LEGAL_DOCS, LegalPage } from "@/components/legal/LegalPage";
import { COMPANY } from "@/lib/company";

export const metadata = { title: "Legal centre" };

const SUMMARIES: Record<string, string> = {
  "/terms": "The rules for using GetTradePros, including that we are a directory and not a party to any work.",
  "/privacy": "What personal information we collect, why, who we share it with, how long we keep it and your rights.",
  "/legal/cookies": "Every cookie we set, what it does, and how to change your choices.",
  "/legal/privacy-choices": "Opt out of the sale or sharing of personal information for targeted advertising.",
  "/legal/privacy-rights": "How to access, correct, export or delete your data, and how to appeal or complain.",
  "/legal/disclaimer": "The limits of our responsibility for work arranged through the directory.",
  "/legal/accessibility": "Our accessibility commitment and how to report a barrier.",
  "/legal/security": "How we protect the platform and how to report a security vulnerability.",
  "/legal/copyright": "How to report copyright infringement, send a counter-notice, and our repeat-infringer policy.",
};

export default function LegalCentre() {
  return (
    <LegalPage title="Legal centre" current="/legal">
      <p>
        {COMPANY.name} operates GetTradePros, a directory connecting customers with independent home-service professionals
        in the United States and Canada. This page collects our legal documents and compliance information.
      </p>
      <ul className="!list-none !ps-0 grid gap-3 sm:grid-cols-2">
        {LEGAL_DOCS.filter((d) => d.href !== "/legal").map((d) => (
          <li key={d.href} className="rounded-md border border-ink-200 p-4">
            <Link href={d.href} className="font-semibold">{d.title}</Link>
            <p className="mt-1 text-xs text-ink-500">{SUMMARIES[d.href]}</p>
          </li>
        ))}
      </ul>

      <h2>Laws and standards we design for</h2>
      <table>
        <thead><tr><th>Area</th><th>Framework</th><th>How we address it</th></tr></thead>
        <tbody>
          <tr><td>Privacy (US)</td><td>CCPA/CPRA (California) and similar state laws (e.g. Virginia, Colorado, Connecticut)</td><td>Privacy notice, “Do Not Sell or Share” opt-out, Global Privacy Control honoured, access/deletion/correction requests, no sale of personal information</td></tr>
          <tr><td>Privacy (Canada)</td><td>PIPEDA; Quebec Law 25</td><td>Consent before non-essential cookies, designated privacy officer, retention limits, access and correction rights, breach response</td></tr>
          <tr><td>Privacy (visitors from the EU/UK)</td><td>GDPR / UK GDPR</td><td>Lawful bases, data minimisation, export and erasure, storage limitation</td></tr>
          <tr><td>Email</td><td>CAN-SPAM (US), CASL (Canada)</td><td>Double opt-in for newsletters, one-click unsubscribe on non-essential email, sender identity and mailing address in every message</td></tr>
          <tr><td>Children</td><td>COPPA (US)</td><td>Accounts are for adults (18+); a neutral date-of-birth check at sign-up; under-age sign-ups are refused and nothing is kept</td></tr>
          <tr><td>Copyright</td><td>DMCA § 512 (US); Copyright Act (Canada)</td><td>Designated agent, notice-and-takedown, counter-notices and a repeat-infringer policy: see our <Link href="/legal/copyright">Copyright &amp; DMCA Policy</Link></td></tr>
          <tr><td>Third-party requests</td><td>Court rulings on embedded third-party resources (e.g. LG München, 2022)</td><td>Fonts, images and scripts are served from our own domain; advertising code loads only after consent, in a sandbox</td></tr>
          <tr><td>Accessibility</td><td>ADA (US), AODA (Ontario), WCAG 2.1 AA</td><td>Accessibility statement and barrier reporting; ongoing conformance work</td></tr>
          <tr><td>Security</td><td>OWASP Top 10, OWASP ASVS (guidance)</td><td>See our <Link href="/legal/security">Security page</Link></td></tr>
        </tbody>
      </table>

      <h2>Contact</h2>
      <ul>
        <li>Privacy questions and requests: <a href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a> ({COMPANY.privacyOfficer})</li>
        <li>Security reports: <a href={`mailto:${COMPANY.securityEmail}`}>{COMPANY.securityEmail}</a></li>
        <li>Copyright notices: <a href={`mailto:${COMPANY.dmcaAgent.email}`}>{COMPANY.dmcaAgent.email}</a> (<Link href="/legal/copyright">how to send one</Link>)</li>
        <li>General support: <a href={`mailto:${COMPANY.supportEmail}`}>{COMPANY.supportEmail}</a></li>
        <li>Mail: {COMPANY.name}, {COMPANY.address}</li>
      </ul>
    </LegalPage>
  );
}
