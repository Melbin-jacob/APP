import { COMPANY } from "@/lib/company";

// RFC 9116 security contact. "Expires" must be under a year ahead; computing
// it keeps the file valid without manual updates.
export function GET() {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const expires = new Date(Date.now() + 180 * 86_400_000).toISOString();
  const body = [
    `Contact: mailto:${COMPANY.securityEmail}`,
    `Expires: ${expires}`,
    `Policy: ${base}/legal/security`,
    "Preferred-Languages: en, fr",
    `Canonical: ${base}/.well-known/security.txt`,
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
}
