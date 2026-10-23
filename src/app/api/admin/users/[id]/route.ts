import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { invalidatePrincipal, requireRecentAuth, requireRole } from "@/server/auth";
import { securityAlert } from "@/server/services/security-alerts";
import { audit } from "@/server/audit";
import { forbidden, ipHash, notFound, parseJson, route } from "@/server/http";

const body = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "BANNED"]).optional(),
  role: z.enum(["CUSTOMER", "TRADER", "ADMIN", "SUPER_ADMIN"]).optional(),
  reason: z.string().trim().min(3).max(500),
});

// PATCH /api/admin/users/:id — suspend / ban / reinstate, or change role.
export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const admin = await requireRole("ADMIN");
  const { id } = await params;
  const input = await parseJson(req, body);
  const target = await db.user.findUnique({ where: { id }, select: { id: true, role: true, status: true } });
  if (!target) throw notFound("User");

  // Guard rails: no self-demotion/lockout, and only super-admins touch admins or grant admin roles.
  if (target.id === admin.id) throw forbidden();
  const touchesAdmins = ["ADMIN", "SUPER_ADMIN"].includes(target.role) || (input.role && ["ADMIN", "SUPER_ADMIN"].includes(input.role));
  if (touchesAdmins && admin.role !== "SUPER_ADMIN") throw forbidden();
  await requireRecentAuth(admin);
  const roleChanged = !!input.role && input.role !== target.role;

  await db.$transaction(async (tx) => {
    // Any role or status change ends the person's existing sessions.
    await tx.user.update({ where: { id }, data: { status: input.status, role: input.role, sessionVersion: { increment: 1 } } });
    if (input.status && input.status !== "ACTIVE") {
      await tx.traderProfile.updateMany({ where: { userId: id, status: "APPROVED" }, data: { status: "SUSPENDED" } });
    }
    await audit({
      actorId: admin.id, action: "user.update", entityType: "User", entityId: id, ipHash: ipHash(req),
      metadata: { from: { role: target.role, status: target.status }, to: { role: input.role, status: input.status }, reason: input.reason },
    }, tx);
  });
  await invalidatePrincipal(id);
  if (roleChanged && (touchesAdmins || input.role === "TRADER")) {
    void securityAlert("admin_role_change", `Role changed: ${target.role} → ${input.role}`, { userId: id, by: admin.id, reason: input.reason });
  }
  return NextResponse.json({ ok: true });
});
