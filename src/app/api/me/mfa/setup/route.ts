import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth";
import { enforceRateLimit, route } from "@/server/http";
import { beginMfaSetup } from "@/server/services/mfa";

// POST /api/me/mfa/setup — a fresh secret + QR code to scan (nothing is enabled yet).
export const POST = route(async () => {
  const user = await requireUser();
  await enforceRateLimit("login", `mfa-setup:${user.id}`);
  return NextResponse.json(await beginMfaSetup(user.id, user.email));
});
