/* Operator recovery: turn off two-step sign-in for an account that lost its
 * phone and recovery codes, after verifying the person out of band.
 *   npm run mfa:reset -- someone@example.com "verified by phone, ticket #123"
 * Signs the account out everywhere and records the action in the audit log. */
import { PrismaClient } from "@prisma/client";
import { audit } from "../src/server/audit";

const db = new PrismaClient();
const [email, reason] = process.argv.slice(2);
if (!email || !reason) {
  console.error('Usage: npm run mfa:reset -- <email> "<how the person was verified>"');
  process.exit(1);
}
const user = await db.user.findUnique({ where: { email }, select: { id: true, mfaEnabledAt: true } });
if (!user) {
  console.error(`No account with email ${email}`);
  process.exit(1);
}
await db.user.update({
  where: { id: user.id },
  data: { mfaSecret: null, mfaEnabledAt: null, mfaLastStep: null, mfaRecoveryCodes: [], sessionVersion: { increment: 1 } },
});
await audit({ action: "user.mfa_reset_by_operator", entityType: "User", entityId: user.id, metadata: { reason, operator: process.env.USER ?? "unknown" } });
console.log(`Two-step sign-in reset for ${email}. They will be asked to set it up again at next sign-in (staff accounts) or can turn it back on from Sign-in & security.`);
await db.$disconnect();
