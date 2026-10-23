# Threat model (STRIDE)

Scope: the HomeServices Direct web app (Next.js), its PostgreSQL database, Redis,
outbound email, the ops console, and the third parties it talks to. Reviewed
2026-10-23. Re-review when a component is added, a trust boundary moves, or
after any incident.

Status: ✅ in place · 🟡 partly / depends on hosting · ⬜ not yet (see HOSTING_CHECKLIST.md)

## Assets

| Asset | Why it matters |
|---|---|
| Accounts and credentials (password hashes, MFA secrets, sessions) | Account takeover; staff accounts control the whole site |
| Customer personal data (names, emails, phones, addresses, quote details) | Privacy law exposure (PIPEDA, Law 25, CCPA) and harm to people |
| Business listings, reviews, ratings | Marketplace integrity; defamation and fraud risk |
| Ad slots and site settings | Script injection to every visitor |
| Audit log | Evidence for investigations and regulators |
| Secrets (NEXTAUTH_SECRET, REVIEW_TOKEN_PEPPER, MFA_ENCRYPTION_KEY, DB/Redis/email credentials) | Forged sessions/links, decrypted MFA seeds, data access |

## Trust boundaries

1. Internet → edge (CDN/WAF) → app. Everything from the browser is untrusted.
2. Email links/forms → app (review invitations, quote receipts, unsubscribe): authorised only by single-use or signed tokens.
3. App → PostgreSQL / Redis (private network once hosted).
4. App → third parties: postal-code lookup, FX rates, email provider, ad iframes.
5. Staff → ops console (highest privilege).

## STRIDE by component

### 1. Public site and APIs
| | Threat | Controls |
|---|---|---|
| S | Forged requests from other sites (CSRF) | ✅ Same-origin `Origin` check on every non-GET API (`src/server/http.ts`), SameSite=Lax session cookie |
| T | Injection (SQL, XSS, header) | ✅ Prisma/parameterised SQL only (lint bans `$queryRawUnsafe`), zod validation on every input, React output encoding, HTML stripped from user text, nonce-based CSP, no `dangerouslySetInnerHTML` (lint) |
| R | Abusive submissions denied later | ✅ Hashed IP + audit entries on reviews, quotes, claims, reports |
| I | Phone harvesting, personal data in responses | ✅ Phones only via counted Call endpoint; public view models strip owner ids, phone, import notes; `no-store` on APIs |
| D | Floods, scraping, expensive queries | ✅ Redis sliding-window rate limits per endpoint; 64 KB JSON cap; page size caps. 🟡 Edge WAF/DDoS: hosting |
| E | Reaching another user's data (IDOR) | ✅ Every query scoped to the signed-in owner (`traderId`, `userId`); role checked server-side on every request |

### 2. Authentication and sessions
| | Threat | Controls |
|---|---|---|
| S | Password guessing, credential stuffing | ✅ Argon2id, per-account (5/15 min) and per-IP limits, timing-equalised unknown-email path, failed-login spike alert, lockout alert |
| S | Stolen password used on a staff account | ✅ Mandatory TOTP two-step sign-in for staff (optional for others); email-link and Google sign-in refused for staff/MFA accounts; recovery codes hashed, single use; replayed codes refused |
| S | Stolen session cookie | ✅ HttpOnly, Secure (in production), SameSite=Lax JWT; staff sessions end after 12 h; sign-out-everywhere and automatic revocation on password/MFA/role change (session versioning) |
| T | Forged session token | ✅ Signed with NEXTAUTH_SECRET; production refuses weak/test secrets at boot |
| R | "It wasn't me" for staff actions | ✅ Staff and business sign-ins and all privileged actions in the hash-chained audit log |
| E | Privilege kept after demotion/ban | ✅ Role and status re-read from the DB (≤60 s cache, invalidated on change) on every request |

### 3. Ops console (staff)
| | Threat | Controls |
|---|---|---|
| S | Attacker with a staff session performs damaging actions | ✅ Step-up re-confirmation (password + code, 15 min) for role changes, site settings, ad banners, homepage image, incident register |
| T | Malicious ad script | ✅ Script ads run in a sandboxed, opaque-origin iframe and only with ad consent; creating/editing ads needs step-up |
| R | Staff deny changes | ✅ Audit log with actor id; integrity check in the console |
| E | Admin escalates to super-admin or edits other admins | ✅ Only super-admins touch admin accounts; no self-modification; role-change alert |
| I | Console discovered by outsiders | ✅ Non-staff get 404. 🟡 Optional: put `/admin` behind an identity-aware proxy (Cloudflare Access) once hosted |

### 4. Email flows (review invitations, quote requests, claims, unsubscribe)
| | Threat | Controls |
|---|---|---|
| S | Fake reviews | ✅ 256-bit single-use tokens, only an HMAC stored, 14-day expiry, atomic claim, 30-day per-customer cooldown, spam screening → moderation |
| T | Link scanners consuming tokens | ✅ GET never consumes; only the form POST does |
| I | Token leaks via Referer | ✅ `no-referrer` on token pages |
| R | Unsubscribe disputes | ✅ Signed RFC 8058 one-click links, suppression table |

### 5. File uploads (logos, homepage image)
| | Threat | Controls |
|---|---|---|
| T | Malicious files (SVG script, polyglots, EXIF/GPS leaks) | ✅ Size caps, raster formats only, decoded and re-encoded to WebP (metadata stripped), served with `nosniff` and sandbox CSP |
| D | Decompression bombs | ✅ Pixel limit on decode |

### 6. Data stores (PostgreSQL, Redis)
| | Threat | Controls |
|---|---|---|
| T | Tampering with the audit trail | ✅ Hash chain + DB triggers refusing UPDATE/TRUNCATE and early DELETE; structured copy in the log stream. 🟡 App DB role must not own the table (hosting) |
| I | Database or backup theft | ✅ Passwords Argon2id, tokens HMAC'd, MFA seeds AES-256-GCM, IPs hashed. 🟡 Encryption at rest + KMS: hosting |
| I | Network sniffing app↔DB | 🟡 TLS (`sslmode=require`) / private subnets: hosting (startup warns) |
| E | Web tier compromise → DB | ⬜ Network segmentation, least-privilege DB role: hosting |

### 7. Third parties and supply chain
| | Threat | Controls |
|---|---|---|
| T | Compromised npm dependency | ✅ Lockfile, `npm audit` in CI, Dependabot, dependency review on PRs, CodeQL |
| I | Secrets committed to git | ✅ gitleaks in CI; production rejects test secrets |
| D | Lookup/FX provider down | ✅ Timeouts, cached results, fallback FX table; registration says "try again" |

## Residual risks (accepted or pending)

- Session cookie is SameSite=Lax, not Strict: Strict would sign users out when arriving from email links. CSRF is covered by the Origin check.
- MFA is optional for customers and businesses (encouraged on the security page).
- Infrastructure controls (segmentation, KMS, WAF, central immutable logs, secrets vault) are pending a hosting decision: HOSTING_CHECKLIST.md.
