import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { COMPANY } from "@/lib/company";
import { RETENTION_DAYS } from "@/server/services/retention";

export const metadata = { title: "Privacy Policy" };

const months = (days: number) => (days >= 60 ? `${Math.round(days / 30.4)} months` : `${days} days`);

// Drafted to cover CCPA/CPRA (notice at collection), PIPEDA, Quebec Law 25 and
// GDPR transparency requirements. Have counsel review before launch.
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" current="/privacy">
      <p>
        This policy explains how {COMPANY.name} (“we”) collects, uses and protects personal information when you use GetTradePros.
        It is also our notice at collection under the California Consumer Privacy Act.
      </p>

      <h2>1. Who is responsible</h2>
      <p>
        {COMPANY.name}, {COMPANY.address}. Our {COMPANY.privacyOfficer} is accountable for personal information and can be reached at{" "}
        <a href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a>.
      </p>

      <h2>2. What we collect and why</h2>
      <div className="overflow-x-auto">
        <table>
          <thead><tr><th>Information</th><th>Source</th><th>Purpose</th><th>CCPA category</th></tr></thead>
          <tbody>
            <tr><td>Name, email, password (stored as a one-way hash)</td><td>You</td><td>Create and secure your account</td><td>Identifiers</td></tr>
            <tr><td>Optional phone number and address on your account</td><td>You</td><td>Pre-fill your quote requests; you can change or remove them any time</td><td>Identifiers</td></tr>
            <tr><td>Business details: name, phone, postal code, rates, photos, licences and insurance documents</td><td>Businesses</td><td>Publish the listing; verify credentials</td><td>Identifiers; professional information</td></tr>
            <tr><td>Business name, trade, phone, address and website of businesses that haven’t joined</td><td>Publicly available business directories</td><td>Show an “unclaimed” listing so customers can find local trades; the business can claim or remove it</td><td>Identifiers; professional information</td></tr>
            <tr><td>Business location (derived from the postal code)</td><td>Postal-code lookup</td><td>Show listings to nearby customers</td><td>Geolocation (approximate)</td></tr>
            <tr><td>Customer email and name entered by a business to request a review</td><td>The business</td><td>Send one review invitation</td><td>Identifiers</td></tr>
            <tr><td>Quote requests: your name, phone, address, optional email, the job description and when to contact you</td><td>You</td><td>Pass your request to the business you chose (or, if it hasn’t joined yet, have our team pass it on by phone)</td><td>Identifiers; commercial information</td></tr>
            <tr><td>Listing claims: name, role, phone and notes from someone claiming a business, plus a company registration document and a government photo ID</td><td>You</td><td>Verify that you own or represent the business before giving you control of its listing</td><td>Identifiers; professional information; government identification (sensitive)</td></tr>
            <tr><td>Reviews, ratings and reports</td><td>You</td><td>Publish reviews; moderate abuse</td><td>Commercial information</td></tr>
            <tr><td>Visit counts: which page was viewed, and a count of daily visitors. No cookies are used; your connection and browser are turned into a one-way code with a key that changes every day and is then deleted, so only daily totals are kept</td><td>Your use of the site</td><td>Understand how many people use the site (aggregate statistics only)</td><td>Internet activity (de-identified)</td></tr>
            <tr><td>Searches, call-button clicks</td><td>Your use of the site</td><td>Show results; give businesses aggregate stats; improve the service</td><td>Internet activity</td></tr>
            <tr><td>Network address (stored only as a one-way hash), country from your connection</td><td>Your browser</td><td>Security, rate limiting, showing listings for your country</td><td>Internet activity; approximate location</td></tr>
            <tr><td>Language, currency and country preferences; cookie choices</td><td>You</td><td>Remember your settings</td><td>Internet activity</td></tr>
          </tbody>
        </table>
      </div>
      <p>
        The only sensitive personal information we collect is the photo ID you upload when claiming a business listing. We use it
        solely to confirm that you represent the business, never to infer anything about you. It is encrypted, only our verification
        team can open it, and it is deleted as soon as your claim has been approved or rejected. The service is not directed to children under 16.
      </p>

      <h2>3. Legal bases and consent</h2>
      <p>
        We process information to provide the service you asked for (contract), to keep it secure and prevent abuse (legitimate interests
        and legal obligations), and, for non-essential cookies and marketing email, only with your consent, which you can withdraw at any time.
      </p>

      <h2>4. Who we share it with</h2>
      <ul>
        <li><strong>The public:</strong> business listings and published reviews (with the display name you chose).</li>
        <li><strong>Unclaimed listings:</strong> some listings were compiled from publicly available business directories and are marked
          “Unclaimed”. Owners can claim them or ask us to remove them at <a href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a>;
          we remove listings on request.</li>
        <li><strong>The business you ask for a quote:</strong> the details you enter in its quote form, only with your consent and only
          for that request. Businesses may not use them for marketing.</li>
        <li><strong>Service providers</strong> under contract, only to run the service: cloud hosting and databases, email delivery, and a
          postal-code lookup service (which receives only a business postal code). They may not use the data for their own purposes.</li>
        <li><strong>Advertising partners:</strong> only if you accept advertising cookies. See <Link href="/legal/privacy-choices">Do Not Sell or Share</Link>.</li>
        <li><strong>Authorities:</strong> when required by law, or to protect people’s safety or our rights.</li>
      </ul>
      <p><strong>We do not sell personal information.</strong></p>

      <h2>5. How long we keep it</h2>
      <div className="overflow-x-auto">
        <table>
          <thead><tr><th>Data</th><th>Kept for</th></tr></thead>
          <tbody>
            <tr><td>Account and listing data</td><td>Until you delete your account</td></tr>
            <tr><td>Deleted accounts</td><td>Personal details erased immediately; the de-identified record is removed after {months(RETENTION_DAYS.deletedAccounts)}</td></tr>
            <tr><td>Search history (not linked to your account)</td><td>{months(RETENTION_DAYS.searchQueries)}</td></tr>
            <tr><td>Quote requests</td><td>{months(RETENTION_DAYS.quoteRequests)}, or until you delete your account</td></tr>
            <tr><td>Claim documents (company registration, photo ID)</td><td>Deleted as soon as we approve or reject the claim</td></tr>
            <tr><td>Listing claims</td><td>{months(RETENTION_DAYS.decidedClaims)} after we decide them</td></tr>
            <tr><td>Cookie consent records (your choice, policy version and time, linked to a random id)</td><td>{months(RETENTION_DAYS.consentRecords)}</td></tr>
            <tr><td>Call-button click statistics</td><td>{months(RETENTION_DAYS.callEvents)}</td></tr>
            <tr><td>Security and admin audit logs</td><td>{months(RETENTION_DAYS.auditLogs)}</td></tr>
            <tr><td>Unused review links</td><td>{months(RETENTION_DAYS.expiredReviewLinks)} after they expire</td></tr>
            <tr><td>Unconfirmed newsletter sign-ups</td><td>{months(RETENTION_DAYS.unconfirmedNewsletter)}</td></tr>
            <tr><td>Email unsubscribe list</td><td>Indefinitely, so we never email you again</td></tr>
          </tbody>
        </table>
      </div>

      <h2>6. Where it is stored</h2>
      <p>
        Your information is stored with our cloud providers and may be processed in the United States and Canada. Cross-border transfers
        are protected by contract, and we assess them as required by Quebec Law 25.
      </p>

      <h2>7. Security</h2>
      <p>We use administrative, technical and physical safeguards appropriate to the sensitivity of the information. See <Link href="/legal/security">Security</Link>.</p>

      <h2>8. Cookies and email</h2>
      <p>
        See the <Link href="/legal/cookies">Cookie Policy</Link>. Non-essential cookies are off until you opt in, and we honour Global
        Privacy Control. Marketing email requires confirmed opt-in, and every non-essential email has a one-click unsubscribe link.
      </p>

      <h2>9. Your rights</h2>
      <p>Access, correction, deletion, portability, opting out of sale or sharing, and withdrawing consent. See <Link href="/legal/privacy-rights">Your Privacy Rights</Link>.</p>

      <h2>10. Changes</h2>
      <p>We will post updates here and change the date above. Material changes are announced before they take effect.</p>
    </LegalPage>
  );
}
