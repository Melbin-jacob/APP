# HomeServices Direct — Architecture

## 1. System overview

```
             ┌──────────── CloudFront / Vercel Edge (TLS, CDN, WAF) ────────────┐
Browser ───► │ middleware.ts: CSP nonce, coarse auth gate for /admin /dashboard │
             └──────────────────────────────┬───────────────────────────────────┘
                                            ▼
                 Next.js 15 (App Router) — stateless, horizontally scaled
       ┌───────────────────────┬────────────────────────┬──────────────────────┐
       │ RSC pages (site,      │ Route handlers /api/*  │ src/server/*         │
       │ trader dashboard,     │ (validation, RBAC,     │ services: search,    │
       │ admin console)        │ rate limit, CSRF)      │ reviews, accounts…   │
       └───────────┬───────────┴───────────┬────────────┴──────────┬───────────┘
                   ▼                       ▼                       ▼
        Aurora PostgreSQL 16 + PostGIS   Redis (ElastiCache)      SES / SMTP
        (Prisma ORM, raw SQL for geo)    rate limits, caches,     transactional
                                         banner counters          email
```

**Why one Next.js app instead of a separate NestJS/FastAPI service?** The API is
consumed only by this frontend, so a single deployable removes a network hop, a
second auth integration and duplicated types. `src/server` is framework-agnostic
TypeScript (services take plain inputs, return plain data), so it can be lifted
into a NestJS service later without rewriting business logic.

Deployment target (AWS): ECS Fargate service (≥ 2 tasks across AZs, CPU-based
autoscaling) behind an ALB, Aurora PostgreSQL Multi-AZ, ElastiCache Redis with
replica, SES with a configuration set for bounce/complaint handling, CloudFront
in front. `/api/health` is the ALB health check. The app is stateless (JWT
sessions), so any task can serve any request — the basis of the 99.9% target.
Vercel + Supabase works unchanged (Supabase ships PostGIS).

## 2. Data model

Source of truth: [`prisma/schema.prisma`](../prisma/schema.prisma); hand-written SQL
(trigger, CHECKs) at the bottom of the init migration.

| Table | Purpose / notable columns |
|---|---|
| `User` | Identity for all roles. `role` (CUSTOMER/TRADER/ADMIN/SUPER_ADMIN), `status` (ACTIVE/SUSPENDED/BANNED/PENDING_DELETION), Argon2id `passwordHash`, **`tosVersion` + `tosAcceptedAt`** (proof of disclaimer acceptance), `deletedAt`. |
| `Account`, `VerificationToken` | NextAuth adapter: OAuth links, magic-link tokens. |
| `TraderProfile` | Business listing. `latitude/longitude` + PostGIS **`location geography(Point,4326)`** (trigger-maintained, GIST index), `serviceRadiusKm`, `hourlyRatePence`, `phone` (never exposed) + `trackingPhone`, `operatingHours` JSON, `status` (PENDING/APPROVED/…), denormalised `ratingAvg/ratingCount`. |
| `Category`, `TraderCategory` | Trade taxonomy (trigram index on name for autocomplete); M:N with a primary flag. |
| `Service` | Priced service lines a trader offers. |
| `ServiceArea` | Explicit postcode/ZIP coverage in addition to the radius. |
| `GalleryImage`, `Credential` | Work photos; licences/certs/insurance with admin verification state. |
| `CallEvent` | Click-to-call tracking (hashed visitor id). |
| `Job` | Work a trader logs; completing it triggers the review email. |
| `ReviewRequest` | One single-use review link: **only an HMAC of the token is stored**, `expiresAt`, `usedAt`, status. |
| `Review` | `rating` (CHECK 1–5), `comment`, `isVerified`, `status` (PUBLISHED/PENDING_MODERATION/REMOVED), `reportCount`. |
| `ReviewReport` | Public abuse reports, resolved by moderators. |
| `Banner`, `BannerStat` | Side-rail creatives (IMAGE or SCRIPT, CHECK-enforced payload), scheduling, weights; daily impression/click roll-ups. |
| `SiteSetting` | Typed feature switches, e.g. `ads.sideBanners.enabled`. |
| `AuditLog` | Append-only record of every privileged or legally relevant action. |
| `NewsletterSubscriber`, `SearchQuery` | Double-opt-in list; search analytics. |

## 3. Frontend component hierarchy

