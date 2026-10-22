import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth";
import { parseJson, route } from "@/server/http";
import { decideClaim } from "@/server/services/claims";

const body = z.object({ decision: z.enum(["APPROVE", "REJECT"]), note: z.string().trim().max(500).optional() });

// PATCH /api/admin/claims/:id — approve (attach the listing to the claimant) or reject.
export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const admin = await requireRole("ADMIN");
  const { decision, note } = await parseJson(req, body);
  await decideClaim((await params).id, decision, admin.id, note || undefined);
  return NextResponse.json({ ok: true });
});
