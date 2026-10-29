import Link from "next/link";
import { CookieSettingsButton } from "@/components/legal/CookieSettingsButton";
import { COMPANY } from "@/lib/company";
import { getI18n } from "@/i18n/server";
import { Logo } from "./SiteHeader";

const link = "text-ink-700 hover:text-brand-600 hover:underline";

export async function SiteFooter() {
  const { t, visitor } = await getI18n();
  // Required or expected links: CCPA/CPRA ("Do Not Sell or Share", privacy
  // notice), PIPEDA / Quebec Law 25 (privacy policy, privacy officer contact),
  // ePrivacy / Law 25 (cookie policy + a way to change consent), ADA / AODA
  // (accessibility statement), and a vulnerability disclosure policy.
  const legal = [
    { href: "/legal", label: t("footer.legalCentre") },
    { href: "/terms", label: t("footer.terms") },
    { href: "/privacy", label: t("footer.privacyPolicy") },
    { href: "/legal/cookies", label: t("footer.cookiePolicy") },
    { href: "/legal/privacy-choices", label: t("footer.doNotSell") },
    { href: "/legal/privacy-rights", label: t("footer.privacyRights") },
    { href: "/legal/disclaimer", label: t("footer.disclaimer") },
    { href: "/legal/accessibility", label: t("footer.accessibility") },
    { href: "/legal/security", label: t("footer.security") },
  ];

  return (
    <footer className="mt-16 border-t border-ink-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-[1.2fr_0.8fr_1.6fr]">
        <div>
          <Logo />
          <p className="mt-3 text-sm text-ink-500">{t("footer.blurb")}</p>
        </div>

        <nav aria-labelledby="footer-explore">
          <h2 id="footer-explore" className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-900">{t("footer.explore")}</h2>
          <ul className="space-y-2 text-sm">
            <li><Link href="/categories" className={link}>{t("nav.categories")}</Link></li>
            <li><Link href="/search" className={link}>{t("nav.services")}</Link></li>
            <li><Link href="/register?type=trader" className={link}>{t("nav.listBusiness")}</Link></li>
            <li><Link href="/account" className={link}>{t("footer.yourData")}</Link></li>
            <li><Link href="/contact" className={link}>{t("nav.contact")}</Link></li>
          </ul>
        </nav>

        <nav aria-labelledby="footer-legal">
          <h2 id="footer-legal" className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-900">{t("footer.legalTitle")}</h2>
          <ul className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {legal.map((l) => (
              <li key={l.href}><Link href={l.href} className={link}>{l.label}</Link></li>
            ))}
            <li><CookieSettingsButton label={t("footer.cookieSettings")} className={`${link} text-start`} /></li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-ink-200 bg-ink-100">
        <div className="mx-auto max-w-6xl space-y-2 px-4 py-6 text-xs leading-relaxed text-ink-500">
          <p>{t("legal.disclaimer")}</p>
          {visitor.locale !== "en" && <p className="italic">{t("legal.translationNote")}</p>}
          <p>{t("footer.gpc")}</p>
          <p className="flex flex-wrap justify-between gap-2 pt-2">
            <span>{t("footer.rights", { year: new Date().getFullYear() })}</span>
            <span>{t("footer.operatedBy", { name: COMPANY.name, address: COMPANY.address })}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
