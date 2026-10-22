import type { EmailScope } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { hashToken, safeEqual } from "@/lib/crypto";

// Signed, stateless unsubscribe links: the signature is the authorisation, so
// links work from any mail client without signing in (RFC 8058 one-click).

const sign = (payload: string) => hashToken(`unsubscribe:${payload}`, env().REVIEW_TOKEN_PEPPER).slice(0, 32);

export function unsubscribeToken(email: string, scope: EmailScope) {
  const payload = Buffer.from(JSON.stringify({ e: email.toLowerCase(), s: scope })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readUnsubscribeToken(token: string): { email: string; scope: EmailScope } | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return null;
  try {
    const { e, s } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { e: string; s: EmailScope };
    return s === "REVIEW_REQUESTS" || s === "NEWSLETTER" ? { email: e, scope: s } : null;
  } catch {
    return null;
  }
}

export function unsubscribeLinks(email: string, scope: EmailScope) {
  const t = encodeURIComponent(unsubscribeToken(email, scope));
  return {
    /** Human-facing page with a confirm button (safe against link scanners). */
    url: `${env().APP_URL}/unsubscribe?t=${t}`,
    /** Target of List-Unsubscribe / List-Unsubscribe-Post for one-click unsubscribe in mail clients. */
    oneClickUrl: `${env().APP_URL}/api/email/unsubscribe?t=${t}`,
  };
}

export async function isOptedOut(email: string, scope: EmailScope) {
  return !!(await db.emailOptOut.findUnique({ where: { email_scope: { email: email.toLowerCase(), scope } } }));
}

export async function optOut(email: string, scope: EmailScope) {
  await db.emailOptOut.upsert({
    where: { email_scope: { email: email.toLowerCase(), scope } },
    create: { email: email.toLowerCase(), scope },
    update: {},
  });
  if (scope === "NEWSLETTER") {
    await db.newsletterSubscriber.updateMany({ where: { email: email.toLowerCase() }, data: { unsubscribedAt: new Date() } });
  }
}
