import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { Role, UserStatus } from "@prisma/client";
import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/crypto";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { cached, invalidate, redis } from "@/lib/redis";

const redisGet = (key: string) => redis.get(key).catch(() => null);
import { anonymise } from "@/lib/crypto";
import { audit } from "./audit";
import { magicLinkEmail } from "./email/templates";
import { logEvent } from "./log";
import { verifyMfaCode } from "./services/mfa";
import { crossedThreshold, securityAlert } from "./services/security-alerts";
import { sendEmail } from "./email/transport";
import { redirect } from "next/navigation";
import { TOS_VERSION } from "@/lib/legal";
import { ApiError, clientIpFrom, forbidden, unauthorized } from "./http";

const credentialsSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(200),
  // Second step: 6-digit authenticator code or a recovery code (empty on the first attempt).
  otp: z.string().max(20).optional(),
});

/** Admin and super-admin sessions end after this long (default 12 h), whatever the cookie says. */
export const ADMIN_SESSION_SECONDS = Number(process.env.ADMIN_SESSION_SECONDS) || 12 * 60 * 60;
/** Sensitive actions need a sign-in or re-confirmation within this window (default 15 min). */
export const RECENT_AUTH_SECONDS = Number(process.env.RECENT_AUTH_SECONDS) || 15 * 60;

const isStaff = (role: Role) => role === "ADMIN" || role === "SUPER_ADMIN";
/** Two-step sign-in is mandatory for staff unless explicitly switched off (never in production). */
export const adminMfaRequired = () =>
  process.env.REQUIRE_ADMIN_MFA !== "false" || (process.env.NODE_ENV === "production" && process.env.ALLOW_INSECURE_LOCAL_SECRETS !== "true");

// A real hash so unknown-email logins cost the same as wrong-password ones
// (prevents user enumeration by timing).
const DUMMY_HASH = "$argon2id$v=19$m=19456,t=2,p=1$oKVfFKOMPtZBH4nw9CRPOg$vBdTSp5t1oF7V6QK1DiQ/haFSkeRW0+00X8VBUqNxj8";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login", verifyRequest: "/login?sent=1", error: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: { email: { type: "email" }, password: { type: "password" }, otp: { type: "text" } },
      async authorize(raw, req) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();
        const headers = (req?.headers ?? {}) as Record<string, string | string[] | undefined>;
        const ip = clientIpFrom((n) => {
          const v = headers[n];
          return Array.isArray(v) ? v.join(",") : v;
        });

        const ipHash = anonymise(ip, process.env.NEXTAUTH_SECRET ?? "dev");
        const emailHash = anonymise(email, process.env.NEXTAUTH_SECRET ?? "dev");

        // Two budgets: per-account (stops targeted guessing) and per-IP (stops spraying).
        const [byEmail, byIp] = await Promise.all([rateLimit("login", `e:${email}`), rateLimit("loginIp", ip)]);
        if (!byEmail.ok || !byIp.ok) {
          logEvent("auth.login_blocked", { emailHash, ipHash, reason: byEmail.ok ? "ip_limit" : "account_limit" }, "warn");
          if (!byEmail.ok) {
            void securityAlert("account_lockout", "An account was locked after repeated failed sign-ins", { account: emailHash, ipHash }, { key: emailHash, throttleSeconds: 3600 });
          }
          throw new Error("RateLimited");
        }

        const failed = async (reason: string) => {
          logEvent("auth.login_failed", { emailHash, ipHash, reason }, "warn");
          if (await crossedThreshold("login_failed", 50, 10 * 60)) {
            void securityAlert("login_failure_spike", "Unusual number of failed sign-ins (possible credential stuffing)", { threshold: "50 in 10 minutes", lastIpHash: ipHash });
          }
        };

        const user = await db.user.findUnique({ where: { email } });
        const valid = await verifyPassword(user?.passwordHash ?? DUMMY_HASH, parsed.data.password);
        if (!user || !user.passwordHash || !valid) {
          await failed("bad_credentials");
          return null;
        }
        if (user.status !== "ACTIVE") throw new Error("AccountDisabled");

        if (user.mfaEnabledAt) {
          if (!parsed.data.otp) throw new Error("MfaRequired");
          const method = await verifyMfaCode(user.id, parsed.data.otp);
          if (!method) {
            await failed("bad_mfa_code");
            throw new Error("MfaInvalid");
          }
          if (method === "recovery") logEvent("auth.recovery_code_used", { userId: user.id }, "warn");
        }

        // Only failed attempts should count towards the per-account lockout.
        await resetRateLimit("login", `e:${email}`);
        await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        logEvent("auth.login", { userId: user.id, role: user.role, ipHash, mfa: !!user.mfaEnabledAt });

        // Staff and business sign-ins go into the audit trail; a staff sign-in
        // from a network not seen before for that account raises an alert.
        if (isStaff(user.role) || user.role === "TRADER") {
          if (isStaff(user.role)) {
            const [seen, any] = await Promise.all([
              db.auditLog.findFirst({ where: { actorId: user.id, action: "auth.login", ipHash }, select: { id: true } }),
              db.auditLog.findFirst({ where: { actorId: user.id, action: "auth.login" }, select: { id: true } }),
            ]);
            if (any && !seen) {
              const country = headerValue(headers, "x-vercel-ip-country") ?? headerValue(headers, "cf-ipcountry") ?? headerValue(headers, "cloudfront-viewer-country") ?? "unknown";
              void securityAlert("admin_new_network", "Staff account signed in from a new network", { userId: user.id, role: user.role, ipHash, country }, { key: `${user.id}:${ipHash}`, throttleSeconds: 86_400 });
            }
          }
          await audit({ actorId: user.id, action: "auth.login", entityType: "User", entityId: user.id, ipHash, metadata: { mfa: !!user.mfaEnabledAt } });
        }
        return { id: user.id, email: user.email, name: user.name, role: user.role, sessionVersion: user.sessionVersion };
      },
    }),
    EmailProvider({
      maxAge: 10 * 60,
      async sendVerificationRequest({ identifier, url }) {
        const limited = await rateLimit("magicLink", identifier.toLowerCase());
        if (!limited.ok) throw new Error("RateLimited");
        const mail = magicLinkEmail(url);
        await sendEmail({ to: identifier, ...mail, tag: "magic_link" });
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user?.email) return false;
      const existing = await db.user.findUnique({ where: { email: user.email }, select: { status: true, role: true, mfaEnabledAt: true } });
      if (existing && existing.status !== "ACTIVE") return false;
      // Email links and Google skip the second step, so accounts with two-step
      // sign-in, and all staff accounts, must use password + code.
      if (account?.provider !== "credentials" && existing && (existing.mfaEnabledAt || isStaff(existing.role))) {
        return "/login?error=UsePassword";
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = (user as { role?: Role }).role ?? "CUSTOMER";
        token.sv = (user as { sessionVersion?: number }).sessionVersion ?? 0;
        token.authTime = Math.floor(Date.now() / 1000);
      }
      return token;
    },
    async session({ session, token }) {
      session.user = { ...session.user, id: token.uid, email: session.user?.email ?? "", role: token.role };
      session.sv = token.sv ?? 0;
      session.authTime = token.authTime ?? 0;
      return session;
    },
  },
};

