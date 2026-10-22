import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { enforceRateLimit, ipHash, parseJson, route } from "@/server/http";
import { claimInput, submitClaim } from "@/server/services/claims";

// POST /api/traders/:slug/claim — a signed-in user asks to manage an unclaimed listing.
export const POST = route<{ params: Promise<{ slug: string }> }>(async (req, { params }) => {
  const user = await requireUser();
  await enforceRateLimit("listingClaim", user.id);
  const input = await parseJson(req, claimInput);
  await submitClaim((await params).slug, user, input, ipHash(req));
  return NextResponse.json({ ok: true }, { status: 201 });
});
