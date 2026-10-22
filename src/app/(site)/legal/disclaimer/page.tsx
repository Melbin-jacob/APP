import { LegalPage } from "@/components/legal/LegalPage";
import { LIABILITY_DISCLAIMER } from "@/lib/legal";

export const metadata = { title: "Legal Disclaimer" };

export default function Disclaimer() {
  return (
    <LegalPage title="Legal Disclaimer" current="/legal/disclaimer">
      <p className="rounded border border-accent-400/40 bg-accent-400/10 p-4 font-medium text-ink-900">{LIABILITY_DISCLAIMER}</p>
      <h2>What this means</h2>
      <ul>
        <li>Professionals listed here are independent businesses, not our employees, agents or partners.</li>
        <li>We do not perform, supervise, guarantee or insure any work. Quotes, prices, schedules and payment are agreed directly between you and the professional.</li>
        <li>Badges such as “Profile verified” or “Verified credentials” mean we reviewed documents the professional supplied at a point in time. They are not a guarantee of licensing, insurance, competence or conduct. Check licences and insurance yourself before hiring.</li>
        <li>Reviews are the opinions of their authors. “Verified customer” means the review came through a single-use link the business sent to a customer email, not that we checked the work.</li>
        <li>Prices shown in a currency other than the professional’s own are approximate conversions for information only.</li>
      </ul>
      <p>Nothing in this disclaimer limits liability that cannot be limited under applicable law, including consumer-protection laws in your state or province.</p>
    </LegalPage>
  );
}
