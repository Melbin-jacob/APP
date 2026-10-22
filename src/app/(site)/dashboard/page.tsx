import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteShell } from "@/components/layout/SiteShell";
import { TraderDashboard } from "@/components/dashboard/TraderDashboard";
import { db } from "@/lib/db";
import { getPrincipal } from "@/server/auth";

export const metadata = { title: "Business dashboard" };

export default async function DashboardPage() {
  const user = await getPrincipal();
  if (!user || user.role !== "TRADER") redirect("/login?callbackUrl=/dashboard");
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
              Status: <strong>{profile.status}</strong> · {Number(profile.ratingAvg).toFixed(1)}★ from {profile.ratingCount} reviews ·{" "}
              {profile._count.callEvents} call clicks
            </p>
          </div>
          {profile.status === "APPROVED" && <Link href={`/traders/${profile.slug}`} className="btn-ghost">View public profile</Link>}
        </header>
        {profile.status === "PENDING" && (
          <p className="rounded-md bg-accent-400/15 p-4 text-sm text-ink-700">Your profile is awaiting approval. You can request reviews once it&apos;s live.</p>
        )}
        <TraderDashboard />
      </div>
    </SiteShell>
  );
}
