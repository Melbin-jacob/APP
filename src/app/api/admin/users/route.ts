import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth";
import { route } from "@/server/http";

const query = z.object({
  q: z.string().trim().max(100).optional(),
  role: z.enum(["CUSTOMER", "TRADER", "ADMIN", "SUPER_ADMIN"]).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "BANNED", "PENDING_DELETION"]).optional(),
  cursor: z.string().cuid().optional(),
});

// GET /api/admin/users?q=&role=&status=&cursor=
export const GET = route(async (req) => {
  await requireRole("ADMIN");
  const { q, role, status, cursor } = query.parse(Object.fromEntries(req.nextUrl.searchParams));
  const users = await db.user.findMany({
    where: {
      role, status,
      ...(q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 51,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true, email: true, name: true, role: true, status: true, createdAt: true, lastLoginAt: true,
      trader: { select: { id: true, businessName: true, status: true, slug: true } },
    },
  });
  return NextResponse.json({ users: users.slice(0, 50), nextCursor: users[50]?.id ?? null });
});
