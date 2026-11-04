import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard } from "@/components/seo/og-card";

export const alt = "GetTradePros: find trusted local tradespeople";
export const size = OG_SIZE;
export const contentType = "image/png";

// Default preview for any page without its own (home, categories, search…).
export default async function Image() {
  return new ImageResponse(
    await OgCard({ kicker: "Local pros near you", title: "Find trusted tradespeople", lines: ["Plumbers, electricians, roofers and 30+ trades.", "Compare rates, read reviews, request free quotes."] }),
    size,
  );
}
