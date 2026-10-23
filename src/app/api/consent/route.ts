import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getPrincipal } from "@/server/auth";
import { enforceRateLimit, ipHash, parseJson, route } from "@/server/http";

const body = z.object({
  subjectId: z.string().uuid(),
  analytics: z.boolean(),
  ads: z.boolean(),
  gpc: z.boolean(),
  policyVersion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// POST /api/consent — records a cookie choice as proof of consent.
export const POST = route(async (req) => {
  const ip = ipHash(req);
  await enforceRateLimit("consent", ip);
  const input = await parseJson(req, body);
  const user = await getPrincipal();
  await db.consentRecord.create({ data: { ...input, userId: user?.id, ipHash: ip } });
  return NextResponse.json({ ok: true }, { status: 201 });
});
