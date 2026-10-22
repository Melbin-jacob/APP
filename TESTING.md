# Testing HomeServices Direct in your browser

## Option A — GitHub Codespaces (nothing to install)

1. Open **https://codespaces.new/Melbin-jacob/APP?ref=claude/optimistic-ride-oiy31m**
   (or on GitHub: **Code → Codespaces → Create codespace** on this branch).
2. Wait for setup to finish (~3–5 min the first time). It installs dependencies,
   creates the database, and loads demo data. The app starts automatically in the terminal.
3. Open the **Ports** tab:
   - **3000 — App**: the website (click the globe icon)
   - **8025 — Test inbox (Mailpit)**: every email the app sends shows up here

If the app isn't running, type `npm run dev` in the terminal.

## Option B — Docker on your own computer

Requires Docker Desktop.

```bash
git clone -b claude/optimistic-ride-oiy31m https://github.com/Melbin-jacob/APP.git
cd APP
docker compose up --build
```

- App: http://localhost:3000
- Test inbox: http://localhost:8025

Stop with `Ctrl+C`; `docker compose down -v` wipes the data.

## Demo accounts

Password for all: **`ChangeMe-123456`**

| Email | Role | Use it to test |
|---|---|---|
| `admin@homeservices.local` | Super-admin | Ops console at `/admin` |
| `trader0@homeservices.local` | Trader (Swift Plumbing & Heating) | Business dashboard at `/dashboard` |
| `customer@homeservices.local` | Customer | Account page, data export / delete |
| `pending@homeservices.local` | Trader awaiting approval | Approval flow |

## What to try

**Public site**
- Home page: search with a location (`London`) and keyword (`plumb`). Typing 2+ letters shows suggestions.
- Click the category filter tabs above the listing cards.
- Open a trader profile: services, opening hours, verified credentials, reviews, disclaimer.
- Click **Call Now**: the number is revealed and the click is counted.
- Report a review from a profile page.
- Subscribe to the newsletter, then click the confirmation link in the test inbox.
- Side ad banners appear on wide screens (wider than 1280px).

**Registration and sign-in**
- `/register`: try submitting without ticking the Terms box (it's blocked).
- Register as a business. The details stay locked until you enter a postcode that exists:
  - `SW1A 1AA` matches *Westminster, London*; a US ZIP such as `90210` matches *Beverly Hills, CA* and switches the rate to $.
  - A made-up code such as `ZZ9 9ZZ` is rejected, and so is a partial one like `SW1A`.
  - Once registered, the business goes to the admin approval queue.
- `/login` → **Email me a link**: the magic link arrives in the test inbox.
- Enter a wrong password 5 times: you'll be rate-limited.

**Review workflow (trader → customer)**
1. Sign in as `trader0@…` and go to `/dashboard`.
2. Click **Mark completed** on a job, or use **Request a review** with any email.
3. Open the test inbox. The email subject is "How was your service with Swift Plumbing & Heating?"
4. Click a star or **Submit Review**, write a comment, and submit.
5. The review appears on the trader's profile marked *Verified customer*.
6. Click the same email link again: it no longer works (single use).
7. Put a link (`www.example.com`) in a review comment: it goes to moderation instead of going live.

**Ops console (`/admin`, as admin)**
- Overview: totals, queues, daily charts, top searches, system health.
- Traders: approve *Pending Roofing Co*, verify its licence, suspend a trader.
- Users: suspend or ban a user. They're signed out of everything within a minute.
- Reviews: the moderation queue has a seeded spam review. Publish, remove, or dismiss reports.
- Ad banners: flip the site-wide switch and reload the home page; create, pause, or delete banners.
- Audit log: every action above is recorded.

**Privacy**
- Sign in as `customer@…` → `/account`: export your data (JSON) or delete the account.
- Cookie banner on first visit: Accept, Reject, or Customise.
