import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth";
import { route } from "@/server/http";
import { getDashboard } from "@/server/services/analytics";

// GET /api/admin/analytics?days=30
export const GET = route(async (req) => {
  await requireRole("ADMIN");
  const days = z.coerce.number().int().min(7).max(365).default(30).parse(req.nextUrl.searchParams.get("days") ?? undefined);
  return NextResponse.json(await getDashboard(days), { headers: { "Cache-Control": "no-store" } });
});
