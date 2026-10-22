import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteShell } from "@/components/layout/SiteShell";
import { TraderDashboard } from "@/components/dashboard/TraderDashboard";
import { db } from "@/lib/db";
import { getI18n } from "@/i18n/server";
import { getPrincipal, requireCurrentTerms } from "@/server/auth";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t("dashboard.title") };
}

export default async function DashboardPage() {
  const [user, { t }] = await Promise.all([getPrincipal(), getI18n()]);
  if (!user || user.role !== "TRADER") redirect("/login?callbackUrl=/dashboard");
  requireCurrentTerms(user, "/dashboard");
  const profile = await db.traderProfile.findUnique({
    where: { userId: user.id },
    select: { businessName: true, slug: true, status: true, ratingAvg: true, ratingCount: true, _count: { select: { callEvents: true } } },
  });
  if (!profile) redirect("/register?type=trader");

  return (
    <SiteShell>
      <div className="space-y-6 py-10">
        <header className="card flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <h1 className="text-xl font-bold">{profile.businessName}</h1>
            <p className="text-sm text-ink-500">
              {t("dashboard.summary", {
                status: t(`dashboard.statuses.${profile.status}`),
                rating: Number(profile.ratingAvg).toFixed(1),
                count: profile.ratingCount,
                calls: profile._count.callEvents,
              })}
            </p>
          </div>
          {profile.status === "APPROVED" && <Link href={`/traders/${profile.slug}`} className="btn-ghost">{t("dashboard.viewProfile")}</Link>}
        </header>
        {profile.status === "PENDING" && (
          <p className="rounded-md bg-accent-400/15 p-4 text-sm text-ink-700">{t("dashboard.pendingNote")}</p>
        )}
        <TraderDashboard />
      </div>
    </SiteShell>
  );
}
