import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { newsletterConfirmEmail } from "@/server/email/templates";
import { sendEmail } from "@/server/email/transport";
import { enforceRateLimit, ipHash, parseJson, route } from "@/server/http";
import { newsletterSignature } from "@/server/services/newsletter";

const body = z.object({ email: z.string().trim().toLowerCase().email().max(254) });

// POST /api/newsletter — double opt-in. Always 202 so the endpoint can't be
// used to probe which addresses are subscribed.
export const POST = route(async (req) => {
  await enforceRateLimit("newsletter", ipHash(req));
  const { email } = await parseJson(req, body);
  const existing = await db.newsletterSubscriber.findUnique({ where: { email } });
  if (!existing?.confirmedAt || existing.unsubscribedAt) {
    await db.newsletterSubscriber.upsert({ where: { email }, create: { email }, update: { unsubscribedAt: null } });
    const url = `${env().APP_URL}/api/newsletter/confirm?email=${encodeURIComponent(email)}&sig=${newsletterSignature(email)}`;
    await sendEmail({ to: email, ...newsletterConfirmEmail(url), tag: "newsletter_confirm" });
  }
  return NextResponse.json({ ok: true }, { status: 202 });
});
