import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { COMPANY } from "@/lib/company";
import { LIABILITY_DISCLAIMER, TOS_VERSION } from "@/lib/legal";

export const metadata = { title: "Terms of Service" };

// Drafted structure; final wording must come from counsel.
export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" current="/terms">
      <p className="text-xs text-ink-500">Version {TOS_VERSION}</p>
      <p>These terms are an agreement between you and {COMPANY.name}. By creating an account or using GetTradePros you accept them.</p>

      <h2>1. Nature of the platform</h2>
      <p className="rounded border border-accent-400/40 bg-accent-400/10 p-4 font-medium text-ink-900">{LIABILITY_DISCLAIMER}</p>
      <p>See the full <Link href="/legal/disclaimer">Legal Disclaimer</Link>.</p>

      <h2>2. Eligibility and accounts</h2>
      <ul>
        <li>You must be at least 18 and able to form a binding contract.</li>
        <li>Keep your sign-in details secure and tell us promptly about any unauthorised use.</li>
        <li>Give accurate information and keep it up to date.</li>
      </ul>

      <h2>3. Businesses listing on the platform</h2>
      <ul>
        <li>You are an independent business, not our employee, agent or partner.</li>
        <li>You hold every licence, registration and insurance your work requires, and documents you upload are genuine and current.</li>
        <li>Your rates, descriptions and photos are accurate and yours to use.</li>
        <li>You comply with consumer-protection, anti-discrimination, tax and employment laws where you work.</li>
        <li>You only request reviews from real customers, using the platform’s review tools.</li>
      </ul>

      <h2>4. Reviews</h2>
      <ul>
        <li>Reviews must describe a genuine first-hand experience.</li>
        <li>No fake reviews, reviews of your own business or competitors, or reviews offered or bought in exchange for payment, discounts or other incentives (US FTC rules on consumer reviews and Canada’s Competition Act).</li>
        <li>We may moderate, refuse or remove reviews that breach these terms, but we do not remove reviews just because they are negative.</li>
      </ul>

      <h2>5. Acceptable use</h2>
      <p>Don’t misuse the service: no unlawful, fraudulent, harassing or discriminatory content; no scraping, spam, malware, security testing outside our <Link href="/legal/security">disclosure policy</Link>, or attempts to bypass rate limits or access controls.</p>

      <h2>6. Content and licence</h2>
      <p>You keep ownership of content you post and give us a non-exclusive, worldwide, royalty-free licence to host, display and translate it to operate and promote the service. You can remove it by deleting it or your account.</p>

      <h2>7. Third-party advertising and links</h2>
      <p>Ads and links to other sites are provided by third parties; we don’t endorse them and aren’t responsible for their content or practices.</p>

      <h2>8. Limitation of liability</h2>
      <p>To the extent permitted by law, the service is provided “as is”, and we are not liable for indirect or consequential losses or for anything arising from work agreed between customers and businesses. Nothing in these terms excludes rights you have under consumer-protection laws that cannot be waived, including in Quebec.</p>

      <h2>9. Suspension and termination</h2>
      <p>You can close your account at any time. We may suspend or remove accounts or listings that breach these terms, with notice where appropriate.</p>

      <h2>10. Changes</h2>
      <p>If we change these terms materially, we will tell you and ask you to accept the new version before you continue using your account.</p>

      <h2>11. Governing law</h2>
      <p>{COMPANY.jurisdiction}. Consumers keep the protection of the mandatory laws of the place where they live.</p>

      <h2>12. Contact</h2>
      <p>{COMPANY.name}, {COMPANY.address} · <a href={`mailto:${COMPANY.supportEmail}`}>{COMPANY.supportEmail}</a></p>
    </LegalPage>
  );
}
