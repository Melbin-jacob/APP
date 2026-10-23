import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRecentAuth, requireRole } from "@/server/auth";
import { securityAlert } from "@/server/services/security-alerts";
import { audit } from "@/server/audit";
import { ipHash, parseJson, route } from "@/server/http";
import { getAllSettings, setSetting } from "@/server/settings";

// Each switch validated by its own type.
const body = z.discriminatedUnion("key", [
  z.object({ key: z.literal("ads.sideBanners.enabled"), value: z.boolean() }),
  z.object({ key: z.literal("reviews.autoPublish"), value: z.boolean() }),
  z.object({ key: z.literal("traders.requireApproval"), value: z.boolean() }),
  z.object({ key: z.literal("reviews.reportThreshold"), value: z.number().int().min(1).max(50) }),
]);

// GET /api/admin/settings
export const GET = route(async () => {
  await requireRole("SUPER_ADMIN");
  return NextResponse.json({ settings: await getAllSettings() });
});

// PUT /api/admin/settings — e.g. { key: "ads.sideBanners.enabled", value: false }
export const PUT = route(async (req) => {
  const admin = await requireRole("SUPER_ADMIN");
  const input = await parseJson(req, body);
  await requireRecentAuth(admin);
  // Narrowed per-key by the discriminated union above.
  await setSetting(input.key, input.value as never, admin.id);
  await audit({ actorId: admin.id, action: "settings.update", entityType: "SiteSetting", entityId: input.key, ipHash: ipHash(req), metadata: { value: input.value } });
  void securityAlert("settings_changed", `Site setting changed: ${input.key}`, { key: input.key, value: JSON.stringify(input.value), by: admin.id }, { key: input.key, throttleSeconds: 300 });
  return NextResponse.json({ ok: true });
});