```
app/layout.tsx  (RootLayout: <html lang dir>, PreferencesProvider[locale, messages, currency, rates, country],
│                Providers[Session, ReactQuery], CookieConsent)
├── (site)/…  each page renders <SiteShell fullBleed?>
│   SiteShell
│   ├── PreferencesBar (country · language · currency; "not in your country yet" notice)
│   ├── SiteHeader (Logo, nav, Login/Register, "List Your Business" CTA, MobileNav)
│   ├── {fullBleed}            ← Hero on the home page
│   ├── AdRail[left] · <main> · AdRail[right]   (rails omitted when the admin switch is OFF)
│   │                  └── AdSlot (IMAGE link → /click | SCRIPT → sandboxed iframe)
│   └── SiteFooter (links + full liability disclaimer)
│
│   page.tsx (home)
│   ├── Hero → SearchBar (location + keyword, debounced typeahead, ARIA combobox)
│   ├── CategoryGrid ("Most Popular Categories", icon + count)
│   ├── DirectoryGrid (filter tabs → React Query /api/search) → TraderCard[]
│   │     TraderCard: image, category badge, name, address, StarRating, CallButton, Request Quote,
│   │                 LegalDisclaimer(compact)
│   ├── NewsletterBanner
│   └── HowItWorks (3 steps)
│   search/, categories/, traders/[slug]/ (profile + LegalDisclaimer full, ReportReviewButton),
│   login/, register/ (customer | trader, mandatory ToS checkbox), account/ (export/delete),
│   dashboard/ (TraderDashboard: jobs, mark completed, request review), terms/, privacy/
├── review/page.tsx   — tokenised review page, no site chrome, Referrer-Policy: no-referrer
└── admin/layout.tsx  — console shell, server-side RBAC (404 for non-admins)
    ├── page.tsx (overview: totals, queues, 30-day charts, top searches, health)
    ├── traders/ (approve/suspend/reject, verify credentials)   users/ (suspend/ban/reinstate)
    ├── reviews/ (moderation queue, reports)                    banners/ (global switch, CRUD, stats)
    └── audit/ (filterable audit trail)
```

## 4. API specification

All JSON. Errors: `{ "error": { "code", "message", "issues?" } }` with 401/403/404/409/410/422/429.
Every non-GET request must carry a same-origin `Origin` header (CSRF guard).

### Public
| Method & path | Auth | Rate limit | Description |
|---|---|---|---|
| `GET /api/geo/postcode?country=&code=` | – | 30/min | Resolves a US ZIP or Canadian postal code → `{location: {postcode, city, region, country, latitude, longitude}}`; 404 unknown, 422 malformed / country not open, 503 lookup service down |
| `POST /api/preferences` `{country?, locale?, currency?}` | – | – | Remembers the visitor's market, language and currency (1-year cookies); overrides location-based defaults |
| `POST /api/auth/register` | – | 5/h/IP | `{accountType:"customer"\|"trader", email, password, name, acceptTerms:true, …trader fields}` → 201. A trader's city and coordinates are resolved on the server from `postcode`; any sent by the client are ignored |
| `POST /api/auth/callback/credentials`, `/signin/email`, `/signin/google` | – | login 5/15min/account + 50/15min/IP; magic link 3/15min | NextAuth |
| `GET /api/search?q&category&location&lat&lng&radiusKm&sort&page&pageSize` | – | 120/min | PostGIS + trigram search **within the visitor's country** → `{items, total, page, pageSize, country}` |
| `GET /api/search/autocomplete?q` | – | 120/min | `{suggestions:[{type, label, slug}]}`: category names in the visitor's language, businesses in their country |
| `GET /api/categories` | – | – | categories with approved-trader counts in the visitor's country |
| `GET /api/traders/:slug` | – | – | public profile (no phone, no documents) |
| `POST /api/traders/:slug/call` | – | 30/h | logs CallEvent, returns `{tel, display}` |
| `POST /api/reviews` | token | 5/h/IP | `{token, rating 1-5, comment?, authorName}` → 201 `{id, status}` / 410 token used/expired |
| `POST /api/reviews/:id/report` | optional | 10/h | `{reason, details?}` → 202 |
| `POST /api/newsletter` | – | 5/h | double opt-in, always 202 · `GET /api/newsletter/confirm?email&sig` |
| `GET /api/banners` · `GET /api/banners/:id/click` · `GET /api/banners/:id/frame` | – | – | current rails · counted redirect · sandboxed ad document |
| `GET /api/health` | – | – | `{ok, postgres, redis, latencyMs}` |

