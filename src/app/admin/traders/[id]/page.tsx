import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { CredentialActions, TraderStatusActions } from "@/components/admin/TraderReviewActions";
import { Badge, statusTone } from "@/components/admin/ui";
import { BusinessAvatar } from "@/components/traders/BusinessAvatar";
import { db } from "@/lib/db";
import { withActors } from "@/server/audit";
import { formatDate, formatMoney } from "@/lib/format";

export const metadata = { title: "Business details · Ops console" };

const DAYS = [["mon", "Monday"], ["tue", "Tuesday"], ["wed", "Wednesday"], ["thu", "Thursday"], ["fri", "Friday"], ["sat", "Saturday"], ["sun", "Sunday"]] as const;
type Hours = Partial<Record<(typeof DAYS)[number][0], { open: string; close: string }[]>>;

function Card({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`card p-5 ${className}`}>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500">{title}</h2>
      {children}
    </section>
  );
}

function Rows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[9rem_1fr] gap-x-4 gap-y-2 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-ink-500">{k}</dt>
          <dd className="min-w-0 break-words">{v ?? <span className="text-ink-500">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

// Everything ops needs to decide on a business, including what visitors can't
// see yet (pending listings have no public page).
export default async function AdminTraderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await db.traderProfile.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, name: true, status: true, createdAt: true, lastLoginAt: true, emailVerified: true } },
      categories: { include: { category: { select: { name: true } } }, orderBy: { isPrimary: "desc" } },
      services: { include: { category: { select: { name: true } } }, orderBy: { title: "asc" } },
      serviceAreas: { select: { postcode: true }, orderBy: { postcode: "asc" } },
      gallery: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true, caption: true } },
      credentials: { orderBy: { createdAt: "desc" } },
      claims: { orderBy: { createdAt: "desc" }, include: { user: { select: { email: true } } } },
      _count: { select: { reviews: true, quoteRequests: true, callEvents: true, jobs: true } },
    },
  });
  if (!t) notFound();
  const history = await withActors(await db.auditLog.findMany({
    where: { entityType: "TraderProfile", entityId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
  }));
  const hours = (t.operatingHours ?? {}) as Hours;
  const money = (minor: number | null) => (minor == null ? null : formatMoney(minor, t.currency, "en-CA"));
  const mapUrl = `https://www.openstreetmap.org/?mlat=${t.latitude}&mlon=${t.longitude}#map=14/${t.latitude}/${t.longitude}`;

  return (
    <div className="space-y-6">
      <Link href="/admin/traders" className="text-sm text-brand-700 hover:underline">← All traders</Link>

      <header className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-4">
          <BusinessAvatar name={t.businessName} logoUrl={t.logoUrl} className="h-16 w-16 rounded-lg" textClassName="text-xl" />
          <div>
            <h1 className="text-xl font-bold">{t.businessName} <Badge tone={statusTone(t.status)}>{t.status}</Badge></h1>
            <p className="text-sm text-ink-500">
              {t.categories.map((c) => c.category.name).join(", ") || "No trade"} · {t.city} {t.postcode}
              {t.status === "APPROVED" && <> · <Link href={`/traders/${t.slug}`} target="_blank" className="text-brand-700 underline">Public page ↗</Link></>}
            </p>
          </div>
        </div>
        <TraderStatusActions id={t.id} status={t.status} name={t.businessName} />
      </header>

      {t.status === "PENDING" && (
        <p className="rounded-md bg-sky-50 p-3 text-sm text-sky-900">
          Before approving: check the business is real and local (call the number below, look at the website), and that the
          name, trade and services match. Approving lists it publicly straight away and marks it <em>Profile verified</em>.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Contact and location">
          <Rows rows={[
            ["Phone", t.phone ? <a href={`tel:${t.phone.replace(/[^+\d]/g, "")}`} className="text-brand-700">{t.phone}</a> : null],
            ["Website", t.website ? <a href={t.website} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-700 underline">{t.website}</a> : null],
            ["Address", [t.addressLine, t.city, t.postcode].filter(Boolean).join(", ")],
            ["Country", t.country],
            ["Map", <a key="m" href={mapUrl} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline">{t.latitude.toFixed(4)}, {t.longitude.toFixed(4)} ↗</a>],
            ["Service radius", `${t.serviceRadiusKm} km`],
            ["Extra areas", t.serviceAreas.length ? t.serviceAreas.map((a) => a.postcode).join(", ") : null],
          ]} />
        </Card>

        <Card title="Account">
          <Rows rows={t.user ? [
            ["Owner email", <a key="e" href={`mailto:${t.user.email}`} className="text-brand-700">{t.user.email}</a>],
            ["Owner name", t.user.name],
            ["Account status", <Badge key="s" tone={statusTone(t.user.status)}>{t.user.status}</Badge>],
            ["Email confirmed", t.user.emailVerified ? formatDate(t.user.emailVerified) : "No"],
            ["Joined", formatDate(t.user.createdAt)],
            ["Last sign-in", t.user.lastLoginAt ? formatDate(t.user.lastLoginAt) : "Never"],
          ] : [
            ["Owner", "Unclaimed (imported listing)"],
            ["Source", t.importRef],
            ["Source notes", t.importNotes],
            ["Imported", formatDate(t.createdAt)],
          ]} />
        </Card>

        <Card title="About and pricing">
          <Rows rows={[
            ["Hourly rate", money(t.hourlyRatePence)],
            ["Currency", t.currency],
            ["Profile URL", `/traders/${t.slug}`],
            ["Verified", t.verifiedAt ? formatDate(t.verifiedAt) : "No"],
          ]} />
          <p className="mt-4 whitespace-pre-line text-sm text-ink-700">{t.bio || <span className="text-ink-500">No description.</span>}</p>
        </Card>

        <Card title="Opening hours">
          {Object.keys(hours).length ? (
            <Rows rows={DAYS.map(([k, label]) => [label, hours[k]?.length ? hours[k]!.map((h) => `${h.open}–${h.close}`).join(", ") : "Closed"])} />
          ) : <p className="text-sm text-ink-500">Not set.</p>}
        </Card>

        <Card title={`Trades and services (${t.services.length})`} className="lg:col-span-2">
          <p className="mb-3 text-sm">
            {t.categories.map((c) => <span key={c.categoryId} className="me-2 inline-block">{c.category.name}{c.isPrimary && <Badge tone="good">primary</Badge>}</span>)}
          </p>
          {t.services.length ? (
            <table className="w-full text-sm">
              <thead className="text-start text-xs uppercase text-ink-500"><tr><th className="py-1 text-start">Service</th><th className="text-start">Trade</th><th className="text-start">From</th><th className="text-start">Description</th></tr></thead>
              <tbody className="divide-y divide-ink-200">
                {t.services.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2 font-medium">{s.title}</td>
                    <td>{s.category.name}</td>
                    <td>{money(s.priceFromPence) ?? "—"}{s.priceUnit && s.priceFromPence != null ? ` / ${s.priceUnit}` : ""}</td>
                    <td className="text-ink-500">{s.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-sm text-ink-500">No services listed.</p>}
        </Card>

        <Card title={`Credentials (${t.credentials.length})`}>
          {t.credentials.length ? (
            <ul className="space-y-2 text-sm">
              {t.credentials.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>{c.type}: {c.name}{c.issuer && ` · ${c.issuer}`}{c.number && ` · #${c.number}`}{c.expiresAt && ` · expires ${formatDate(c.expiresAt)}`} <Badge tone={statusTone(c.status)}>{c.status}</Badge></span>
                  {c.status === "PENDING" && <CredentialActions id={c.id} />}
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-ink-500">None submitted.</p>}
        </Card>

        <Card title="Activity">
          <Rows rows={[
            ["Reviews", String(t._count.reviews)],
            ["Rating", t.ratingCount ? `${Number(t.ratingAvg).toFixed(1)}★ (${t.ratingCount})` : "—"],
            ["Quote requests", String(t._count.quoteRequests)],
            ["Call clicks", String(t._count.callEvents)],
            ["Jobs logged", String(t._count.jobs)],
          ]} />
        </Card>

        {(t.gallery.length > 0 || t.coverImageUrl) && (
          <Card title="Photos" className="lg:col-span-2">
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {t.coverImageUrl && <li><img src={t.coverImageUrl} alt="Cover" className="aspect-square w-full rounded object-cover" /><p className="mt-1 text-xs text-ink-500">Cover</p></li>}
              {t.gallery.map((g) => (
                // eslint-disable-next-line @next/next/no-img-element
                <li key={g.id}><img src={g.url} alt={g.caption ?? ""} className="aspect-square w-full rounded object-cover" />{g.caption && <p className="mt-1 text-xs text-ink-500">{g.caption}</p>}</li>
              ))}
            </ul>
          </Card>
        )}

        {t.claims.length > 0 && (
          <Card title="Listing claims">
            <ul className="space-y-1 text-sm">
              {t.claims.map((c) => <li key={c.id}>{c.contactName} ({c.jobTitle}) · {c.user.email} · {formatDate(c.createdAt)} <Badge tone={statusTone(c.status)}>{c.status}</Badge></li>)}
            </ul>
            <Link href="/admin/claims" className="mt-2 inline-block text-xs text-brand-700 underline">Open claims queue</Link>
          </Card>
        )}

        <Card title="History">
          {history.length ? (
            <ul className="space-y-1 text-sm">
              {history.map((h) => {
                const reason = (h.metadata as { reason?: string } | null)?.reason;
                return (
                  <li key={h.id}>
                    <span className="text-ink-500">{formatDate(h.createdAt)}</span> · {h.action.replace(/^trader\./, "")} · {h.actor?.email ?? "system"}
                    {reason && <span className="text-ink-500"> · “{reason}”</span>}
                  </li>
                );
              })}
            </ul>
          ) : <p className="text-sm text-ink-500">No changes recorded yet.</p>}
        </Card>
      </div>
    </div>
  );
}
