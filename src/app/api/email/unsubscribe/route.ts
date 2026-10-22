import { NextResponse } from "next/server";
import { ApiError, enforceRateLimit, ipHash, route } from "@/server/http";
import { audit } from "@/server/audit";
import { optOut, readUnsubscribeToken } from "@/server/services/email-prefs";

// POST /api/email/unsubscribe?t=<signed token>
// Used by our unsubscribe page and by mail clients' one-click unsubscribe
// (RFC 8058: POST with body "List-Unsubscribe=One-Click", no cookies, no
// Origin), so the signed token, not the session, is the authorisation.
export const POST = route(
  async (req) => {
    await enforceRateLimit("newsletter", ipHash(req));
    const target = readUnsubscribeToken(req.nextUrl.searchParams.get("t") ?? "");
    if (!target) throw new ApiError(400, "invalid_link", "This unsubscribe link is invalid");
    await optOut(target.email, target.scope);
    await audit({ action: "email.unsubscribe", entityType: "EmailOptOut", entityId: target.scope, ipHash: ipHash(req) });
    return NextResponse.json({ ok: true, scope: target.scope });
  },
  { sameOrigin: false },
);
