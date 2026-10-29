import { cookies } from "next/headers";
import { AGE_BLOCK_COOKIE, AGE_BLOCK_SECONDS, ageFrom, MIN_ACCOUNT_AGE } from "@/lib/age";
import { ApiError } from "./http";

const tooYoung = () =>
  new ApiError(403, "too_young", `You must be ${MIN_ACCOUNT_AGE} or older to create a GetTradePros account.`);

/** Refuses visitors who recently gave an under-age birth date (back button / retry). */
export async function assertNotAgeBlocked() {
  if ((await cookies()).get(AGE_BLOCK_COOKIE)) throw tooYoung();
}

/**
 * Throws (and remembers the refusal in a cookie) when the birth date is under
 * the minimum age. Nothing about the visitor is stored server-side.
 */
export async function assertOldEnough(birthMonth: number, birthYear: number) {
  if (ageFrom(birthMonth, birthYear) >= MIN_ACCOUNT_AGE) return;
  (await cookies()).set(AGE_BLOCK_COOKIE, "1", { maxAge: AGE_BLOCK_SECONDS, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
  throw tooYoung();
}
