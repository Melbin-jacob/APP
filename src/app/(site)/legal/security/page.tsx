import { LegalPage } from "@/components/legal/LegalPage";
import { COMPANY } from "@/lib/company";

export const metadata = { title: "Security & Vulnerability Disclosure" };

// Describe only controls that exist in the code (see docs/ARCHITECTURE.md §7).
export default function Security() {
  return (
    <LegalPage title="Security & Vulnerability Disclosure" current="/legal/security">
      <h2>How we protect your data</h2>
      <ul>
        <li><strong>Encryption in transit:</strong> HTTPS everywhere, with HTTP Strict Transport Security.</li>
        <li><strong>Passwords:</strong> stored only as Argon2id hashes, never in readable form. Sign-in attempts are rate-limited per account and per network.</li>
        <li><strong>Access control:</strong> role-based permissions checked on the server for every request; admin actions are recorded in an audit log.</li>
        <li><strong>Application security:</strong> protections against the OWASP Top 10, including parameterised database queries, input sanitisation, a strict Content Security Policy, cross-site request forgery checks and clickjacking protection.</li>
        <li><strong>Single-use links:</strong> review and sign-in links are random, expire, work once, and are stored only as keyed hashes.</li>
        <li><strong>Third-party code isolation:</strong> advertising scripts run in sandboxed frames that cannot read our pages or cookies, and only after you consent.</li>
        <li><strong>Data minimisation:</strong> network addresses are stored only as one-way hashes, phone numbers are revealed only on request, and old data is deleted on a fixed schedule (see the Privacy Policy).</li>
        <li><strong>Dependencies:</strong> production dependencies are audited for known vulnerabilities before release.</li>
      </ul>

      <h2>Report a vulnerability</h2>
      <p>
        If you believe you have found a security vulnerability, email <a href={`mailto:${COMPANY.securityEmail}`}>{COMPANY.securityEmail}</a> with
        the steps to reproduce it. Our machine-readable contact details are in <a href="/.well-known/security.txt">/.well-known/security.txt</a>.
      </p>
      <h3>We ask that you</h3>
      <ul>
        <li>Give us reasonable time to fix the issue before telling anyone else.</li>
        <li>Only test against your own accounts; don’t access, change or delete other people’s data.</li>
        <li>Don’t run denial-of-service, spam or social-engineering tests, or physical attacks.</li>
      </ul>
      <h3>We commit to</h3>
      <ul>
        <li>Acknowledge your report within 3 business days and keep you updated.</li>
        <li>Not pursue legal action for good-faith research that follows this policy.</li>
        <li>Credit you, if you wish, once the issue is fixed.</li>
      </ul>

      <h2>If something goes wrong</h2>
      <p>
        If a breach affects your personal information and creates a real risk of significant harm, we will notify you and the
        relevant regulators as required by law (including PIPEDA, Quebec Law 25 and US state breach-notification laws).
      </p>
    </LegalPage>
  );
}
