import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteShell } from "@/components/layout/SiteShell";
import { MyReviews, PasswordForm, ProfileForm, SignOutButton } from "@/components/account/AccountSettings";
import { PrivacyControls } from "@/components/auth/PrivacyControls";
import { db } from "@/lib/db";
import { getI18n } from "@/i18n/server";
import { getPrincipal, needsTerms } from "@/server/auth";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t("account.title") };
}

export default async function AccountPage() {
  const [principal, { t }] = await Promise.all([getPrincipal(), getI18n()]);
  if (!principal) redirect("/login?callbackUrl=/account");
  const [user, reviews] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: principal.id }, select: { name: true, email: true, marketingOptIn: true, passwordHash: true, phone: true, addressLine: true, city: true, postcode: true } }),
    db.review.findMany({
      where: { authorId: principal.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, rating: true, comment: true, status: true, createdAt: true, trader: { select: { businessName: true, slug: true } } },
    }),
  ]);

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl space-y-6 py-10">
        <section className="card flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <h1 className="text-xl font-bold">{t("account.title")}</h1>
            <p className="mt-1 text-sm text-ink-500">{t("account.signedInAs", { email: principal.email })}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {principal.role === "TRADER" && <Link href="/dashboard/profile" className="btn-primary">{t("account.manageBusiness")}</Link>}
            <SignOutButton />
          </div>
          {needsTerms(principal) && (
            <p className="w-full rounded-md bg-accent-400/15 p-3 text-sm">
              <Link href="/legal/accept-terms?next=/account" className="font-medium underline">{t("acceptTerms.title")}</Link>
            </p>
          )}
        </section>
        <ProfileForm initial={{
          name: user.name ?? "", email: user.email, marketingOptIn: user.marketingOptIn,
          phone: user.phone ?? "", addressLine: user.addressLine ?? "", city: user.city ?? "", postcode: user.postcode ?? "",
        }} />
        <PasswordForm hasPassword={!!user.passwordHash} />
        <MyReviews reviews={reviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))} />
        <PrivacyControls />
      </div>
    </SiteShell>
  );
}
