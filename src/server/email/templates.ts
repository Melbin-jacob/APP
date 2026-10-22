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

// ─── Quote requests and listing claims ──────────────────────────────────────

export const CONTACT_TIME_LABELS: Record<string, string> = {
  WEEKDAY_MORNING: "Weekday mornings",
  WEEKDAY_AFTERNOON: "Weekday afternoons",
  WEEKDAY_EVENING: "Weekday evenings",
  WEEKEND: "Weekends",
  ANYTIME: "Any time",
};

type QuoteDetails = {
  businessName: string;
  name: string;
  email: string | null;
  phone: string;
  address: string;
  description: string;
  contactTimes: string[];
  contactNote: string | null;
};

const when = (q: QuoteDetails) =>
  [q.contactTimes.map((c) => CONTACT_TIME_LABELS[c] ?? c).join(", "), q.contactNote].filter(Boolean).join(" · ");

function quoteTable(q: QuoteDetails) {
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#7b8794;font-size:13px;vertical-align:top;white-space:nowrap">${k}</td><td style="padding:6px 0;font-size:14px">${v}</td></tr>`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px">
    ${row("Name", esc(q.name))}
    ${row("Phone", `<a href="tel:${esc(q.phone.replace(/[^+\d]/g, ""))}">${esc(q.phone)}</a>`)}
    ${q.email ? row("Email", `<a href="mailto:${esc(q.email)}">${esc(q.email)}</a>`) : ""}
    ${row("Address", esc(q.address))}
    ${row("Best time", esc(when(q)))}
  </table>
  <p style="margin:0 0 6px;font-size:13px;color:#7b8794">The job</p>
  <div style="border:1px solid #e4e7eb;border-radius:6px;padding:12px;font-size:14px;line-height:1.5;white-space:pre-wrap;margin:0 0 16px">${esc(q.description)}</div>`;
}

const quoteText = (q: QuoteDetails) => `Name: ${q.name}
Phone: ${q.phone}${q.email ? `\nEmail: ${q.email}` : ""}
Address: ${q.address}
Best time to contact: ${when(q)}

The job:
${q.description}`;

/** To the business owner (claimed listings), or to ops to pass on by phone (unclaimed). */
export function quoteRequestEmail(q: QuoteDetails & { forOps: boolean; dashboardUrl: string; adminUrl: string; listingPhone?: string }) {
  const subject = q.forOps ? `Quote request to forward: ${q.businessName}` : `New quote request from ${q.name}`;
  const intro = q.forOps
    ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.5"><strong>${esc(q.businessName)}</strong> hasn't claimed its listing, so this request came to us.
       Please pass it on by phone${q.listingPhone ? ` (<a href="tel:${esc(q.listingPhone.replace(/[^+\d]/g, ""))}">${esc(q.listingPhone)}</a>)` : ""}, invite them to claim the listing, then mark it handled.</p>`
    : `<p style="margin:0 0 16px;font-size:15px;line-height:1.5">A customer asked <strong>${esc(q.businessName)}</strong> for a quote on HomeServices Direct. Please get in touch with them directly.</p>`;
  const link = q.forOps ? q.adminUrl : q.dashboardUrl;
  const html = layout(
    subject,
    `${intro}${quoteTable(q)}
     <a href="${esc(link)}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:999px">${q.forOps ? "Open in ops console" : "View in your dashboard"}</a>`,
    `The customer agreed to share these details with ${esc(q.businessName)} for this quote only. Don't use them for marketing.
     HomeServices Direct is a directory only and is not party to any agreement between you and the customer.<br><br>${senderLine()}`,
  );
  const text = `${q.forOps ? `${q.businessName} hasn't claimed its listing. Pass this request on by phone${q.listingPhone ? ` (${q.listingPhone})` : ""}.` : `New quote request for ${q.businessName}.`}

${quoteText(q)}

${link}

The customer agreed to share these details for this quote only. Don't use them for marketing.
${COMPANY.name} · ${COMPANY.address}`;
  return { subject, html, text };
}

/** Receipt to the customer, when they gave an email address. */
export function quoteReceiptEmail(q: QuoteDetails & { claimed: boolean; profileUrl: string }) {
  const subject = `Your quote request to ${q.businessName}`;
  const next = q.claimed
    ? `We've sent your request to ${esc(q.businessName)}. They'll contact you directly.`
    : `${esc(q.businessName)} hasn't set up its account with us yet, so our team will pass your request on to them by phone. They'll contact you directly.`;
  const html = layout(
    subject,
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.5">Thanks, ${esc(q.name)}. ${next}</p>
     ${quoteTable(q)}
     <a href="${esc(q.profileUrl)}" style="color:${BRAND}">View ${esc(q.businessName)}'s profile</a>`,
    `HomeServices Direct is a directory only and is not party to any agreement between you and the service provider.
     Agree the price and scope with the business before work starts.<br><br>${senderLine()}`,
  );
  const text = `Thanks, ${q.name}. ${q.claimed ? `We've sent your request to ${q.businessName}.` : `${q.businessName} hasn't set up its account with us yet, so our team will pass your request on by phone.`} They'll contact you directly.

${quoteText(q)}

${q.profileUrl}

HomeServices Direct is a directory only and is not party to any agreement between you and the service provider.
${COMPANY.name} · ${COMPANY.address}`;
  return { subject, html, text };
}

