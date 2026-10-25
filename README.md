# HomeServices Direct

A marketplace that connects homeowners with independent local home-service professionals.
It covers geo search, trader profiles, verified review emails with single-use links, and an
ops console with a site-wide ad-banner switch.

**Stack:** Next.js 15 (App Router, TypeScript), Tailwind CSS, React Query, NextAuth
(email/password, magic link, Google OAuth), PostgreSQL 16 + PostGIS via Prisma, Redis,
and AWS SES or SMTP.

The schema, component tree, full API spec and security mapping are in
**[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Try it

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/Melbin-jacob/APP?ref=claude/optimistic-ride-oiy31m)

Or run `docker compose up --build` and open http://localhost:3000. The test inbox is at http://localhost:8025.
**[TESTING.md](TESTING.md)** has the demo accounts and a walkthrough of every feature.

## Manual setup

```bash
# Prerequisites: Node 20+, PostgreSQL 16 with PostGIS, Redis 7
cp .env.example .env            # then fill in the secrets (openssl rand -base64 32)
npm install
npx prisma migrate deploy       # creates tables, PostGIS trigger, GIST/trigram indexes
npm run db:seed                 # categories, the business directory, settings, test logins
npm run dev
```

Seeded logins (dev only): `admin@` and `customer@homeservices.local`, both with password `ChangeMe-123456`.
There are no fake businesses: listings come from the business directory (below) or from real sign-ups.

### Business directory

`prisma/data/windsor-essex-directory.json` holds 894 Windsor-Essex (Ontario) businesses, converted from the
`windsor_essex_trades_directory.xlsx` spreadsheet. They are listed as **unclaimed**: no owner account,
marked "Unclaimed listing" on their profile with *claim* and *request removal* links (handled by support).

To load an updated spreadsheet:

```bash
python3 scripts/directory/convert_xlsx.py new-sheet.xlsx prisma/data/windsor-essex-directory.json
npm run db:import-directory      # or restart Docker: the seed runs the import
```

The import is idempotent (matched on the sheet's `#` column), never touches a listing a business has claimed,
and removes unclaimed listings that are no longer in the file. New trades need an entry in
`scripts/directory/convert_xlsx.py` and `prisma/categories.ts`, plus a translated name in `src/i18n/messages/*.ts`.

With `EMAIL_TRANSPORT=console`, emails such as review requests and magic links are printed to the
server log instead of being sent. This setting is refused when `NODE_ENV=production`.

## Scripts

| | |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` / `lint` / `test` | tsc, ESLint, Vitest |
| `npm run smoke` | Every public page renders (HTTP 200) on a running app; set `BASE_URL` to test another environment |
| `npm run db:migrate` / `db:deploy` / `db:seed` / `db:studio` | Prisma |
| `npm run db:import-directory` | Load or refresh the business directory from `prisma/data` |
| `npm run mfa:reset -- <email> "<how you verified them>"` | Turn off someone's two-step sign-in after they lost their phone and recovery codes (audited) |

## Layout

```
prisma/            schema.prisma, migrations (incl. PostGIS trigger + CHECKs), seed.ts
src/middleware.ts  CSP nonce + route gating
src/lib/           db, redis cache, rate limiter, crypto, sanitize, legal text, env
src/server/        auth (NextAuth + RBAC guards), http helpers, audit, settings, email, services/*
src/app/           (site)/ public pages · review/ · admin/ console · api/ route handlers
src/components/    layout, home, search, traders, ads, legal, admin, dashboard, ui
tests/             Vitest unit tests
```

## Production checklist

Security: the app refuses to start in production with weak or test secrets, a missing `MFA_ENCRYPTION_KEY`, an
`http://` APP_URL or admin two-step sign-in turned off. Infrastructure items (network segmentation, KMS, WAF, central
logs, secret rotation) are in [docs/security/HOSTING_CHECKLIST.md](docs/security/HOSTING_CHECKLIST.md). See also the
[threat model](docs/security/THREAT_MODEL.md), [data classification](docs/security/DATA_CLASSIFICATION.md) and
[incident response playbook](docs/security/INCIDENT_RESPONSE.md).

- Set `EMAIL_TRANSPORT=ses`, verify the sending domain, and configure SPF, DKIM and DMARC.
- Add an SES configuration set for bounces and complaints.
- Schedule `POST /api/cron/flush-banner-stats` every 5 minutes (it also saves the daily visitor totals) and `POST /api/cron/retention` daily,
  both with `Authorization: Bearer $CRON_SECRET`. The retention job enforces the periods published in the Privacy Policy.
- Set the legal-entity variables (`LEGAL_ENTITY_NAME`, `LEGAL_ADDRESS`, `LEGAL_JURISDICTION`, `PRIVACY_OFFICER`, `*_EMAIL`)
  and make sure the privacy and security mailboxes exist and are monitored.
- Put the app behind a trusted proxy that overwrites `X-Forwarded-For`, since rate limiting keys on it.
- Markets: `NEXT_PUBLIC_SUPPORTED_COUNTRIES` (default `CA,US`; the directory is Canada-only, so US visitors see no listings until US businesses sign up). Adding a country means a rule in `src/lib/postcode.ts`,
  a lookup in `src/server/services/geo.ts` (zippopotam.us covers ~60 countries) and translated postal labels.
- Visitor country comes from the hosting edge's geo header (`x-vercel-ip-country` on Vercel,
  `CloudFront-Viewer-Country` on AWS, `cf-ipcountry` on Cloudflare). Make sure your edge sets one.
- Exchange rates: European Central Bank reference rates via frankfurter.app, cached 6 hours, with built-in
  fallback rates if it's unreachable. Converted prices are labelled approximate.
- Translations: 12 languages in `src/i18n/messages/`, machine-quality. Have native speakers review them, and have
  counsel review the translated liability disclaimer. The Terms and Privacy pages are English-only for now.
- Add an upload pipeline that issues S3 presigned URLs for logos, gallery images and credentials. Store credential documents in a private bucket.
- Have counsel review everything under the footer's **Legal & compliance** section (`/terms`, `/privacy`, `/legal/*`)
  and `src/lib/legal.ts`. The pages are drafted for CCPA/CPRA, PIPEDA, Quebec Law 25, CAN-SPAM, CASL and ADA/AODA but are not legal advice.
- Add multi-factor authentication for admin accounts before launch (see docs/ARCHITECTURE.md §7).
