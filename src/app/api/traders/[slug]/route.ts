import { NextResponse } from "next/server";
import { notFound, route } from "@/server/http";
import { getPublicTrader } from "@/server/services/catalog";

// GET /api/traders/:slug — public profile (phone number withheld; use /call).
export const GET = route<{ params: Promise<{ slug: string }> }>(async (_req, { params }) => {
  const trader = await getPublicTrader((await params).slug);
  if (!trader) throw notFound("Trader");
  return NextResponse.json({ trader });
});
