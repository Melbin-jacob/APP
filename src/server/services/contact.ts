import { z } from "zod";
import { COMPANY } from "@/lib/company";
import { CONTACT_LIMITS as L, CONTACT_TOPICS } from "@/lib/contact";
import { PHONE_PATTERN } from "@/lib/quotes";
import { plainText } from "@/lib/sanitize";
import { contactMessageEmail } from "@/server/email/templates";
import { sendEmail } from "@/server/email/transport";
import { ApiError } from "@/server/http";
import { logEvent } from "@/server/log";

export const contactInput = z.object({
  name: z.string().trim().min(2).max(L.name),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.string().trim().max(L.phone).regex(PHONE_PATTERN, "Enter a valid phone number").optional().or(z.literal("").transform(() => undefined)),
  topic: z.enum(CONTACT_TOPICS),
  message: z.string().trim().min(L.messageMin).max(L.message),
  website: z.string().max(200).optional(), // honeypot: people leave it empty
});

/**
 * Emails a contact-form message to the team. Nothing is stored in the
 * database: the message lives in the support mailbox, and replying there
 * goes straight to the sender (Reply-To).
 */
export async function sendContactMessage(input: z.infer<typeof contactInput>, ipHash: string) {
  const name = plainText(input.name, L.name).replace(/[\r\n]+/g, " ");
  const message = plainText(input.message, L.message);
  if (name.length < 2 || message.length < L.messageMin) throw new ApiError(400, "bad_request", "Please check your name and message");
  // Privacy requests go to the privacy inbox so legal deadlines are tracked there.
  const to = input.topic === "privacy" ? COMPANY.privacyEmail : COMPANY.supportEmail;
  await sendEmail({
    to,
    replyTo: input.email,
    ...contactMessageEmail({ name, email: input.email, phone: input.phone ?? null, topic: input.topic, message }),
    tag: "contact_form",
  });
  logEvent("contact.message", { topic: input.topic, ipHash });
}
