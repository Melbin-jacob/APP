import { SiteShell } from "@/components/layout/SiteShell";
import { LIABILITY_DISCLAIMER, TOS_VERSION } from "@/lib/legal";

export const metadata = { title: "Terms of Service" };

// Placeholder structure — final wording must come from counsel.
export default function TermsPage() {
  return (
    <SiteShell>
      <article className="card prose-sm mx-auto my-10 max-w-3xl space-y-4 p-8 text-sm leading-relaxed text-ink-700">
        <h1 className="text-2xl font-bold text-ink-900">Terms of Service</h1>
        <p className="text-xs text-ink-500">Version {TOS_VERSION}</p>
        <h2 className="pt-2 text-lg font-semibold text-ink-900">1. Nature of the platform</h2>
        <p className="rounded border border-accent-400/40 bg-accent-400/10 p-4 font-medium text-ink-900">{LIABILITY_DISCLAIMER}</p>
        <h2 className="pt-2 text-lg font-semibold text-ink-900">2. Service providers</h2>
        <p>Service providers are independent businesses, not employees, agents or partners of the platform. Credential checks reflect documents supplied at a point in time and are not a guarantee of competence, insurance cover or licensing status.</p>
        <h2 className="pt-2 text-lg font-semibold text-ink-900">3. Reviews</h2>
        <p>Reviews must reflect genuine first-hand experience. We may remove reviews that are fake, abusive, or otherwise breach these terms.</p>
        <h2 className="pt-2 text-lg font-semibold text-ink-900">4. Your account and data</h2>
        <p>You may export or delete your data at any time from your account page. See our Privacy Policy.</p>
      </article>
    </SiteShell>
  );
}
