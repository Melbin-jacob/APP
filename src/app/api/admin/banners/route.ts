import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { invalidate } from "@/lib/redis";
import { safeUrl } from "@/lib/sanitize";
import { requireRecentAuth, requireRole } from "@/server/auth";
import { audit } from "@/server/audit";
import { ipHash, parseJson, route } from "@/server/http";

// An https URL, or a path on this site (house ads, e.g. "/search"). Not "//host" or "/\\host",
// which browsers treat as another site.
const httpsUrl = z
  .string()
  .max(1000)
  .refine((v) => /^\/(?![/\\])/.test(v) || safeUrl(v)?.startsWith("https://"), "Must be an https URL or a path on this site, e.g. /search");

// Standard IAB sizes each slot is laid out for.
const SLOT_SIZES: Record<string, (w: number, h: number) => boolean> = {
  LEFT: (w, h) => (w === 160 || w === 300) && h >= 250 && h <= 1050,
  RIGHT: (w, h) => (w === 160 || w === 300) && h >= 250 && h <= 1050,
  LEADERBOARD: (w, h) => w === 728 && h === 90,
  MOBILE: (w, h) => w === 320 && (h === 50 || h === 100),
};
const SLOT_SIZE_HINT: Record<string, string> = {
  LEFT: "160 or 300 wide, 250–1050 tall", RIGHT: "160 or 300 wide, 250–1050 tall", LEADERBOARD: "728×90", MOBILE: "320×100 or 320×50",
};

const bannerInput = z
  .object({
    name: z.string().trim().min(1).max(100),
    slot: z.enum(["LEFT", "RIGHT", "LEADERBOARD", "MOBILE"]),
    kind: z.enum(["IMAGE", "SCRIPT"]),
    imageUrl: httpsUrl.optional(),
    targetUrl: httpsUrl.optional(),
    // Third-party ad tag. Never injected into our DOM: it's rendered inside a
    // sandboxed, opaque-origin iframe (see <AdSlot>), so it cannot read
    // cookies, storage or the page.
    scriptHtml: z.string().max(10_000).optional(),
    width: z.number().int().default(160),
    height: z.number().int().default(600),
    weight: z.number().int().min(1).max(100).default(1),
    isActive: z.boolean().default(true),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
  })
  .refine((b) => (b.kind === "IMAGE" ? !!b.imageUrl && !!b.targetUrl : !!b.scriptHtml), {
    message: "IMAGE banners need imageUrl + targetUrl; SCRIPT banners need scriptHtml",
  })
  .superRefine((b, ctx) => {
    if (!SLOT_SIZES[b.slot]!(b.width, b.height)) ctx.addIssue({ code: "custom", path: ["width"], message: `Wrong size for ${b.slot}: use ${SLOT_SIZE_HINT[b.slot]}` });
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
  await requireRecentAuth(admin); // ad code runs on every page: re-confirm identity first
  const input = await parseJson(req, bannerInput);
  const banner = await db.banner.create({ data: input });
  await audit({ actorId: admin.id, action: "banner.create", entityType: "Banner", entityId: banner.id, ipHash: ipHash(req) });
  await invalidate("banners:active", "banners:active-ids");
  return NextResponse.json({ banner }, { status: 201 });
});
