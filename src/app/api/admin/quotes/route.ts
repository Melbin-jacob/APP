import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth";
import { route } from "@/server/http";

// GET /api/admin/quotes?view=forward|all — quote requests. "forward" (default):
// new requests to listings nobody has claimed, which ops pass on by phone.
export const GET = route(async (req) => {
  await requireRole("ADMIN");
  const view = z.enum(["forward", "all"]).catch("forward").parse(req.nextUrl.searchParams.get("view"));
  const quotes = await db.quoteRequest.findMany({
    where: view === "forward" ? { status: "NEW", trader: { userId: null } } : {},
    orderBy: { createdAt: view === "forward" ? "asc" : "desc" },
    take: 100,
    include: { trader: { select: { businessName: true, slug: true, phone: true, userId: true } } },
  });
  return NextResponse.json({ quotes });
});
