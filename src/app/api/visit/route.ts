import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp, ipHash, parseJson, route } from "@/server/http";
import { recordVisit } from "@/server/services/visits";

const GEO = ["x-vercel-ip-country", "cloudfront-viewer-country", "cf-ipcountry", "x-country-code"];

// POST /api/visit { path } — counts a page view (anonymous, no cookies). Always 204.
export const POST = route(async (req) => {
  const { path } = await parseJson(req, z.object({ path: z.string().max(500) }));
  if ((await rateLimit("visit", ipHash(req))).ok) {
    const country = GEO.map((h) => req.headers.get(h)?.toUpperCase()).find((v) => v && v !== "XX") ?? null;
    await recordVisit({ ip: clientIp(req), userAgent: req.headers.get("user-agent") ?? "", path, country }).catch(() => false);
  }
  return new NextResponse(null, { status: 204 });
});
