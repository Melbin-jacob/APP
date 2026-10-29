import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { COMPANY, isPlaceholder } from "@/lib/company";

export const metadata = { title: "Copyright & DMCA Policy" };

// DMCA safe harbour (17 U.S.C. § 512): a designated agent registered with the
// U.S. Copyright Office and named here, a notice-and-takedown process, counter
// notices, and a repeat-infringer policy. Have counsel review before launch.
export default function CopyrightPolicy() {
  const agent = COMPANY.dmcaAgent;
  return (
    <LegalPage title="Copyright & DMCA Policy" current="/legal/copyright">
      <p>
        Businesses and customers can post content on GetTradePros, such as logos, business descriptions and reviews. We respect
        copyright and respond to clear notices of alleged infringement under the U.S. Digital Millennium Copyright Act (DMCA) and
        the Canadian <em>Copyright Act</em>.
      </p>

      <h2>Designated agent</h2>
      <p>Send copyright notices to our designated agent:</p>
      <address className="not-italic">
        {isPlaceholder(agent.name) ? <em>{agent.name}</em> : agent.name}<br />
        {COMPANY.name}<br />
        {isPlaceholder(agent.address) ? <em>{agent.address}</em> : agent.address}<br />
        Email: <a href={`mailto:${agent.email}`}>{agent.email}</a>
        {agent.phone && <><br />Phone: {agent.phone}</>}
      </address>

      <h2>Reporting infringement</h2>
      <p>Your notice must be in writing and include:</p>
      <ol>
        <li>Your physical or electronic signature (typing your full name is enough by email).</li>
        <li>A description of the copyrighted work you say is infringed.</li>
        <li>The address (URL) of the page with the material, and enough detail for us to find it.</li>
        <li>Your name, postal address, phone number and email address.</li>
        <li>A statement that you believe in good faith that the use is not authorised by the owner, its agent or the law.</li>
        <li>A statement that the information in your notice is accurate and, under penalty of perjury, that you are the owner or authorised to act for the owner.</li>
      </ol>
      <p>
        We remove or disable access to the material promptly once we receive a complete notice, and tell the person who posted it.
        Knowingly misrepresenting that material is infringing can make you liable for damages (17 U.S.C. § 512(f)).
      </p>

      <h2>Counter-notice</h2>
      <p>If your material was removed and you believe that was a mistake or misidentification, you can send our agent a counter-notice with:</p>
      <ol>
        <li>Your physical or electronic signature.</li>
        <li>The material that was removed and where it appeared before removal.</li>
        <li>A statement under penalty of perjury that you believe in good faith it was removed by mistake or misidentification.</li>
        <li>Your name, address and phone number, and a statement that you consent to the jurisdiction of the federal district court for your address (or, outside the U.S., any judicial district where we may be found), and that you will accept service from the person who sent the original notice.</li>
      </ol>
      <p>
        We forward the counter-notice to the person who complained. Unless they tell us within 10 business days that they have
        filed a court action, we restore the material within 10 to 14 business days.
      </p>

      <h2>Repeat infringers</h2>
      <p>
        We close the accounts, and remove the listings, of users who repeatedly infringe copyright, in appropriate circumstances.
        Generally, an account that receives three valid notices that aren’t successfully countered is closed.
      </p>

      <h2>Canada</h2>
      <p>
        Notices under the Canadian <em>Copyright Act</em> can be sent to the same agent. We act on them as described above. See also
        our <Link href="/terms">Terms of Service</Link>.
      </p>
    </LegalPage>
  );
}
