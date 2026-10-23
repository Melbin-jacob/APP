import { NextResponse } from "next/server";
import { requireRole } from "@/server/auth";
import { verifyAuditChain } from "@/server/audit";
import { route } from "@/server/http";
import { securityAlert } from "@/server/services/security-alerts";

// POST /api/admin/audit-logs/verify — recompute the hash chain end to end.
export const POST = route(async () => {
  const admin = await requireRole("SUPER_ADMIN");
  const report = await verifyAuditChain();
  if (!report.ok) {
    await securityAlert("audit_chain_broken", "Audit log integrity check failed", { ...report.brokenAt, checkedBy: admin.id });
  }
  return NextResponse.json(report);
});
