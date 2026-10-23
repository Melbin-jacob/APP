import { COMPANY } from "@/lib/company";
import { redis } from "@/lib/redis";
import { sendEmail } from "../email/transport";
import { logEvent } from "../log";

export type AlertKind =
  | "login_failure_spike"
  | "account_lockout"
  | "export_spike"
  | "admin_role_change"
  | "admin_new_network"
  | "mfa_disabled"
  | "audit_chain_broken"
  | "settings_changed";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Security alert: always a structured log line (for the SIEM), plus an email to
 * the security contact, at most once per kind+key per throttle window so an
 * attack doesn't also flood the inbox. Never throws.
 */
export async function securityAlert(kind: AlertKind, summary: string, details: Record<string, unknown> = {}, opts: { key?: string; throttleSeconds?: number } = {}) {
  logEvent("security_alert", { kind, summary, ...details }, "warn");
  try {
    const first = await redis.set(`alert:${kind}:${opts.key ?? "all"}`, "1", "EX", opts.throttleSeconds ?? 15 * 60, "NX");
    if (first !== "OK") return;
    const rows = Object.entries(details).map(([k, v]) => `<tr><td style="padding:2px 12px 2px 0;color:#7b8794">${esc(k)}</td><td>${esc(String(v))}</td></tr>`).join("");
    await sendEmail({
      to: COMPANY.securityEmail,
      subject: `[Security alert] ${summary}`,
      html: `<p style="font-family:Arial;font-size:14px"><strong>${esc(summary)}</strong></p><table style="font-family:Arial;font-size:13px">${rows}</table>
        <p style="font-family:Arial;font-size:12px;color:#7b8794">Kind: ${esc(kind)} · ${new Date().toISOString()}. Check the ops console audit log, and follow docs/security/INCIDENT_RESPONSE.md if this looks like an incident.</p>`,
      text: `${summary}\n\n${Object.entries(details).map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nKind: ${kind}`,
      tag: "security_alert",
    });
  } catch (err) {
    logEvent("security_alert_delivery_failed", { kind, error: String(err) }, "error");
  }
}

/**
 * Fixed-window counter: returns true exactly once, when `threshold` is crossed
 * within the window. Used for spikes (failed logins, exports).
 */
export async function crossedThreshold(name: string, threshold: number, windowSeconds: number) {
  try {
    const key = `spike:${name}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, windowSeconds * 2);
    return n === threshold;
  } catch {
    return false;
  }
}
