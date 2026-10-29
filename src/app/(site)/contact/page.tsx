import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/ContactForm";
import { SiteShell } from "@/components/layout/SiteShell";
import { COMPANY, isPlaceholder } from "@/lib/company";
import { db } from "@/lib/db";
import { getI18n } from "@/i18n/server";
import { getPrincipal } from "@/server/auth";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("contact.title"), description: t("contact.intro") };
}

export default async function ContactPage() {
  const [{ t }, principal] = await Promise.all([getI18n(), getPrincipal()]);
  const me = principal ? await db.user.findUnique({ where: { id: principal.id }, select: { name: true, email: true } }) : null;
  const value = (v: string) => (isPlaceholder(v) ? <span className="text-ink-500">{t("contact.comingSoon")}</span> : v);
  const details = [
    { icon: "✉️", label: t("contact.emailLabel"), body: <a href={`mailto:${COMPANY.supportEmail}`} className="text-brand-700 underline" dir="ltr">{COMPANY.supportEmail}</a> },
    {
      icon: "📞", label: t("contact.phoneLabel"),
      body: isPlaceholder(COMPANY.phone) ? value(COMPANY.phone) : <a href={`tel:${COMPANY.phone.replace(/[^\d+]/g, "")}`} className="text-brand-700 underline" dir="ltr">{COMPANY.phone}</a>,
    },
    { icon: "📍", label: t("contact.addressLabel"), body: value(COMPANY.address) },
    { icon: "🕘", label: t("contact.hoursLabel"), body: value(COMPANY.hours) },
  ];

  return (
    <SiteShell>
      <div className="mx-auto max-w-5xl space-y-6 py-10">
        <header className="max-w-2xl space-y-2">
          <h1 className="text-3xl font-bold">{t("contact.title")}</h1>
          <p className="text-ink-700">{t("contact.intro")}</p>
        </header>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ContactForm defaults={{ name: me?.name ?? "", email: me?.email ?? "" }} />
          </div>
          <aside className="space-y-4">
            <section className="card space-y-4 p-6">
              <h2 className="font-semibold">{t("contact.detailsTitle")}</h2>
              <dl className="space-y-3 text-sm">
                {details.map((d) => (
                  <div key={d.label} className="flex gap-3">
                    <span aria-hidden="true">{d.icon}</span>
                    <div className="min-w-0">
                      <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">{d.label}</dt>
                      <dd className="break-words text-ink-900">{d.body}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </section>
            <p className="rounded-md bg-sky-50 p-4 text-xs text-sky-900">{t("contact.directoryNote")}</p>
          </aside>
        </div>
      </div>
    </SiteShell>
  );
}
