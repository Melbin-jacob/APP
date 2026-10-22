import { LegalPage } from "@/components/legal/LegalPage";
import { COMPANY } from "@/lib/company";

export const metadata = { title: "Accessibility Statement" };

export default function Accessibility() {
  return (
    <LegalPage title="Accessibility Statement" current="/legal/accessibility">
      <p>
        We want everyone to be able to find and hire a professional, including people who use assistive technology. We aim to meet
        the <strong>Web Content Accessibility Guidelines (WCAG) 2.1, level AA</strong>, consistent with the Americans with Disabilities Act
        and the Accessibility for Ontarians with Disabilities Act (AODA).
      </p>
      <h2>What we do</h2>
      <ul>
        <li>Semantic page structure, labelled form fields and a “skip to content” link</li>
        <li>Full keyboard navigation with visible focus</li>
        <li>Text alternatives for meaningful images; star ratings announced as text</li>
        <li>12 languages, including right-to-left Arabic</li>
        <li>No content that relies on colour alone to convey meaning</li>
      </ul>
      <h2>Known limitations</h2>
      <ul>
        <li>Photos uploaded by professionals may lack descriptive alternative text.</li>
        <li>Third-party advertisements are outside our control and may not meet WCAG 2.1 AA.</li>
      </ul>
      <h2>Report a barrier or request an accessible format</h2>
      <p>
        Email <a href={`mailto:${COMPANY.supportEmail}?subject=Accessibility`}>{COMPANY.supportEmail}</a> with the page and the problem.
        We aim to respond within 5 business days and can provide information in an alternative format on request.
      </p>
    </LegalPage>
  );
}
