import { LegalPage } from "@/components/legal/LegalPage";
import { CookieSettingsButton } from "@/components/legal/CookieSettingsButton";

export const metadata = { title: "Cookie Policy" };

// Keep this table in sync with every cookie the app sets.
const COOKIES = [
  ["Strictly necessary", "next-auth.session-token / __Secure-next-auth.session-token", "Keeps you signed in (encrypted session)", "7 days"],
  ["Strictly necessary", "next-auth.csrf-token / __Host-next-auth.csrf-token", "Protects sign-in forms against cross-site request forgery", "Session"],
  ["Strictly necessary", "next-auth.callback-url", "Returns you to the right page after signing in", "Session"],
  ["Strictly necessary", "hsd_consent", "Remembers your cookie choices (and any Global Privacy Control signal)", "180 days"],
  ["Functional", "hsd_country", "The country whose listings you chose to see", "1 year"],
  ["Functional", "hsd_locale", "Your chosen website language", "1 year"],
  ["Functional", "hsd_currency", "Your chosen display currency", "1 year"],
  ["Analytics (only with consent)", "None set today", "Reserved for privacy-respecting usage analytics", "n/a"],
  ["Advertising (only with consent)", "Set by ad partners inside the sandboxed side banners", "Ad delivery and measurement; blocked from reading our cookies or pages", "Per partner"],
] as const;

export default function CookiePolicy() {
  return (
    <LegalPage title="Cookie Policy" current="/legal/cookies">
      <p>
        Cookies are small files a website stores in your browser. We use strictly necessary and functional cookies to run the site.
        Analytics and advertising cookies are used <strong>only if you opt in</strong>. Rejecting them is as easy as accepting them,
        and the site works the same either way.
      </p>
      <div className="overflow-x-auto">
        <table>
          <thead><tr><th>Category</th><th>Cookie</th><th>Purpose</th><th>Duration</th></tr></thead>
          <tbody>{COOKIES.map(([cat, name, purpose, dur]) => (
            <tr key={name}><td>{cat}</td><td><code>{name}</code></td><td>{purpose}</td><td>{dur}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <h2>Your choices</h2>
      <ul>
        <li>Change your choices at any time: <CookieSettingsButton label="open cookie settings" className="text-brand-700 underline" />.</li>
        <li>If your browser sends a <strong>Global Privacy Control</strong> signal, we treat it as an opt-out of analytics and advertising cookies automatically.</li>
        <li>You can also delete cookies in your browser settings. Deleting the strictly necessary ones will sign you out.</li>
      </ul>
      <h2>Third-party advertising</h2>
      <p>
        Side banners may contain ads from partners such as Google AdSense. They load inside an isolated, sandboxed frame that cannot
        read our cookies, your account or the rest of the page. See also <a href="/legal/privacy-choices">Do Not Sell or Share My Personal Information</a>.
      </p>
    </LegalPage>
  );
}
