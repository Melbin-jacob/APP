import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth";
import { route } from "@/server/http";

const query = z.object({
  status: z.enum(["PUBLISHED", "PENDING_MODERATION", "REMOVED"]).optional(),
  reported: z.enum(["1"]).optional(),
});

// GET /api/admin/reviews?status=PENDING_MODERATION&reported=1
export const GET = route(async (req) => {
  await requireRole("ADMIN");
  const { status, reported } = query.parse(Object.fromEntries(req.nextUrl.searchParams));
  const reviews = await db.review.findMany({
    where: { status, ...(reported ? { reportCount: { gt: 0 } } : {}) },
    orderBy: [{ reportCount: "desc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      trader: { select: { businessName: true, slug: true } },
      reports: { where: { resolvedAt: null }, select: { id: true, reason: true, details: true, createdAt: true } },
    },
  });
  return NextResponse.json({ reviews });
});
