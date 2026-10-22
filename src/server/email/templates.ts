// Transactional email templates. Every interpolated value goes through `esc`.
// Email clients don't run JS and most strip <form>, so the "interactive" star
// rating is five links that each open the tokenised review page with that
// rating preselected; the comment box lives on that page.

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

import { COMPANY } from "@/lib/company";

const BRAND = "#4caf2f";

// Sender identity + mailing address: required in commercial email by
// CAN-SPAM (US) and CASL (Canada).
const senderLine = () => `${esc(COMPANY.name)} · ${esc(COMPANY.address)}`;
const ACCENT = "#e8a317";

function layout(title: string, body: string, footer: string) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title></head>
<body style="margin:0;background:#f5f7fa;font-family:Arial,Helvetica,sans-serif;color:#1f2933">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:24px 0">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden">
<tr><td style="background:${BRAND};padding:16px 24px;color:#fff;font-size:18px;font-weight:bold">HomeServices Direct</td></tr>
<tr><td style="padding:28px 24px">${body}</td></tr>
<tr><td style="padding:16px 24px;background:#f5f7fa;color:#7b8794;font-size:12px;line-height:1.5">${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

export function reviewRequestEmail(input: {
  businessName: string;
  customerName?: string | null;
  reviewUrl: string; // contains the single-use token
  expiresAt: Date;
  unsubscribeUrl: string;
}) {
  const subject = `How was your service with ${input.businessName}?`;
  const greeting = input.customerName ? `Hi ${esc(input.customerName)},` : "Hi there,";
  const stars = [1, 2, 3, 4, 5]
    .map((n) => {
      const href = `${input.reviewUrl}&rating=${n}`;
      return `<a href="${esc(href)}" title="${n} star${n > 1 ? "s" : ""}" style="text-decoration:none;font-size:34px;color:${ACCENT};padding:0 4px">&#9733;</a>`;
    })
    .join("");
  const expires = input.expiresAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const html = layout(
    subject,
    `<p style="margin:0 0 12px;font-size:16px">${greeting}</p>
     <p style="margin:0 0 20px;font-size:15px;line-height:1.5"><strong>${esc(input.businessName)}</strong> recently completed a job for you.
     Your honest feedback helps neighbours choose the right professional.</p>
     <p style="margin:0 0 6px;font-size:14px;color:#3e4c59">Tap a star to rate:</p>
     <div style="margin:0 0 20px">${stars}</div>
     <p style="margin:0 0 8px;font-size:14px;color:#3e4c59">Add a comment:</p>
     <div style="border:1px solid #e4e7eb;border-radius:6px;padding:12px;color:#7b8794;font-size:14px;margin:0 0 20px">
       Tell others about the quality, punctuality and value&hellip;</div>
     <a href="${esc(input.reviewUrl)}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:999px">Submit Review</a>
     <p style="margin:20px 0 0;font-size:12px;color:#7b8794">This link is personal to you, works once, and expires on ${esc(expires)}.</p>`,
    `You received this because ${esc(input.businessName)} listed you as a customer on HomeServices Direct.
     HomeServices Direct is a directory only and is not party to any agreement between you and the service provider.<br><br>
     <a href="${esc(input.unsubscribeUrl)}" style="color:#7b8794">Unsubscribe from review requests</a> · ${senderLine()}`,
  );

  const text = `${input.customerName ? `Hi ${input.customerName},` : "Hi there,"}

${input.businessName} recently completed a job for you. Leave a rating and comment here (single use, expires ${expires}):
${input.reviewUrl}

HomeServices Direct is a directory only and is not party to any agreement between you and the service provider.

Unsubscribe from review requests: ${input.unsubscribeUrl}
${COMPANY.name} · ${COMPANY.address}`;

  return { subject, html, text };
}

export function magicLinkEmail(url: string) {
  const subject = "Your HomeServices Direct sign-in link";
  const html = layout(
    subject,
    `<p style="font-size:15px;line-height:1.5">Click the button below to sign in. The link expires in 10 minutes and can only be used once.</p>
     <a href="${esc(url)}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:999px">Sign in</a>`,
    "If you didn't request this, you can safely ignore this email.",
  );
  return { subject, html, text: `Sign in to HomeServices Direct: ${url}\n\nIf you didn't request this, ignore this email.` };
}

export function newsletterConfirmEmail(url: string) {
  const subject = "Confirm your subscription";
  const html = layout(
    subject,
    `<p style="font-size:15px;line-height:1.5">Please confirm you'd like to receive updates from HomeServices Direct.</p>
     <a href="${esc(url)}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:999px">Confirm</a>`,
    "You can unsubscribe at any time from any email we send.",
  );
  return { subject, html, text: `Confirm your subscription: ${url}` };
}
