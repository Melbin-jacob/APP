import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { safeEqual } from "@/lib/crypto";
import { audit } from "@/server/audit";
import { applyRetention } from "@/server/services/retention";

// POST /api/cron/retention — Authorization: Bearer $CRON_SECRET. Run daily.
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  if (!safeEqual(auth, `Bearer ${env().CRON_SECRET}`)) {
    return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  }
  const deleted = await applyRetention();
  await audit({ action: "retention.run", entityType: "System", metadata: deleted });
  return NextResponse.json({ deleted }, { headers: { "Cache-Control": "no-store" } });
}