export function claimDecisionEmail(input: { businessName: string; approved: boolean; dashboardUrl: string; note?: string | null }) {
  const subject = input.approved ? `You now manage ${input.businessName} on HomeServices Direct` : `About your claim for ${input.businessName}`;
  const body = input.approved
    ? `<p style="font-size:15px;line-height:1.5">Your claim for <strong>${esc(input.businessName)}</strong> is approved. You can now upload your logo, update your details and services, and receive quote requests.</p>
       <a href="${esc(input.dashboardUrl)}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:999px">Open your business dashboard</a>`
    : `<p style="font-size:15px;line-height:1.5">We couldn't confirm that you represent <strong>${esc(input.businessName)}</strong>, so we haven't attached the listing to your account.</p>
       ${input.note ? `<p style="font-size:14px;line-height:1.5;color:#3e4c59">${esc(input.note)}</p>` : ""}
       <p style="font-size:14px;line-height:1.5">If this is your business, reply to this email or contact ${esc(COMPANY.supportEmail)} and we'll help.</p>`;
  const text = input.approved
    ? `Your claim for ${input.businessName} is approved. Open your business dashboard: ${input.dashboardUrl}`
    : `We couldn't confirm that you represent ${input.businessName}.${input.note ? `\n\n${input.note}` : ""}\n\nContact ${COMPANY.supportEmail} if this is your business.`;
  return { subject, html: layout(subject, body, senderLine()), text };
}

export function claimReceivedEmail(input: { businessName: string; claimant: string; email: string; phone: string; jobTitle: string; message: string | null; adminUrl: string; listingPhone: string }) {
  const subject = `Listing claim to verify: ${input.businessName}`;
  const html = layout(
    subject,
    `<p style="font-size:15px;line-height:1.5"><strong>${esc(input.claimant)}</strong> (${esc(input.jobTitle)}, ${esc(input.email)}, ${esc(input.phone)})
     says they represent <strong>${esc(input.businessName)}</strong>.</p>
     ${input.message ? `<div style="border:1px solid #e4e7eb;border-radius:6px;padding:12px;font-size:14px;white-space:pre-wrap;margin:0 0 16px">${esc(input.message)}</div>` : ""}
     <p style="font-size:14px;line-height:1.5">Verify before approving, e.g. call the number on the listing (${esc(input.listingPhone || "none on file")}) and ask for them by name.</p>
     <a href="${esc(input.adminUrl)}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:999px">Review claim</a>`,
    senderLine(),
  );
  return { subject, html, text: `${input.claimant} (${input.jobTitle}, ${input.email}, ${input.phone}) claims ${input.businessName}. Verify, then review: ${input.adminUrl}` };
}
