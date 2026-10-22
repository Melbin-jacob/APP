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
| `trader0@homeservices.local` | Trader (Swift Plumbing & Heating, New York) | Business dashboard at `/dashboard` |
| `customer@homeservices.local` | Customer | Account page, data export / delete |
| `pending@homeservices.local` | Trader awaiting approval | Approval flow |

## What to try

Demo businesses: 8 in **New York** (US, priced in USD) and 8 in **Toronto** (Canada, priced in CAD).

**Countries, languages and currencies** (the dark bar at the top of every page)
- You only see businesses in your own country. Locally there's no hosting-provider location,
  so the country comes from your browser language: `en-US` → United States, `en-CA` / `fr-CA` → Canada.
  Use the **country** menu to switch: New York listings ↔ Toronto listings.
- Pick any of the 12 languages; the whole public site switches (Arabic switches to right-to-left).
- Pick a currency: prices convert and show `≈` (hover one to see the professional's own price).
- Your choices are remembered for a year, even after closing the browser.
- To simulate a visitor from another country, send the header the hosting edge would set:
  `curl -H "x-country-code: CA" http://localhost:3000/api/search` (only Toronto results).
  From a country we don't serve yet (e.g. `DE`), the site says so, shows US listings, and prices default to EUR.

**Public site**
- Home page: search with a location (`New York` or `10001`) and keyword (`plumb`). Typing 2+ letters shows suggestions,
  in your language (try `plom` in Spanish).
- Click the category filter tabs above the listing cards.
- Open a trader profile: services, opening hours, verified credentials, reviews, disclaimer.
- Click **Call Now**: the number is revealed and the click is counted.
- Report a review from a profile page.
- Subscribe to the newsletter, then click the confirmation link in the test inbox.
- Side ad banners appear on wide screens (wider than 1280px).

**Registration and sign-in**
- `/register`: try submitting without ticking the Terms box (it's blocked).
- Register as a business. Pick the country (it starts on yours), then the details stay locked until you enter a code that exists:
  - United States: a ZIP such as `10001` matches *New York City, NY*; the rate is in USD.
  - Canada: a postal code such as `M5V 3L9` matches *Toronto, ON*; the rate is in CAD.
  - A made-up code (`00000`) or a partial one (`M5V`) is rejected.
  - Once registered, the business goes to the admin approval queue, and it's only listed to visitors in its own country.
- `/login` → **Email me a link**: the magic link arrives in the test inbox.
- Enter a wrong password 5 times: you'll be rate-limited.

**Your account** (any user: *My account* in the header)
- Edit your name and email preferences, change your password (or set one if you signed up with an email link),
  see and delete reviews you've written, and **Sign out**.
- As `customer@…`, the demo includes one review you wrote.

**Business profile** (as `trader0@…`: *Dashboard → Edit business profile*, or `/dashboard/profile`)
- Business details: name, phone, about, hourly rate, service radius, logo and cover photo links.
- Business location: enter a new ZIP / postal code; it's looked up like at sign-up.
- Opening hours per day.
- Trades: tick every trade you offer and pick the primary one.
- Services: add, edit and remove services with a starting price and unit (per hour, job, visit…).
  A trade can't be removed while a service still uses it.
- Extra service areas (ZIP codes, or the first three characters of Canadian postal codes) and work photos.
- Changes show on the public profile straight away.

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

**Legal & compliance** (footer section on every page)
- Open each link: Legal centre, Terms, Privacy Policy, Cookie Policy, Do Not Sell or Share, Your privacy rights,
  Legal disclaimer, Accessibility, Security. Machine-readable security contact: `/.well-known/security.txt`.
- **Cookie settings** in the footer reopens the consent dialog. Advertising scripts in the side banners only load after you
  accept advertising cookies.
- **Unsubscribe:** request a review as `trader0`, open the email in the test inbox and click *Unsubscribe from review requests*.
  Requesting another review for that email is then refused.
- **Terms gate:** an account that hasn't accepted the current Terms (e.g. someone who signed up with an email link) is sent to
  an "accept the Terms" page before using the dashboard or admin console. Exporting or deleting data never requires it.

**Privacy**
- Sign in as `customer@…` → `/account`: export your data (JSON) or delete the account.
- Cookie banner on first visit: Accept, Reject, or Customise.
