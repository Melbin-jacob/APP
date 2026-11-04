import { createHash } from "node:crypto";
import { COMPANY } from "@/lib/company";
import { redis } from "@/lib/redis";
import { sendEmail } from "./email/transport";
import { logEvent } from "./log";

// Error alerts without a third-party tracker: every unexpected error is a
// structured log line, and the first of its kind in an hour is emailed to
// ALERT_EMAIL. Nothing about the visitor goes in: no request body, query
// string, cookies, IP address or user id, and personal-looking text in the
// message (emails, phone numbers, tokens) is masked.

export type ErrorSource = "api" | "page" | "browser";
type Where = { path?: string; method?: string; digest?: string };

const PER_ERROR_SECONDS = 60 * 60; // one email per distinct error per hour
const MAX_EMAILS_PER_HOUR = 30; // and never more than this in total

/** Masks text that could identify a person, and caps the length. */
export function scrub(text: string, max = 500) {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/\+?\d[\d ()-]{6,}\d/g, "[number]")
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, "[token]")
    .slice(0, max);
}

/** The path only: query strings can carry search terms, tokens or postal codes. */
export const pathOnly = (path?: string) => (path ? path.split(/[?#]/)[0]!.slice(0, 200) : undefined);

/** Same error, same fingerprint: numbers and ids in the message don't make it "new". */
export function fingerprint(name: string, message: string, stack?: string) {
  const firstFrame = stack?.split("\n").find((l) => l.trim().startsWith("at ")) ?? "";
  const norm = `${name}|${message.replace(/\d+/g, "#")}|${firstFrame.replace(/:\d+:\d+/g, "")}`;
  return createHash("sha256").update(norm).digest("hex").slice(0, 16);
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Records an unexpected error and, unless throttled, emails it. Never throws. */
export async function reportError(source: ErrorSource, err: unknown, where: Where = {}) {
  const e = err instanceof Error ? err : new Error(typeof err === "string" ? err : "Non-error thrown");
  const name = e.name || "Error";
  const message = scrub(e.message || "(no message)");
  const stack = e.stack ? scrub(e.stack.split("\n").slice(1, 13).join("\n"), 3000) : undefined;
  const path = pathOnly(where.path);
  const fp = fingerprint(name, message, e.stack);
  logEvent("app_error", { source, name, message, path, method: where.method, digest: where.digest, fingerprint: fp, stack }, "error");

  if (process.env.NODE_ENV === "test" || process.env.ERROR_ALERTS === "off") return;
  try {
    const seen = await redis.incr(`err:seen:${fp}`);
    if (seen === 1) await redis.expire(`err:seen:${fp}`, 7 * 24 * 60 * 60);
    if ((await redis.set(`err:mailed:${fp}`, "1", "EX", PER_ERROR_SECONDS, "NX")) !== "OK") return;
    const hour = `err:mails:${Math.floor(Date.now() / 3_600_000)}`;
    const sent = await redis.incr(hour);
    if (sent === 1) await redis.expire(hour, 7200);
    if (sent > MAX_EMAILS_PER_HOUR) return;

    const where_ = [source, where.method, path].filter(Boolean).join(" ");
    const subject = `[GetTradePros error] ${name}: ${message.slice(0, 80)} (${where_})`;
    const rows: [string, string][] = [
      ["Where", where_], ["When", new Date().toISOString()], ["Seen", `${seen} time${seen === 1 ? "" : "s"} in the last 7 days`],
      ["Fingerprint", fp], ...(where.digest ? [["Next.js digest", where.digest] as [string, string]] : []),
    ];
    await sendEmail({
      to: process.env.ALERT_EMAIL || COMPANY.securityEmail,
      subject,
      html: `<div style="font-family:Arial;font-size:14px"><p><strong>${esc(name)}: ${esc(message)}</strong></p>
        <table style="font-size:13px">${rows.map(([k, v]) => `<tr><td style="padding:2px 12px 2px 0;color:#7b8794">${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}</table>
        ${stack ? `<pre style="font-size:12px;background:#f5f7fa;padding:12px;white-space:pre-wrap">${esc(stack)}</pre>` : ""}
        <p style="font-size:12px;color:#7b8794">More of the same error within the hour won't be emailed; search the logs for fingerprint ${fp}.</p></div>`,
      text: `${name}: ${message}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${stack ?? ""}`,
      tag: "error_alert",
    });
  } catch (mailErr) {
    logEvent("error_alert_delivery_failed", { fingerprint: fp, error: String(mailErr) }, "error");
  }
}