### Signed-in user
| `GET /api/me/export` | user | JSON download of all personal data (GDPR Art. 15/20, CCPA) |
|---|---|---|
| `DELETE /api/me` `{confirm:"DELETE MY ACCOUNT"}` | user | erasure + de-identification |

### Trader (`role = TRADER`)
| `GET/PATCH /api/trader/me` | profile read / customise (bio, rate, hours, logo, gallery…) |
|---|---|
| `GET/POST /api/trader/jobs` | list / log a job (customer email) |
| `POST /api/trader/jobs/:id/complete` | complete job → review email (50/day) |
| `GET/POST /api/trader/review-requests` | delivery status / ad-hoc review request `{customerEmail, customerName?}` |

### Admin (`ADMIN` ⊂ `SUPER_ADMIN`)
| Path | Min role | Description |
|---|---|---|
| `GET /api/admin/users`, `PATCH /api/admin/users/:id` `{status?, role?, reason}` | ADMIN (admin accounts: SUPER_ADMIN) | manage/suspend/ban |
| `GET /api/admin/traders?status`, `PATCH /api/admin/traders/:id` | ADMIN | approval queue |
| `PATCH /api/admin/credentials/:id` | ADMIN | verify/reject credential |
| `GET /api/admin/reviews?status&reported`, `PATCH /api/admin/reviews/:id` `{action}` | ADMIN | moderation |
| `GET /api/admin/analytics?days` | ADMIN | growth, searches, queues, health |
| `GET/PUT /api/admin/settings` | SUPER_ADMIN | feature switches incl. **side-banner kill switch** |
| `GET/POST /api/admin/banners`, `PATCH/DELETE /api/admin/banners/:id` | SUPER_ADMIN | banner CRUD + 30-day stats |
| `GET /api/admin/audit-logs` | SUPER_ADMIN | audit trail |
| `POST /api/cron/flush-banner-stats` | Bearer `CRON_SECRET` | Redis counters → `BannerStat` |

The brief asks for a super-admin-only console. Moderation and approvals are open to
`ADMIN` so ops staff can work the queues without access to ads and settings.
Change `minRole` in `admin/layout.tsx` and `requireRole("ADMIN")` calls to make it
SUPER_ADMIN-only.

## 5. Markets, languages and currencies

**Visitor context** (`src/server/visitor.ts`, resolved once per request):

| | Explicit choice (cookie) | Else location | Else |
|---|---|---|---|
| Market (listings shown) | `hsd_country`, if open | edge geo header (`x-vercel-ip-country`, `CloudFront-Viewer-Country`, `cf-ipcountry`), then the `Accept-Language` region, if that country is open | first of `NEXT_PUBLIC_SUPPORTED_COUNTRIES`, with a "not in your country yet" notice |
| Language | `hsd_locale` | best match in `Accept-Language` | English |
| Currency | `hsd_currency` | local currency of the detected country (even outside our markets) | market's currency |

- **Listings never cross markets.** Search, autocomplete, category counts and the home directory filter on
  `TraderProfile.country`, which is set from the server-side postal-code lookup at registration. The market
  comes from the visitor context, never from the query string. Profile pages stay reachable by direct link
  and say which country the business is in.
- **Languages:** 12 locales (`src/i18n/messages/*.ts`). English is the source; the type checker and a unit test
  ensure every locale has every key with the same placeholders. Only the active locale is sent to the browser.
  Arabic renders right-to-left. No locale prefix in URLs (one URL per page; add `/fr/...` routing if per-language SEO matters).
  The admin console, emails, server error messages and the Terms/Privacy pages are English for now.
- **Currencies:** prices are stored in the professional's own currency (minor units) and converted for display with
  ECB rates (`src/server/services/fx.ts`, cached 6 h, fallback table if unreachable). Converted prices are prefixed `≈`
  and show the original on hover. Nothing is charged through the platform, so display conversion is sufficient.

## 6. Post-job review workflow

1. Trader clicks **Mark completed** (or enters a customer email) → `createReviewRequest`.
   Checks: trader approved, not self-review, no request to that email in 30 days, daily cap.
2. 256-bit random token; **HMAC-SHA256(pepper, token)** stored, raw token only in the email.
3. Email (subject *"How was your service with {Business}?"*) shows five star links
   (`…&rating=N` pre-selects the rating), a comment prompt and a **Submit Review** CTA.
   Email clients strip forms and JS, so the stars are links and the comment is
   entered on the landing page.
