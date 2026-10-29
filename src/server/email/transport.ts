import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/lib/env";

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Where replies go (e.g. the visitor who used the contact form). */
  replyTo?: string;
  /** SES configuration-set / SendGrid category for delivery analytics. */
  tag?: string;
  /** Non-essential mail must carry a one-click unsubscribe (RFC 8058, Gmail/Yahoo sender rules). */
  unsubscribe?: { url: string; oneClickUrl: string };
  /**
   * Marketing or promotional mail (newsletters, launch announcements, review
   * requests). CAN-SPAM and CASL require a working unsubscribe in every such
   * message, so sending one without `unsubscribe` is refused.
   */
  commercial?: boolean;
};

function listHeaders(email: OutgoingEmail): Record<string, string> {
  if (!email.unsubscribe) return {};
  return {
    "List-Unsubscribe": `<${email.unsubscribe.oneClickUrl}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

let ses: SESv2Client | undefined;
let smtp: Transporter | undefined;

export async function sendEmail(email: OutgoingEmail): Promise<{ messageId?: string }> {
  if (email.commercial && !email.unsubscribe) {
    throw new Error(`Refusing to send commercial email "${email.subject}" without an unsubscribe link (CAN-SPAM / CASL)`);
  }
  const { EMAIL_TRANSPORT, EMAIL_FROM, AWS_REGION, SMTP_URL } = env();

  if (EMAIL_TRANSPORT === "console") {
    console.info(`[email] to=${email.to} subject="${email.subject}"\n${email.text}`);
    return {};
  }

  if (EMAIL_TRANSPORT === "ses") {
    ses ??= new SESv2Client({ region: AWS_REGION });
    const out = await ses.send(
      new SendEmailCommand({
        FromEmailAddress: EMAIL_FROM,
        Destination: { ToAddresses: [email.to] },
        ReplyToAddresses: email.replyTo ? [email.replyTo] : undefined,
        Content: {
          Simple: {
            Subject: { Data: email.subject, Charset: "UTF-8" },
            Body: { Html: { Data: email.html, Charset: "UTF-8" }, Text: { Data: email.text, Charset: "UTF-8" } },
            Headers: Object.entries(listHeaders(email)).map(([Name, Value]) => ({ Name, Value })),
          },
        },
        EmailTags: email.tag ? [{ Name: "type", Value: email.tag }] : undefined,
      }),
    );
    return { messageId: out.MessageId };
  }

  smtp ??= nodemailer.createTransport(SMTP_URL);
  const { to, subject, html, text, replyTo } = email;
  const info = await smtp.sendMail({ from: EMAIL_FROM, to, replyTo, subject, html, text, headers: listHeaders(email) });
  return { messageId: info.messageId };
}
