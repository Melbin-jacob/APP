import Link from "next/link";
import { LegalDisclaimer } from "@/components/legal/LegalDisclaimer";
import { Icon } from "@/components/ui/Icon";
import { StarRating } from "@/components/ui/StarRating";
import { formatMoney } from "@/lib/format";
import type { TraderCard as TraderCardData } from "@/server/services/search";
import { CallButton } from "./CallButton";

const FALLBACK = "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=60";

export function TraderCard({ trader }: { trader: TraderCardData }) {
  const rate = formatMoney(trader.hourlyRatePence, trader.currency);
  return (
    <article className="card flex h-full flex-col overflow-hidden">
      <Link href={`/traders/${trader.slug}`} className="relative block aspect-[4/3] bg-ink-200">
        {/* eslint-disable-next-line @next/next/no-img-element -- user-uploaded hosts vary */}
        <img src={trader.coverImageUrl ?? trader.logoUrl ?? FALLBACK} alt="" className="h-full w-full object-cover" loading="lazy" />
        {trader.categoryName && (
          <span className="absolute left-2 top-2 rounded-full bg-accent-500 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            {trader.categoryName}
          </span>
        )}
        <span className="absolute -bottom-4 left-1/2 grid h-9 w-9 -translate-x-1/2 place-items-center rounded-full border-2 border-white bg-brand-500 text-white shadow">
          <Icon name={trader.categoryIcon ?? "tools"} className="h-4 w-4" />
        </span>
      </Link>
      <div className="flex flex-1 flex-col items-center px-4 pb-4 pt-7 text-center">
        <h3 className="text-sm font-semibold text-ink-900">
          <Link href={`/traders/${trader.slug}`} className="hover:text-brand-600">{trader.businessName}</Link>
        </h3>
        <span className="my-2 block h-0.5 w-8 bg-brand-500" aria-hidden="true" />
        <p className="text-xs text-ink-500">
          {[trader.addressLine, trader.city, trader.postcode].filter(Boolean).join(", ")}
          {trader.distanceKm != null && <> · {trader.distanceKm.toFixed(1)} km</>}
        </p>
        <div className="mt-2"><StarRating value={trader.ratingAvg} count={trader.ratingCount} /></div>
        {rate && <p className="mt-1 text-xs text-ink-700">From <strong>{rate}</strong>/hr</p>}
        <div className="mt-auto flex w-full gap-2 pt-4">
          <CallButton slug={trader.slug} className="btn-primary flex-1 px-3 py-2 text-xs" />
          <Link href={`/traders/${trader.slug}#quote`} className="btn-ghost flex-1 px-3 py-2 text-xs">Request Quote</Link>
        </div>
      </div>
      <LegalDisclaimer variant="compact" />
    </article>
  );
}
