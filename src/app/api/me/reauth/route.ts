import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPassword } from "@/lib/crypto";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { RECENT_AUTH_SECONDS, requireUser } from "@/server/auth";
import { audit } from "@/server/audit";
import { ApiError, enforceRateLimit, ipHash, parseJson, route } from "@/server/http";
import { verifyMfaCode } from "@/server/services/mfa";

// POST /api/me/reauth { password, code? } — re-confirm identity before a sensitive
// action. Valid for 15 minutes. Accounts with two-step sign-in must give a code too.
export const POST = route(async (req) => {
  const user = await requireUser();
  await enforceRateLimit("login", `reauth:${user.id}`);
  const { password, code } = await parseJson(req, z.object({ password: z.string().min(1).max(200), code: z.string().max(20).optional() }));
  const row = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true, mfaEnabledAt: true } });
  const okPassword = !!row.passwordHash && (await verifyPassword(row.passwordHash, password));
  const okCode = !row.mfaEnabledAt || (!!code && !!(await verifyMfaCode(user.id, code)));
  if (!okPassword || !okCode) throw new ApiError(400, "wrong_credentials", row.mfaEnabledAt ? "That password or code isn't right" : "That password isn't right");
  await redis.set(`reauth:${user.id}`, "1", "EX", RECENT_AUTH_SECONDS);
  await audit({ actorId: user.id, action: "user.reauth", entityType: "User", entityId: user.id, ipHash: ipHash(req) });
  return NextResponse.json({ ok: true, mfa: !!row.mfaEnabledAt });
});
