import { SiteShell } from "@/components/layout/SiteShell";

export const metadata = { title: "Privacy & Cookies" };

// Placeholder structure — final wording must come from counsel / DPO.
export default function PrivacyPage() {
  return (
    <SiteShell>
      <article className="card mx-auto my-10 max-w-3xl space-y-4 p-8 text-sm leading-relaxed text-ink-700">
        <h1 className="text-2xl font-bold text-ink-900">Privacy & Cookies</h1>
        <h2 className="pt-2 text-lg font-semibold text-ink-900">What we collect</h2>
        <p>Account details you give us; listings and reviews; anonymised (hashed) network identifiers for security and abuse prevention.</p>
        <h2 className="pt-2 text-lg font-semibold text-ink-900">Your rights (GDPR / CCPA)</h2>
        <p>Access, portability and erasure are self-service from your account page. We do not sell personal information.</p>
        <h2 className="pt-2 text-lg font-semibold text-ink-900">Cookies</h2>
        <p>Essential cookies keep you signed in and secure. Analytics and advertising cookies are only set with your consent, which you can change at any time by clearing the <code>hsd_consent</code> cookie.</p>
      </article>
    </SiteShell>
  );
}