// ─── Server-side guards ──────────────────────────────────────────────────────

type Principal = {
  id: string; email: string; role: Role; status: UserStatus; tosVersion: string | null;
  /** Confirmed old enough for an account (see lib/age). */
  ageConfirmed: boolean;
  mfaEnabled: boolean;
  /** Epoch seconds of the sign-in behind this session. */
  authTime: number;
};

function headerValue(headers: Record<string, string | string[] | undefined>, name: string) {
  const v = headers[name];
  return (Array.isArray(v) ? v[0] : v) || undefined;
}

/**
 * JWTs are stateless, so a ban would otherwise only bite at token expiry.
 * Role + status are re-read from Postgres (cached 60s in Redis) on every
 * authenticated request, and the cache is dropped when an admin changes them.
 */
export async function getPrincipal(): Promise<Principal | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await cached(`principal:${session.user.id}`, 60, () =>
    db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, role: true, status: true, tosVersion: true, ageConfirmedAt: true, sessionVersion: true, mfaEnabledAt: true },
    }),
  );
  if (!user || user.status !== "ACTIVE") return null;
  // Signed out everywhere since this session began (password/MFA change, admin action).
  if ((session.sv ?? 0) !== user.sessionVersion) return null;
  // Staff sessions are short-lived regardless of the cookie's lifetime.
  if (isStaff(user.role) && Date.now() / 1000 - (session.authTime ?? 0) > ADMIN_SESSION_SECONDS) return null;
  return {
    id: user.id, email: user.email, role: user.role, status: user.status, tosVersion: user.tosVersion,
    ageConfirmed: !!user.ageConfirmedAt, mfaEnabled: !!user.mfaEnabledAt, authTime: session.authTime ?? 0,
  };
}

export const invalidatePrincipal = (userId: string) => invalidate(`principal:${userId}`);

const RANK: Record<Role, number> = { CUSTOMER: 0, TRADER: 1, ADMIN: 2, SUPER_ADMIN: 3 };

export async function requireUser(): Promise<Principal> {
  const user = await getPrincipal();
  if (!user) throw unauthorized();
  return user;
}

/**
 * True when the user hasn't accepted the current Terms or confirmed their age
 * (OAuth / magic-link sign-ups, or Terms changed since).
 */
export const needsTerms = (user: Pick<Principal, "tosVersion" | "ageConfirmed">) => user.tosVersion !== TOS_VERSION || !user.ageConfirmed;

/**
 * Page guard: send users who haven't accepted the current Terms to accept them
 * first. Not applied to the account page, so export and deletion always work.
 */
export function requireCurrentTerms(user: Pick<Principal, "tosVersion" | "ageConfirmed">, next: string) {
  if (needsTerms(user)) redirect(`/legal/accept-terms?next=${encodeURIComponent(next)}`);
}

/**
 * Hierarchical RBAC: SUPER_ADMIN ⊃ ADMIN. TRADER is a separate capability, checked exactly.
 * Privileged APIs also require acceptance of the current Terms.
 */
export async function requireRole(role: Role): Promise<Principal> {
  const user = await requireUser();
  const allowed = role === "TRADER" ? user.role === "TRADER" : RANK[user.role] >= RANK[role];
  if (!allowed) throw forbidden();
  if (needsTerms(user)) throw new ApiError(403, "terms_required", "Please accept the current Terms of Service first");
  if (isStaff(user.role) && !user.mfaEnabled && adminMfaRequired()) {
    throw new ApiError(403, "mfa_setup_required", "Set up two-step sign-in on your account before using the ops console");
  }
  return user;
}

/** Signs a user out of every device: their existing sessions stop working within a minute. */
export async function endAllSessions(userId: string) {
  await db.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } });
  await invalidatePrincipal(userId);
}

/**
 * Step-up check for sensitive actions: the user must have signed in, or
 * re-confirmed with their password / two-step code, in the last 15 minutes.
 */
export async function requireRecentAuth(user: Principal) {
  if (Date.now() / 1000 - user.authTime <= RECENT_AUTH_SECONDS) return;
  if (await redisGet(`reauth:${user.id}`)) return;
  throw new ApiError(401, "reauth_required", "Please confirm it's you to continue");
}
