import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard } from "@/components/seo/og-card";
import { getPublicTrader } from "@/server/services/catalog";

export const alt = "Business on GetTradePros";
export const size = OG_SIZE;
export const contentType = "image/png";

// Preview shown when a business page is shared (messages, social media, search).
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const trader = await getPublicTrader((await params).slug);
  const trade = trader && (trader.categories.find((c) => c.isPrimary) ?? trader.categories[0])?.category.name;
  const rating = trader && trader.ratingCount > 0 ? `★ ${trader.ratingAvg.toFixed(1)} from ${trader.ratingCount} review${trader.ratingCount === 1 ? "" : "s"}` : "Request a free quote";
  return new ImageResponse(
    await OgCard(
      trader
        ? { kicker: trade ?? "Local business", title: trader.businessName.slice(0, 70), lines: [trader.city, rating] }
        : { kicker: "Local pros near you", title: "Find trusted tradespeople", lines: [] },
    ),
    size,
  );
}
