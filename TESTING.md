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
| `customer@homeservices.local` | Customer | Account page, data export / delete |

## What to try

Listings: the **894 Windsor-Essex businesses** from the directory spreadsheet (all in Canada), across 37 trades.
There are no fake test businesses any more. To test the business side, register one yourself (see *Registration*),
then approve it as admin under *Ops console → Traders*.

**Countries, languages and currencies** (the dark bar at the top of every page)
- You only see businesses in your own country. Locally there's no hosting-provider location,
  so the country comes from your browser language: `en-CA` / `fr-CA` → Canada, `es-US` → United States.
  `en-US` is ignored (it's the default on most computers, including in Canada), so it gets the default market, Canada.
  Use the **country** menu to switch: Canada shows the Windsor-Essex listings. United States has none yet, so a bar
  says so with a one-click *See professionals in Canada* button.
- Pick any of the 12 languages; the whole public site switches (Arabic switches to right-to-left).
- Pick a currency: prices convert and show `≈` (hover one to see the professional's own price).
- Your choices are remembered for a year, even after closing the browser.
- To simulate a visitor from another country, send the header the hosting edge would set:
  `curl -H "x-country-code: CA" http://localhost:3000/api/search` (Canadian results only).
  From a country we don't serve yet (e.g. `DE`), the site says so, shows Canadian listings, and prices default to EUR.

**Public site**
- Home page: search with a location (`Windsor`, `Tecumseh` or `N8T 3C7`) and keyword (`plumb`, `heating`, `tow`). Typing 2+ letters shows suggestions,
  in your language (try `plom` in Spanish).
- Click the category filter tabs above the listing cards.
- Open a listing (e.g. `/traders/appliance-medic`): it's marked **Unclaimed listing** with *claim* and *request removal*
  links, and shows the business website.
- Cards and profiles show the business's initials on a colour (or its logo, once it uploads one).
- Click **Call Now**: the number is revealed and the click is counted. The few listings without a phone number have no Call button.
- Click **Request Quote** (on a card or profile): fill in name, phone, address, the job and when to contact you, tick consent
  and send. For an unclaimed listing the request goes to ops (subject "Quote request to forward…" in the test inbox);
  with an email you also get a copy.
- Report a review from a profile page.
- Subscribe to the newsletter, then click the confirmation link in the test inbox.
- Side ad banners appear on wide screens (wider than 1280px).

**Registration and sign-in**
- `/register`: try submitting without ticking the Terms box (it's blocked).
- Register as a business. Pick the country (it starts on yours), then the details stay locked until you enter a code that exists:
  - Canada: a postal code such as `N9A 1A1` matches *Windsor, ON*; the rate is in CAD.
  - United States: a ZIP such as `10001` matches *New York City, NY*; the rate is in USD.
  - A made-up code (`00000`) or a partial one (`M5V`) is rejected.
  - Once registered, the business goes to the admin approval queue, and it's only listed to visitors in its own country.
- `/login` → **Email me a link**: the magic link arrives in the test inbox.
- Enter a wrong password 5 times: you'll be rate-limited.

**Your account** (any user: *My account* in the header)
- Edit your name and email preferences, change your password (or set one if you signed up with an email link),
  see and delete reviews you've written, and **Sign out**.

**Claim a listing** (the owner's side)
1. Sign in as `customer@…`, open a listing and click *Is this your business? Claim it*. Fill in your role and phone and submit.
2. As admin: *Ops console → Listing claims* → **Approve**.
3. Back as the customer: *My account* now leads to the business dashboard (no need to sign in again). Upload a logo in
   *Edit business profile*: it replaces the initials everywhere. New quote requests now appear in the dashboard and by email.

**Business profile** (as a business you registered and approved, or a listing you claimed: *Dashboard → Edit business profile*, or `/dashboard/profile`)
- Logo: upload a PNG, JPEG or WebP (up to 5 MB), or remove it to go back to the initials.
- Business details: name, phone, about, hourly rate, service radius, cover photo link.
- Business location: enter a new ZIP / postal code; it's looked up like at sign-up.
- Opening hours per day.
- Trades: tick every trade you offer and pick the primary one.
- Services: add, edit and remove services with a starting price and unit (per hour, job, visit…).
  A trade can't be removed while a service still uses it.
- Extra service areas (ZIP codes, or the first three characters of Canadian postal codes) and work photos.
- Changes show on the public profile straight away.

**Review workflow (trader → customer)**
1. Sign in as a business you registered and approved, and go to `/dashboard`.
2. Click **Mark completed** on a job, or use **Request a review** with any email.
3. Open the test inbox. The email subject is "How was your service with <your business name>?"
4. Click a star or **Submit Review**, write a comment, and submit.
5. The review appears on the trader's profile marked *Verified customer*.
6. Click the same email link again: it no longer works (single use).
7. Put a link (`www.example.com`) in a review comment: it goes to moderation instead of going live.

**Ops console (`/admin`, as admin)**
- Overview: totals, queues, daily charts, top searches, system health.
- Listing claims: verify and approve or reject claims. Quote requests: requests sent to unclaimed listings, to pass on by phone.
- Traders: approve a business you registered, verify a licence, suspend a trader. Imported listings show *Unclaimed (imported listing)* and the spreadsheet notes.
- Users: suspend or ban a user. They're signed out of everything within a minute.
- Reviews: reviews containing links, and reported reviews, land in the moderation queue. Publish, remove, or dismiss reports.
- Ad banners: flip the site-wide switch and reload the home page; create, pause, or delete banners.
- Audit log: every action above is recorded.

**Legal & compliance** (footer section on every page)
- Open each link: Legal centre, Terms, Privacy Policy, Cookie Policy, Do Not Sell or Share, Your privacy rights,
  Legal disclaimer, Accessibility, Security. Machine-readable security contact: `/.well-known/security.txt`.
- **Cookie settings** in the footer reopens the consent dialog. Advertising scripts in the side banners only load after you
  accept advertising cookies.
- **Unsubscribe:** request a review as your test business, open the email in the test inbox and click *Unsubscribe from review requests*.
  Requesting another review for that email is then refused.
- **Terms gate:** an account that hasn't accepted the current Terms (e.g. someone who signed up with an email link) is sent to
  an "accept the Terms" page before using the dashboard or admin console. Exporting or deleting data never requires it.

**Privacy**
- Sign in as `customer@…` → `/account`: export your data (JSON) or delete the account.
- Cookie banner on first visit: Accept, Reject, or Customise.
