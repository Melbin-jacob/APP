import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth";
import { withActors } from "@/server/audit";
import { route } from "@/server/http";

const query = z.object({
  action: z.string().max(60).optional(),
  entityType: z.string().max(60).optional(),
  entityId: z.string().max(60).optional(),
  actorId: z.string().max(60).optional(),
  cursor: z.string().cuid().optional(),
});

// GET /api/admin/audit-logs — append-only trail, newest first, cursor-paginated.
export const GET = route(async (req) => {
  await requireRole("SUPER_ADMIN");
  const { cursor, action, ...filters } = query.parse(Object.fromEntries(req.nextUrl.searchParams));
  const logs = await db.auditLog.findMany({
    where: { ...filters, ...(action ? { action: { startsWith: action } } : {}) },
    orderBy: { createdAt: "desc" },
    take: 101,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  return NextResponse.json({ logs: await withActors(logs.slice(0, 100)), nextCursor: logs[100]?.id ?? null });
});
