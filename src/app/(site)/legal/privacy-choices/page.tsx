import { LegalPage } from "@/components/legal/LegalPage";
import { PrivacyChoicesControl } from "@/components/legal/PrivacyChoicesControl";
import { COMPANY } from "@/lib/company";

export const metadata = { title: "Do Not Sell or Share My Personal Information" };

export default function PrivacyChoices() {
  return (
    <LegalPage title="Do Not Sell or Share My Personal Information" current="/legal/privacy-choices">
      <p>
        <strong>We do not sell personal information</strong> for money. Under the California Consumer Privacy Act (as amended by the CPRA)
        and similar state laws, allowing advertising partners to use cookies for cross-context behavioural advertising can count as
        “sharing”. That only happens if you accept advertising cookies, and you can opt out at any time.
      </p>
      <h2>Opt out on this browser</h2>
      <PrivacyChoicesControl />
      <ul>
        <li>This turns off advertising and analytics cookies in this browser. Repeat it on each browser or device you use.</li>
        <li>We honour <strong>Global Privacy Control</strong> (GPC) signals automatically as a valid opt-out request.</li>
        <li>We do not knowingly sell or share the personal information of anyone under 16.</li>
      </ul>
      <h2>Opt out by email</h2>
      <p>
        Email <a href={`mailto:${COMPANY.privacyEmail}?subject=Do%20Not%20Sell%20or%20Share`}>{COMPANY.privacyEmail}</a> with the subject
        “Do Not Sell or Share”. An authorised agent may submit the request on your behalf with your written permission.
        We will not discriminate against you for exercising this right.
      </p>
    </LegalPage>
  );
}