4. `GET /review?token=` only *validates*. Mail scanners that prefetch links don't burn the token.
5. `POST /api/reviews` claims the token with a conditional `UPDATE … WHERE usedAt IS NULL AND expiresAt > now()`,
   so exactly one concurrent submit wins. The review is stored with `isVerified=true`, sanitised,
   spam-screened (links, floods, all-caps → moderation queue), and the trader's rating aggregate is recomputed.
   The profile cache is invalidated, so the review shows up right away.

## 7. Security & compliance mapping

| Requirement | Implementation |
|---|---|
| Injection (A03) | Prisma parameterised queries; raw geo SQL only via `Prisma.sql` tagged templates; LIKE wildcards escaped; Zod on every input. |
| XSS | User text stripped of markup on write (DOMPurify) and rendered as text by React; email templates escape every value; strict nonce-based CSP; third-party ad code isolated in a sandboxed opaque-origin iframe. |
| CSRF | SameSite=Lax session cookies + Origin check on every mutating API call; NextAuth's own CSRF token on auth endpoints. |
| Broken access control (A01) | Middleware gate plus server-side `requireRole()` on every handler and admin layout; role/ban status re-read from DB (Redis-cached 60s, invalidated on change). Admins can't change their own account or touch admin accounts unless SUPER_ADMIN. |
| Auth failures (A07) | Argon2id (OWASP params), constant-time dummy verify to prevent user enumeration, Redis sliding-window limits (atomic Lua) on login, register, magic link, review submit, report and newsletter. |
| Tokens | Single-use, expiring, hashed with server pepper, atomic claim, never in Referer. |
| Open redirect | Banner clicks redirect to DB-stored URLs only; login `callbackUrl` limited to relative paths. |
| Headers | HSTS preload, nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, CSP. |
| Liability shield | `acceptTerms: z.literal(true)` makes registration impossible without acceptance; version + timestamp stored and audited; compact disclaimer on every TraderCard, full disclaimer on every profile page and in the footer. |
| GDPR / CCPA | Cookie consent (opt-in, "Reject all" as prominent as "Accept"), self-service export and erasure, hashed IPs in logs, double-opt-in newsletter. |
| Audit | `AuditLog` row for registrations (ToS version), admin actions, moderation, settings, exports, deletions. |

### Additional controls (security & compliance review, Oct 2026)

| Control | Implementation |
|---|---|
| Rate-limit IP spoofing | Client IP comes from platform headers (`x-vercel-forwarded-for`, `cf-connecting-ip`, `x-real-ip`) or the **rightmost** `X-Forwarded-For` entry, never the client-controlled leftmost one |
| API hardening | JSON bodies capped at 64 KB (413); API responses default to `Cache-Control: no-store`; APIs get `Content-Security-Policy: default-src 'none'` |
| Extra headers | `Cross-Origin-Opener-Policy: same-origin`, `X-Permitted-Cross-Domain-Policies: none`, tightened `Permissions-Policy` |
| Dependencies | `npm audit --omit=dev`: 0 known vulnerabilities (nodemailer 10; patched postcss and deepmerge-ts via `overrides`). Remaining advisories are in dev-only tooling (ESLint, Tailwind 3 build) and need major upgrades |
| Terms acceptance | Every account must accept the current `TOS_VERSION` (OAuth / magic-link sign-ups included) before privileged pages or APIs; export and deletion never require it |
| Ad consent | Third-party ad scripts render only after advertising consent and never under Global Privacy Control (`ConsentGate`) |
| Global Privacy Control | Treated as a CCPA/CPRA opt-out of sale/sharing: recorded automatically, ads/analytics stay off |
| Email (CAN-SPAM, CASL, RFC 8058) | Signed unsubscribe links + `List-Unsubscribe` / `List-Unsubscribe-Post` headers, suppression list (`EmailOptOut`) checked before sending, sender mailing address in every commercial email |
| Storage limitation | Daily `POST /api/cron/retention` deletes data past the periods in `RETENTION_DAYS`, which the Privacy Policy renders |
| Disclosure | `/legal/security` policy and RFC 9116 `/.well-known/security.txt` |

**Known gaps to close before launch:** multi-factor authentication for ADMIN / SUPER_ADMIN accounts; breached-password
screening at sign-up (e.g. HIBP k-anonymity, per NIST 800-63B); professional translation and counsel review of legal pages;
a documented incident-response and breach-notification runbook; a Quebec Law 25 privacy impact assessment for cross-border hosting.
