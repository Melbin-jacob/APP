# Hosting security checklist (to finish once hosting is chosen)

The application-level controls are built. These items depend on where the app
runs. Tick them off before go-live.

## Network and segmentation
- [ ] App, database and Redis in separate subnets; database and Redis in **private** subnets with no public address.
- [ ] Security groups / firewall: only the app tier may reach Postgres (5432) and Redis (6379); nothing else inbound.
- [ ] If the host can't do private networking (e.g. Vercel without Secure Compute): managed Postgres/Redis with TLS required, IP allow-list or private link, strong unique passwords.
- [ ] Ops console behind an identity-aware proxy (e.g. Cloudflare Access) or IP allow-list (optional extra layer).

## Encryption and keys
- [ ] Postgres, Redis, backups and file storage encrypted at rest (AES-256) with keys in a KMS/HSM.
- [ ] `DATABASE_URL` with `sslmode=require` (or verify-full); `REDIS_URL` with `rediss://` or private network. The app warns at boot otherwise.
- [ ] TLS 1.2+ only (prefer 1.3) at the edge; HTTP → HTTPS redirect; HSTS already sent by the app (2 years, preload). Submit to hstspreload.org once stable.

## Secrets
- [ ] All secrets in a secret manager (AWS Secrets Manager, Vault, or the platform's encrypted env), never in the repo.
- [ ] Generate each with `openssl rand -base64 32`: `NEXTAUTH_SECRET`, `REVIEW_TOKEN_PEPPER`, `CRON_SECRET`, `MFA_ENCRYPTION_KEY` (the app refuses to start with weak or test values).
- [ ] Rotation schedule: DB/Redis/email credentials automatically (e.g. 90 days); app secrets yearly or on suspicion (see INCIDENT_RESPONSE.md for side effects).
- [ ] `ALLOW_INSECURE_LOCAL_SECRETS` and `REQUIRE_ADMIN_MFA=false` are **not** set.

## Database hardening
- [ ] Run migrations with an owner role; run the app with a separate role that has only SELECT/INSERT/UPDATE/DELETE on app tables and **does not own `AuditLog`** (so it can't disable the append-only triggers).
- [ ] Automated backups, point-in-time recovery, restore tested quarterly; backups in a separate account/project.

## Edge protection
- [ ] WAF in front of the app (Cloudflare, AWS WAF): OWASP core rule set, bot management, rate-based rules on `/api/auth/*`, `/api/reviews*`, `/api/traders/*/quotes`.
- [ ] DDoS protection (included with Cloudflare / AWS Shield Standard).
- [ ] Make sure the proxy overwrites `X-Forwarded-For` and sets a geo header (rate limiting and market detection depend on them).

## Logging, monitoring, alerting
- [ ] Ship stdout (JSON lines) to a central log store the app can't modify (CloudWatch with a separate account, Datadog, Better Stack, Elastic). Retain ≥ 1 year.
- [ ] SIEM/alert rules on: `security_alert` (all), `auth.login_failed` rate, `auth.login_blocked`, `startup.unsafe_config`, HTTP 5xx rate, `audit` events with `action` in (`user.update`, `settings.update`, `banner.*`, `user.mfa_*`).
- [ ] `SECURITY_EMAIL` inbox routed to on-call (pager/SMS for SEV-1).
- [ ] Uptime monitoring on `/api/health`.
- [ ] Schedule the integrity check: call *Verify integrity* (POST `/api/admin/audit-logs/verify`) daily, or verify from the central log copy.

## Pipeline
- [ ] Enable GitHub code scanning and secret scanning on the repository; protect the default branch (PR + passing CI required).
- [ ] Create a staging environment and set the repository variable `STAGING_URL` so the weekly OWASP ZAP scan (`.github/workflows/dast.yml`) runs.
- [ ] Scheduled jobs: `POST /api/cron/retention` daily and `POST /api/cron/flush-banner-stats` every 5 minutes, with `Authorization: Bearer $CRON_SECRET`.

## People and process
- [ ] Every staff account has two-step sign-in (enforced) and a password manager.
- [ ] Fill in the roles table in INCIDENT_RESPONSE.md; run a tabletop exercise.
- [ ] Privacy lawyer review of notification duties; register with the OPC/CAI where required.

## Legal settings before launch
See `docs/compliance/LAUNCH_COMPLIANCE.md`.
- [ ] `LEGAL_ENTITY_NAME`, `LEGAL_ADDRESS` (shown in every email; the app refuses to start without the address), `LEGAL_JURISDICTION`.
- [ ] DMCA designated agent registered at https://dmca.copyright.gov; `DMCA_AGENT_NAME`, `COPYRIGHT_EMAIL`, `DMCA_AGENT_ADDRESS` set to match. Renew every 3 years.
- [ ] Mailboxes exist and are monitored: support@, privacy@, security@, copyright@.
- [ ] Before any paid plan: automatic-renewal disclosures and online cancellation (see LAUNCH_COMPLIANCE.md #5).
