import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { Role, UserStatus } from "@prisma/client";
import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/crypto";
import { rateLimit } from "@/lib/rate-limit";
import { cached, invalidate } from "@/lib/redis";
import { magicLinkEmail } from "./email/templates";
import { sendEmail } from "./email/transport";
import { redirect } from "next/navigation";
import { TOS_VERSION } from "@/lib/legal";
import { ApiError, clientIpFrom, forbidden, unauthorized } from "./http";

const credentialsSchema = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(200) });

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
      credentials: { email: { type: "email" }, password: { type: "password" } },
      async authorize(raw, req) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();
        const headers = (req?.headers ?? {}) as Record<string, string | string[] | undefined>;
        const ip = clientIpFrom((n) => {
          const v = headers[n];
          return Array.isArray(v) ? v.join(",") : v;
        });

        // Two budgets: per-account (stops targeted guessing) and per-IP (stops spraying).
        const [byEmail, byIp] = await Promise.all([rateLimit("login", `e:${email}`), rateLimit("loginIp", ip)]);
        if (!byEmail.ok || !byIp.ok) throw new Error("RateLimited");

        const user = await db.user.findUnique({ where: { email } });
        const valid = await verifyPassword(user?.passwordHash ?? DUMMY_HASH, parsed.data.password);
        if (!user || !user.passwordHash || !valid) return null;
        if (user.status !== "ACTIVE") throw new Error("AccountDisabled");

        await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
        return { id: user.id, email: user.email, name: user.name, role: user.role };
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
    async signIn({ user }) {
      if (!user?.email) return false;
      const existing = await db.user.findUnique({ where: { email: user.email }, select: { status: true } });
      return !existing || existing.status === "ACTIVE";
    },
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = (user as { role?: Role }).role ?? "CUSTOMER";
      }
      return token;
    },
    async session({ session, token }) {
      session.user = { ...session.user, id: token.uid, email: session.user?.email ?? "", role: token.role };
      return session;
    },
  },
};

// ─── Server-side guards ──────────────────────────────────────────────────────

type Principal = { id: string; email: string; role: Role; status: UserStatus; tosVersion: string | null };

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
      select: { id: true, email: true, role: true, status: true, tosVersion: true },
    }),
  );
  if (!user || user.status !== "ACTIVE") return null;
  return user;
}

export const invalidatePrincipal = (userId: string) => invalidate(`principal:${userId}`);

const RANK: Record<Role, number> = { CUSTOMER: 0, TRADER: 1, ADMIN: 2, SUPER_ADMIN: 3 };

export async function requireUser(): Promise<Principal> {
  const user = await getPrincipal();
  if (!user) throw unauthorized();
  return user;
}

/** True when the user hasn't accepted the current Terms (OAuth / magic-link sign-ups, or Terms changed since). */
export const needsTerms = (user: Pick<Principal, "tosVersion">) => user.tosVersion !== TOS_VERSION;

/**
 * Page guard: send users who haven't accepted the current Terms to accept them
 * first. Not applied to the account page, so export and deletion always work.
 */
export function requireCurrentTerms(user: Pick<Principal, "tosVersion">, next: string) {
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
  return user;
}
