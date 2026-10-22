import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import nodemailer from "nodemailer";
import { env } from "@/lib/env";

export type OutgoingEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** SES configuration-set / SendGrid category for delivery analytics. */
  tag?: string;
};

let ses: SESv2Client | undefined;
let smtp: nodemailer.Transporter | undefined;

export async function sendEmail(email: OutgoingEmail): Promise<{ messageId?: string }> {
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
        Content: {
          Simple: {
            Subject: { Data: email.subject, Charset: "UTF-8" },
            Body: { Html: { Data: email.html, Charset: "UTF-8" }, Text: { Data: email.text, Charset: "UTF-8" } },
          },
        },
        EmailTags: email.tag ? [{ Name: "type", Value: email.tag }] : undefined,
      }),
    );
    return { messageId: out.MessageId };
  }

  smtp ??= nodemailer.createTransport(SMTP_URL);
  const info = await smtp.sendMail({ from: EMAIL_FROM, ...email });
  return { messageId: info.messageId };
}
