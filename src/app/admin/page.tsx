import { PageTitle, Stat } from "@/components/admin/ui";
import { MiniBars } from "@/components/admin/MiniBars";
import { getDashboard } from "@/server/services/analytics";

export const metadata = { title: "Ops console" };

export default async function AdminOverview() {
  const d = await getDashboard(30);
  const healthy = d.health.postgresMs >= 0 && d.health.redisMs >= 0;
  return (
    <>
      <PageTitle>Overview</PageTitle>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <Stat label="Customers" value={d.totals.customers} href="/admin/users?role=CUSTOMER" />
        <Stat label="Live traders" value={d.totals.traders} href="/admin/traders?status=APPROVED" />
        <Stat label="Published reviews" value={d.totals.reviews} href="/admin/reviews?filter=published" />
        <Stat label="Traders to approve" value={d.queues.pendingTraders} tone={d.queues.pendingTraders ? "warn" : undefined} href="/admin/traders?status=PENDING" />
        <Stat label="Reviews to moderate" value={d.queues.pendingReviews} tone={d.queues.pendingReviews ? "warn" : undefined} href="/admin/reviews?filter=moderation" />
        <Stat label="Credentials to check" value={d.queues.pendingCredentials} tone={d.queues.pendingCredentials ? "warn" : undefined} href="/admin/traders?status=CREDENTIALS" />
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
