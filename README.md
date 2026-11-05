# Recruitment Site + Custom Scheduling

A small, three-part app built with Next.js (App Router) and Supabase:

1. **Public careers site** — hero, published job listings, job detail pages.
2. **Custom scheduling page** (`/schedule`) — a self-built, Calendly-style
   booking flow (date → time → details → confirm), followed by a manual
   ID/passkey verification step your team approves or rejects in real time.
3. **Admin dashboard** (`/admin`) — manage jobs, review and verify bookings,
   and adjust scheduling availability. Protected by Supabase Auth.

No Calendly, Cal.com, or external calendar integration is used anywhere —
the scheduling logic and the database are entirely part of this project.

---

## 1. Create the Supabase project

1. Create a new project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run `supabase/schema.sql` (creates `jobs`,
   `bookings`, `settings`, RLS policies, and enables realtime on `bookings`).
   If you already ran an earlier version of this schema, instead run, in
   order: `supabase/migration_002_scheduling_redesign.sql` then
   `supabase/migration_003_additional_code.sql`.
3. Optionally run `supabase/seed.sql` to add two sample published jobs.
4. Go to **Authentication → Users → Add user** and create one admin account
   (email + password). This app treats *any* authenticated Supabase user as
   an admin — there's no public sign-up form, so the only way in is an
   account you create yourself in the dashboard.
5. Go to **Project Settings → API** and copy the **Project URL** and
   **anon public key**.

## 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 3. Install and run

```bash
npm install
npm run dev
```

- Public site: `http://localhost:3000`
- Admin: `http://localhost:3000/admin/login`

## 4. Deploy

Any Next.js host works (Vercel is the simplest). Set the same two
environment variables in your host's dashboard, then deploy.

---

## How the ID/passkey verification works

1. A candidate picks a date, time, and enters their name/email/phone, then
   taps **Schedule Event**.
2. A modal asks for the **Candidate ID** and **Passkey** they were given
   separately (offline/by email — this app doesn't generate or send these;
   it just collects and checks them).
3. Submitting creates a `bookings` row with `status = 'pending'`. The modal
   stays open showing only a spinner — no status text — while your team
   reviews it on `/admin/bookings` in real time.
4. From there, your team has three options on a pending booking:
   - **Confirm** → status becomes `confirmed`; the candidate's modal closes
     and their page shows a confirmation with date, time, and email.
   - **Reject** → status becomes `rejected`; the candidate's modal reopens
     the ID/passkey form with an error, and resubmitting sends it back to
     `pending`.
   - **Require Additional Code** → status becomes `awaiting_code`; the
     candidate's modal switches to a single "Additional Code" field (for
     the rarer cases where you've also issued a second code alongside the
     ID/passkey). Submitting it sends the booking back to `pending` — same
     silent-spinner wait — for your team to do a final Confirm/Reject.
   The submitted ID, passkey, and additional code are all visible as plain
   columns in the admin bookings table for your team to check by hand
   against whatever records you keep outside this app.

## Project structure

```
src/app/                    Public site, /schedule, /admin (route-protected)
src/components/             Shared UI (job rows, verify modal, admin bits)
src/lib/supabase/           Browser / server / middleware Supabase clients
src/lib/scheduling.ts       Slot generation from settings + existing bookings
supabase/schema.sql         Tables, RLS policies, realtime, views
supabase/seed.sql           Optional sample jobs
```

## Customizing the scheduling page

`/admin/settings` controls what shows in the left-hand panel on `/schedule`:
interviewer name, an optional photo URL, the meeting type label (e.g.
"Phone Call"), working days/hours, and slot length. Leave the photo URL
blank to show initials in a circle instead — there's no upload button, just
paste a link to an image you're already hosting somewhere (e.g. Supabase
Storage, or any image host).

Two things from the original mockup were left out on purpose:
- **No "authorize via Facebook" step.** That pattern (asking candidates to
  "authorize" a social account "for security") is a known job-scam tactic
  used to hijack people's accounts, not a real security measure — it isn't
  in this build.
- **No reference to Calendly's Terms of Use.** This site isn't Calendly, so
  the consent line at the bottom of the details form points to your own
  Terms/Privacy pages instead (currently linked to `/` as a placeholder —
  point them at real pages before launch).

## A note on the open `bookings` SELECT policy

To keep things simple, the `bookings` table allows public `SELECT` (see the
comment in `schema.sql`). Booking ids are random UUIDs, not sequential or
guessable, so this isn't practically exploitable, but it does mean anyone
holding a specific booking's UUID could read that row's email/ID/passkey.
Two narrow views (`public_booking_slots`, `public_booking_status`) are
already created in the schema if you'd rather lock this down further —
swap the relevant client calls in `src/app/schedule/page.tsx` to use them
and drop the "public can read own booking by id" policy.

## Deliberately left out (per the brief)

CV upload, candidate profiles/management, SMS, email automation, a
recruitment pipeline, complex permissions, and any external ATS or calendar
integration. The architecture (separate `jobs`/`bookings`/`settings`
tables, RLS-first design) leaves room to add these later without a rewrite,
but none of it is implemented now.
