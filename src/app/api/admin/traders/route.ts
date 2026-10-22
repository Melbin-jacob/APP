import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth";
import { route } from "@/server/http";

// GET /api/admin/traders?status=PENDING — approval queue and directory.
export const GET = route(async (req) => {
  await requireRole("ADMIN");
  const status = z.enum(["PENDING", "APPROVED", "SUSPENDED", "REJECTED"]).optional().parse(req.nextUrl.searchParams.get("status") ?? undefined);
  const traders = await db.traderProfile.findMany({
    where: { status },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { email: true, status: true } },
      categories: { include: { category: { select: { name: true } } } },
      credentials: { select: { id: true, type: true, name: true, status: true, expiresAt: true } },
    },
  });
  return NextResponse.json({ traders });
});
