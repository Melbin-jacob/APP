import { z } from "zod";

// Age gate for accounts (COPPA, 16 CFR § 312; Terms require adults because
// using the site means hiring and contracting with businesses).
//  - Asked neutrally (month and year of birth, no hint of the cut-off), as the
//    FTC recommends, rather than an "I am over 13" box that invites a fib.
//  - The birth date itself is never stored: only when age was confirmed.
//  - Anyone under the minimum gets no account, and a cookie stops an
//    immediate retry with a different answer.
export const MIN_ACCOUNT_AGE = 18;
export const COPPA_AGE = 13;
export const AGE_BLOCK_COOKIE = "age_gate";
export const AGE_BLOCK_SECONDS = 60 * 60 * 24;

/** Whole years, assuming the birthday falls at the end of the month (the cautious reading). */
export function ageFrom(birthMonth: number, birthYear: number, now = new Date()) {
  const month = now.getUTCMonth() + 1;
  return now.getUTCFullYear() - birthYear - (month <= birthMonth ? 1 : 0);
}

export const birthInput = {
  birthMonth: z.number({ error: "Enter your month of birth" }).int().min(1).max(12),
  birthYear: z.number({ error: "Enter your year of birth" }).int().min(1900).max(new Date().getUTCFullYear()),
};

/** Years offered in the form, newest first, without hinting at the cut-off. */
export function birthYears(now = new Date()) {
  const top = now.getUTCFullYear();
  return Array.from({ length: 101 }, (_, i) => top - i);
}
