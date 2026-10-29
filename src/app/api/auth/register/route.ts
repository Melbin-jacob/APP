import { NextResponse } from "next/server";
import { z } from "zod";
import { assertNotAgeBlocked, assertOldEnough } from "@/server/age-gate";
import { enforceRateLimit, ipHash, parseJson, route } from "@/server/http";
import {
  customerRegistrationInput,
  registerCustomer,
  registerTrader,
  traderRegistrationInput,
} from "@/server/services/accounts";

const body = z.discriminatedUnion("accountType", [
  customerRegistrationInput.extend({ accountType: z.literal("customer") }),
  traderRegistrationInput.extend({ accountType: z.literal("trader") }),
]);

// POST /api/auth/register
export const POST = route(async (req) => {
  const ip = ipHash(req);
  await enforceRateLimit("register", ip);
  await assertNotAgeBlocked();
  const input = await parseJson(req, body);
  // Under-age sign-ups stop here: no account, nothing stored (COPPA).
  await assertOldEnough(input.birthMonth, input.birthYear);
  const result =
    input.accountType === "trader" ? await registerTrader(input, ip) : await registerCustomer(input, ip);
  return NextResponse.json(result, { status: 201 });
});
