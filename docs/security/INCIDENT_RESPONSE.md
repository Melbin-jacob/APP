# Incident response playbook

For any suspected security incident or personal-data breach. Rehearse it once a
year (tabletop exercise) and after changing hosting. Not legal advice: confirm
notification duties with your privacy lawyer before go-live and during a real incident.

## Roles (fill in before launch)

| Role | Who | Backup |
|---|---|---|
| Incident lead (decides, coordinates) | | |
| Technical lead (investigates, contains) | | |
| Privacy officer (assessment, regulators, notices) | `PRIVACY_OFFICER` / `PRIVACY_EMAIL` | |
| Communications (customers, businesses, press) | | |
| Legal counsel | | |

Security alerts go to `SECURITY_EMAIL`. Make sure that inbox pages someone.

## Severity

| Level | Examples | Response |
|---|---|---|
| **SEV-1** | Confirmed access to personal data; staff account takeover; malicious script served to visitors | Start immediately, all roles, 24/7 |
| **SEV-2** | Suspected breach; credential-stuffing attack in progress; audit-chain integrity failure | Same business day |
| **SEV-3** | Blocked attack, single locked account, phishing attempt with no impact | Record, review within a week |

## 1. Detect and record (first hour)

1. Open **Ops console → Security incidents → Record an incident**. Every incident goes in the register, including ones you decide not to report (PIPEDA requires a record of every breach for 24 months).
2. Note the detection time precisely. Deadlines run from when you become aware.
3. Preserve evidence: don't wipe servers or rotate logs away. Export the relevant audit log entries and central logs.
4. Run **Audit log → Verify integrity** and note the result.

Signals that start this playbook: security alert emails (login-failure spike, account lockouts, export spike, staff sign-in from a new network, role change, audit-chain failure), reports to `SECURITY_EMAIL` or `/.well-known/security.txt`, provider notices, unexpected changes.

## 2. Contain (hours)

Use whatever fits:
- **Accounts:** suspend or ban in **Ops console → Users** (ends their sessions within a minute); have the person use *Sign-in & security → Sign out everywhere*.
- **Staff account suspected:** suspend it, then rotate `NEXTAUTH_SECRET` (signs everyone out), reset its two-step sign-in (`npm run mfa:reset -- email "reason"`), review its audit trail.
- **Malicious ad/script:** turn off **Ad banners → Side banners — site-wide**; delete the banner.
- **Leaked secret:** rotate it in the hosting secret store and redeploy. `REVIEW_TOKEN_PEPPER` invalidates outstanding review links; `MFA_ENCRYPTION_KEY` needs re-enrolment of two-step sign-in (rotate with a re-encryption migration, not blindly); `CRON_SECRET`, DB and Redis passwords can be rotated freely.
- **Attack traffic:** block at the WAF/CDN; tighten rate limits.
- **Vulnerable code:** hotfix, or take the affected feature offline.

## 3. Assess (within 24–48 hours)

Answer and record in the incident:
- What data, how many people, where they live (province/state/country)?
- Was data actually accessed or exfiltrated, or only exposed?
- **Real risk of significant harm (RROSH)?** Consider the sensitivity of the data (contact details < account credentials < financial/health) and the probability of misuse (was it encrypted/hashed? who got it? malicious intent?).

## 4. Notify

| Law | Applies when | Who to tell | Deadline |
|---|---|---|---|
| **PIPEDA** (Canada, federal) | Breach creating a real risk of significant harm | Office of the Privacy Commissioner (online form); affected individuals; organisations that can reduce harm | **As soon as feasible** |
| **Quebec Law 25** | Quebec residents; "confidentiality incident" with risk of serious injury | Commission d'accès à l'information; affected individuals | **Promptly**; keep register |
| **US state laws** (e.g. California Civ. Code 1798.82) | Residents' personal information acquired (definitions vary: name + account credentials, etc.) | Affected residents; state AG above thresholds (CA: 500+) | **Most expedient time**, some states 30–60 days |
| **GDPR** (only if EU/UK residents are affected) | Personal-data breach unless unlikely to result in risk | Lead supervisory authority; individuals if high risk | **72 hours** to the authority |

The register shows hours since detection and what is still outstanding. Notices to individuals should say what happened, what data, what we're doing, what they can do (change password, watch for phishing), and how to contact us.

Templates to prepare before launch: individual notice (email), regulator report, business-partner notice, short public statement.

## 5. Recover and learn

- Fix the root cause; restore from clean backups if needed; monitor closely for 30 days.
- Within two weeks: blameless review. What happened, timeline, what worked, what to change. Update this playbook, the threat model and alert thresholds.
- Close the incident in the register with the containment notes and notification dates.

## Quick reference

- Verify audit integrity: Ops console → Audit log → *Verify integrity*
- Turn off all ads: Ops console → Ad banners → site-wide switch
- Reset someone's two-step sign-in (after verifying them out of band): `npm run mfa:reset -- <email> "<how verified>"`
- Sign everyone out: rotate `NEXTAUTH_SECRET` and redeploy
- Structured logs: JSON lines on stdout with `type` (`auth.login_failed`, `auth.login_blocked`, `security_alert`, `audit`, …)
