# Data classification and inventory

| Class | Meaning | Handling |
|---|---|---|
| **Public** | Meant to be published | Integrity matters; no confidentiality controls |
| **Internal** | Business data not meant for the public | Staff access only; not in client responses |
| **Confidential** | Personal information | Least privilege; never logged; exportable and erasable on request; retention limits |
| **Restricted** | Secrets and data that would enable account takeover or serious harm | Never stored in plain text; never logged; encrypted or hashed; rotate on suspicion |

## Inventory

| Data | Class | Where | Protection | Retention |
|---|---|---|---|---|
| Password hashes | Restricted | `User.passwordHash` | Argon2id (m=19 MiB, t=2) | Life of account |
| Two-step sign-in seeds | Restricted | `User.mfaSecret` | AES-256-GCM (`MFA_ENCRYPTION_KEY`) | Until turned off |
| Recovery codes | Restricted | `User.mfaRecoveryCodes` | Argon2id hashes, single use | Until used/regenerated |
| Review / unsubscribe tokens | Restricted | `ReviewRequest.tokenHash`; signed links | HMAC-SHA256 with pepper; raw token only in the email | 90 days after expiry |
| App secrets (env) | Restricted | Hosting secret store | Never in git (gitleaks); boot-time strength checks | Rotate yearly or on suspicion |
| Session tokens | Restricted | Browser cookie | Signed JWT, HttpOnly, Secure, SameSite=Lax; versioned | 7 days (staff 12 h) |
| Customer name, email, phone, address | Confidential | `User`, `QuoteRequest`, `ReviewRequest` | Owner-scoped access; export/erase | Account life; quotes 24 months |
| Quote descriptions | Confidential | `QuoteRequest` | Shared only with the chosen business (consented) | 24 months |
| Listing-claim details | Confidential | `ListingClaim` | Staff only | 24 months after decision |
| Business owner contact details | Confidential | `TraderProfile.phone`, `User.email` | Phone revealed only via counted Call button | Life of listing |
| Credential documents | Confidential | `Credential.documentUrl` | Staff only | Life of listing |
| Consent records | Confidential (pseudonymous) | `ConsentRecord` | Random subject id, hashed IP | 24 months |
| Audit log | Internal | `AuditLog` | Append-only, hash-chained; opaque ids and hashed IPs | 24 months |
| Security incidents | Internal | `SecurityIncident` | Super-admins only | 36 months after closing |
| Daily visitor totals | Internal (aggregate) | `DailyVisitorStat`; Redis counters | No cookies; daily-rotating hash key, discarded after 2 days; only counts stored | Totals kept; Redis sketches 40 days |
| Search/call analytics | Internal | `SearchQuery`, `CallEvent` | Hashed visitor ids | 13 / 24 months |
| Business listings, services, prices, published reviews | Public | `TraderProfile`, `Service`, `Review` | Moderation; integrity via audit | Life of listing |
| Imported directory notes | Internal | `TraderProfile.importNotes` | Never shown publicly | Until claimed/removed |

## Rules

- Collect only what a feature needs (no birth dates, government IDs or payment data are collected).
- Never write Confidential or Restricted values to logs: `logEvent()` takes ids and hashes only.
- New tables or fields must be added here, to the Privacy Policy table, to data export (`exportUserData`) and erasure (`deleteAccount`) if they relate to a person, and to the retention job.
