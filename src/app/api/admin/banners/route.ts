import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { invalidate } from "@/lib/redis";
import { safeUrl } from "@/lib/sanitize";
import { requireRole } from "@/server/auth";
import { audit } from "@/server/audit";
import { ipHash, parseJson, route } from "@/server/http";

const httpsUrl = z.string().max(1000).refine((v) => safeUrl(v)?.startsWith("https://"), "Must be an https URL");

const bannerInput = z
  .object({
    name: z.string().trim().min(1).max(100),
    slot: z.enum(["LEFT", "RIGHT"]),
    kind: z.enum(["IMAGE", "SCRIPT"]),
    imageUrl: httpsUrl.optional(),
    targetUrl: httpsUrl.optional(),
    // Third-party ad tag. Never injected into our DOM: it's rendered inside a
    // sandboxed, opaque-origin iframe (see <AdSlot>), so it cannot read
    // cookies, storage or the page.
    scriptHtml: z.string().max(10_000).optional(),
    width: z.union([z.literal(160), z.literal(300)]).default(160),
    height: z.number().int().min(250).max(1050).default(600),
    weight: z.number().int().min(1).max(100).default(1),
    isActive: z.boolean().default(true),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
  })
  .refine((b) => (b.kind === "IMAGE" ? !!b.imageUrl && !!b.targetUrl : !!b.scriptHtml), {
    message: "IMAGE banners need imageUrl + targetUrl; SCRIPT banners need scriptHtml",
  });

// GET /api/admin/banners — all banners with 30-day impressions/clicks/CTR.
export const GET = route(async () => {
  await requireRole("SUPER_ADMIN");
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [banners, stats] = await Promise.all([
    db.banner.findMany({ orderBy: [{ slot: "asc" }, { createdAt: "desc" }] }),
    db.bannerStat.groupBy({ by: ["bannerId"], where: { day: { gte: since } }, _sum: { impressions: true, clicks: true } }),
  ]);
  const byId = new Map(stats.map((s) => [s.bannerId, s._sum]));
  return NextResponse.json({
    banners: banners.map((b) => {
      const s = byId.get(b.id);
      const impressions = s?.impressions ?? 0;
      const clicks = s?.clicks ?? 0;
      return { ...b, stats: { impressions, clicks, ctr: impressions ? clicks / impressions : 0 } };
    }),
  });
});

// POST /api/admin/banners
export const POST = route(async (req) => {
  const admin = await requireRole("SUPER_ADMIN");
  const input = await parseJson(req, bannerInput);
  const banner = await db.banner.create({ data: input });
  await audit({ actorId: admin.id, action: "banner.create", entityType: "Banner", entityId: banner.id, ipHash: ipHash(req) });
  await invalidate("banners:active");
  return NextResponse.json({ banner }, { status: 201 });
});
