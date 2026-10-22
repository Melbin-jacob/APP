import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { Logo } from "./SiteHeader";

export async function SiteFooter() {
  const { t, visitor } = await getI18n();
  return (
    <footer className="mt-16 border-t border-ink-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 text-sm text-ink-500">{t("footer.blurb")}</p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-2 text-sm">
          <Link href="/categories" className="text-ink-700 hover:text-brand-600">{t("nav.categories")}</Link>
          <Link href="/register?type=trader" className="text-ink-700 hover:text-brand-600">{t("nav.listBusiness")}</Link>
          <Link href="/terms" className="text-ink-700 hover:text-brand-600">{t("footer.terms")}</Link>
          <Link href="/privacy" className="text-ink-700 hover:text-brand-600">{t("footer.privacy")}</Link>
          <Link href="/account" className="text-ink-700 hover:text-brand-600">{t("footer.yourData")}</Link>
        </nav>
        <div className="text-xs leading-relaxed text-ink-500">
          <p>{t("legal.disclaimer")}</p>
          {visitor.locale !== "en" && <p className="mt-2 italic">{t("legal.translationNote")}</p>}
        </div>
      </div>
      <div className="border-t border-ink-200 py-4 text-center text-xs text-ink-500">
        {t("footer.rights", { year: new Date().getFullYear() })}
      </div>
    </footer>
  );
}
