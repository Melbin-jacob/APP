import { PageTitle, Stat } from "@/components/admin/ui";
import { MiniBars } from "@/components/admin/MiniBars";
import { countryName } from "@/lib/format";
import { getDashboard } from "@/server/services/analytics";
import { getVisitorStats } from "@/server/services/visits";

export const metadata = { title: "Ops console" };

export default async function AdminOverview() {
  const [d, v] = await Promise.all([getDashboard(30), getVisitorStats(30)]);
  const healthy = d.health.postgresMs >= 0 && d.health.redisMs >= 0;
  return (
    <>
      <PageTitle>Overview</PageTitle>
      <section aria-labelledby="visitors-heading" className="mb-6">
        <h2 id="visitors-heading" className="mb-2 text-sm font-semibold text-ink-700">Visitors <span className="font-normal text-ink-500">(days in {v.timezone.replace("_", " ")} time)</span></h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Visitors today" value={v.today.visitors.toLocaleString("en")} />
          <Stat label="Page views today" value={v.today.pageViews.toLocaleString("en")} />
          <Stat label="Visitors yesterday" value={v.yesterday.visitors.toLocaleString("en")} />
          <Stat label="Daily average (30d)" value={v.avgVisitors.toLocaleString("en")} />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <MiniBars title="Visitors / day (30d)" points={v.series.map((p) => ({ day: p.day, count: p.visitors }))} unit="visits" />
          <section className="card p-4">
            <h3 className="mb-2 text-sm font-semibold">Top pages today</h3>
            <ol className="space-y-1 text-sm">
              {v.topPages.map((p) => (
                <li key={p.path} className="flex justify-between gap-3"><span className="truncate">{p.path}</span><span className="text-ink-500">{p.views}</span></li>
              ))}
              {v.topPages.length === 0 && <li className="text-ink-500">No visits yet today.</li>}
            </ol>
          </section>
          <section className="card p-4">
            <h3 className="mb-2 text-sm font-semibold">Visitors by country today</h3>
            <ol className="space-y-1 text-sm">
              {v.byCountry.map((c) => (
                <li key={c.country} className="flex justify-between"><span>{c.country === "??" ? "Unknown" : countryName(c.country, "en")}</span><span className="text-ink-500">{c.visitors}</span></li>
              ))}
              {v.byCountry.length === 0 && <li className="text-ink-500">No visits yet today.</li>}
            </ol>
          </section>
        </div>
        <p className="mt-2 text-xs text-ink-500">Counted without cookies: each visitor is anonymised with a key that changes daily, so only daily totals exist. Bots and staff pages aren&apos;t counted.</p>
      </section>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <Stat label="Customers" value={d.totals.customers} href="/admin/users?role=CUSTOMER" />
        <Stat label="Live traders" value={d.totals.traders} href="/admin/traders?status=APPROVED" />
        <Stat label="Published reviews" value={d.totals.reviews} href="/admin/reviews?filter=published" />
        <Stat label="Traders to approve" value={d.queues.pendingTraders} tone={d.queues.pendingTraders ? "warn" : undefined} href="/admin/traders?status=PENDING" />
        <Stat label="Reviews to moderate" value={d.queues.pendingReviews} tone={d.queues.pendingReviews ? "warn" : undefined} href="/admin/reviews?filter=moderation" />
        <Stat label="Credentials to check" value={d.queues.pendingCredentials} tone={d.queues.pendingCredentials ? "warn" : undefined} href="/admin/traders?status=CREDENTIALS" />
        <Stat label="Listing claims to verify" value={d.queues.pendingClaims} tone={d.queues.pendingClaims ? "warn" : undefined} href="/admin/claims" />
        <Stat label="Quote requests to pass on" value={d.queues.quotesToForward} tone={d.queues.quotesToForward ? "warn" : undefined} href="/admin/quotes" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <MiniBars title="New users / day (30d)" points={d.series.signups} />
        <MiniBars title="Searches / day (30d)" points={d.series.searches} />
        <MiniBars title="Reviews / day (30d)" points={d.series.reviews} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="mb-2 text-sm font-semibold">Top searches (7d)</h2>
          <ol className="space-y-1 text-sm">
            {d.topSearches.map((s) => (
              <li key={s.keyword} className="flex justify-between"><span>{s.keyword}</span><span className="text-ink-500">{s.count}</span></li>
            ))}
            {d.topSearches.length === 0 && <li className="text-ink-500">No searches yet.</li>}
          </ol>
        </section>
        <section className="card p-4">
          <h2 className="mb-2 text-sm font-semibold">System health {healthy ? "🟢" : "🔴"}</h2>
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-ink-500">Postgres latency</dt><dd>{d.health.postgresMs < 0 ? "DOWN" : `${d.health.postgresMs} ms`}</dd>
            <dt className="text-ink-500">Redis latency</dt><dd>{d.health.redisMs < 0 ? "DOWN" : `${d.health.redisMs} ms`}</dd>
            <dt className="text-ink-500">Instance memory</dt><dd>{d.health.memoryMb} MB</dd>
            <dt className="text-ink-500">Instance uptime</dt><dd>{Math.round(d.health.uptimeS / 60)} min</dd>
          </dl>
        </section>
      </div>
    </>
  );
}
