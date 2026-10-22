import { env } from "@/lib/env";
import { hashToken } from "@/lib/crypto";

/** Stateless double-opt-in signature: HMAC(email). */
export const newsletterSignature = (email: string) => hashToken(`newsletter:${email}`, env().REVIEW_TOKEN_PEPPER);
