// Smoke test: every public page type must render (HTTP 200) on a running app.
// Usage: npm run smoke            (defaults to http://localhost:3000)
//        BASE_URL=https://staging.example.com npm run smoke
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

const get = (path, headers = {}) => fetch(`${BASE}${path}`, { redirect: "manual", headers });

const search = await get("/api/search?pageSize=1", { "x-country-code": "CA" }).then((r) => r.json());
const slug = search.items?.[0]?.slug;
if (!slug) {
  console.error("No listings found: is the database seeded?");
  process.exit(1);
}

const pages = [
  "/", "/search?q=plumb", "/search?location=10001", "/categories", `/traders/${slug}`, `/traders/${slug}/quote`, `/traders/${slug}/claim`,
  "/login", "/register", "/register?type=trader", "/review?token=invalid", "/unsubscribe?t=invalid",
  "/terms", "/privacy", "/legal", "/legal/cookies", "/legal/privacy-choices", "/legal/privacy-rights",
  "/legal/disclaimer", "/legal/accessibility", "/legal/security", "/.well-known/security.txt", "/api/health",
];
const languages = ["en", "fr", "es", "ar"];

let failed = 0;
for (const path of pages) {
  for (const lang of path.startsWith("/api") || path.startsWith("/.well-known") ? ["en"] : languages) {
    const res = await get(path, { cookie: `hsd_locale=${lang}` });
    const ok = res.status === 200;
    if (!ok) failed++;
    console.log(`${ok ? "ok  " : "FAIL"} ${res.status} ${lang} ${path}`);
  }
}
console.log(failed ? `\n${failed} page(s) failed` : "\nAll pages render.");
process.exit(failed ? 1 : 0);
