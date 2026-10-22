# HomeServices Direct

A marketplace that connects homeowners with independent local home-service professionals.
It covers geo search, trader profiles, verified review emails with single-use links, and an
ops console with a site-wide ad-banner switch.

**Stack:** Next.js 15 (App Router, TypeScript), Tailwind CSS, React Query, NextAuth
(email/password, magic link, Google OAuth), PostgreSQL 16 + PostGIS via Prisma, Redis,
and AWS SES or SMTP.

The schema, component tree, full API spec and security mapping are in
**[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Quick start

```bash
# Prerequisites: Node 20+, PostgreSQL 16 with PostGIS, Redis 7
cp .env.example .env            # then fill in the secrets (openssl rand -base64 32)
npm install
npx prisma migrate deploy       # creates tables, PostGIS trigger, GIST/trigram indexes
npm run db:seed                 # categories, 16 demo traders, banners, super-admin
npm run dev
```

Seeded logins (dev only): `admin@homeservices.local` and `trader0@homeservices.local`, both with password `ChangeMe-123456`.

With `EMAIL_TRANSPORT=console`, emails such as review requests and magic links are printed to the
server log instead of being sent. This setting is refused when `NODE_ENV=production`.

## Scripts

| | |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` / `lint` / `test` | tsc, ESLint, Vitest |
| `npm run db:migrate` / `db:deploy` / `db:seed` / `db:studio` | Prisma |

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

- Set `EMAIL_TRANSPORT=ses`, verify the sending domain, and configure SPF, DKIM and DMARC.
- Add an SES configuration set for bounces and complaints.
- Schedule `POST /api/cron/flush-banner-stats` every 5 minutes with `Authorization: Bearer $CRON_SECRET`.
- Put the app behind a trusted proxy that overwrites `X-Forwarded-For`, since rate limiting keys on it.
- Replace the fallback `geocode()` in `src/server/services/search.ts` with a real geocoder (Mapbox, Google or postcodes.io).
- Add an upload pipeline that issues S3 presigned URLs for logos, gallery images and credentials. Store credential documents in a private bucket.
- Have counsel review the `/terms` and `/privacy` pages and `src/lib/legal.ts`.
