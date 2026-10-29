import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ageFrom, birthInput, MIN_ACCOUNT_AGE } from "@/lib/age";
import { TOS_VERSION } from "@/lib/legal";
import { audit } from "@/server/audit";
import { assertOldEnough } from "@/server/age-gate";
import { invalidatePrincipal, requireUser } from "@/server/auth";
import { ApiError, ipHash, parseJson, route } from "@/server/http";
import { deleteAccount } from "@/server/services/accounts";

// POST /api/me/accept-terms { acceptTerms: true, version, birthMonth?, birthYear? }
// — records explicit acceptance of the current Terms (and the liability
// disclaimer) for users who signed up without the registration form or whose
// version is outdated. Accounts that never confirmed their age (Google /
// email-link sign-ups) must give a birth date; an under-age account is
// deleted on the spot, since it should never have been created (COPPA).
export const POST = route(async (req) => {
  const user = await requireUser();
  const input = await parseJson(req, z.object({
    acceptTerms: z.literal(true), version: z.literal(TOS_VERSION),
    birthMonth: birthInput.birthMonth.optional(), birthYear: birthInput.birthYear.optional(),
  }));
  const ip = ipHash(req);
  if (!user.ageConfirmed) {
    if (input.birthMonth == null || input.birthYear == null) throw new ApiError(400, "birth_date_required", "Enter your month and year of birth");
    if (ageFrom(input.birthMonth, input.birthYear) < MIN_ACCOUNT_AGE) {
      await deleteAccount(user.id, ip);
      await audit({ actorId: user.id, action: "user.age_gate_delete", entityType: "User", entityId: user.id, ipHash: ip });
      await assertOldEnough(input.birthMonth, input.birthYear); // sets the retry cookie and throws
    }
  }
  await db.user.update({
    where: { id: user.id },
    data: { tosVersion: input.version, tosAcceptedAt: new Date(), ...(user.ageConfirmed ? {} : { ageConfirmedAt: new Date() }) },
  });
  await audit({ actorId: user.id, action: "user.accept_terms", entityType: "User", entityId: user.id, ipHash: ip, metadata: { tosVersion: input.version } });
  await invalidatePrincipal(user.id);
  return NextResponse.json({ ok: true });
});
