import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { COMPANY } from "@/lib/company";

export const metadata = { title: "Your Privacy Rights" };

export default function PrivacyRights() {
  return (
    <LegalPage title="Your Privacy Rights" current="/legal/privacy-rights">
      <p>Depending on where you live, you have some or all of these rights over your personal information. We extend them to all users.</p>
      <table>
        <thead><tr><th>Right</th><th>How to use it</th></tr></thead>
        <tbody>
          <tr><td>Know and access what we hold</td><td>Signed in: <Link href="/account">Your account → Export my data</Link> (instant JSON download). Otherwise email us.</td></tr>
          <tr><td>Data portability</td><td>The same export is machine-readable JSON.</td></tr>
          <tr><td>Delete your account and data</td><td><Link href="/account">Your account → Delete my account</Link>. Personal details are erased immediately; reviews you wrote stay, de-identified.</td></tr>
          <tr><td>Correct inaccurate information</td><td>Edit it in your account or business dashboard, or email us.</td></tr>
          <tr><td>Opt out of sale or sharing</td><td><Link href="/legal/privacy-choices">Do Not Sell or Share</Link>, or send a Global Privacy Control signal.</td></tr>
          <tr><td>Limit use of sensitive information</td><td>We do not collect sensitive personal information as defined by the CPRA.</td></tr>
          <tr><td>Withdraw consent (cookies, email)</td><td>Cookie settings link in the footer; unsubscribe link in every non-essential email.</td></tr>
        </tbody>
      </table>
      <h2>Making a request</h2>
      <ul>
        <li>Email <a href={`mailto:${COMPANY.privacyEmail}`}>{COMPANY.privacyEmail}</a>, addressed to our {COMPANY.privacyOfficer}, or write to {COMPANY.name}, {COMPANY.address}.</li>
        <li>We verify your identity by confirming control of the email address on the account. Authorised agents need your signed permission.</li>
        <li>We respond within 30 days (PIPEDA, Quebec Law 25) or 45 days (CCPA/CPRA), and tell you if we need an extension allowed by law.</li>
        <li>Requests are free. We will not deny service, charge different prices or provide a different quality of service because you exercised a right.</li>
      </ul>
      <h2>Appeals and complaints</h2>
      <p>If we decline a request, you can appeal by replying to our decision; we answer appeals within 45 days. You can also complain to a regulator:</p>
      <ul>
        <li>California: California Privacy Protection Agency (cppa.ca.gov)</li>
        <li>Canada: Office of the Privacy Commissioner of Canada (priv.gc.ca)</li>
        <li>Quebec: Commission d’accès à l’information du Québec (cai.gouv.qc.ca)</li>
        <li>Other US states: your state Attorney General</li>
      </ul>
    </LegalPage>
  );
}
