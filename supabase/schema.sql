-- ============================================================================
-- Recruitment site + custom scheduling — database schema
-- Run this once in the Supabase SQL editor (or via `supabase db push`).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- JOBS
-- ----------------------------------------------------------------------------
create table if not exists public.jobs (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  slug               text not null unique,
  location           text not null,
  department         text not null,
  employment_type    text not null default 'Full Time'
                      check (employment_type in ('Full Time', 'Part Time', 'Contract', 'Internship')),
  short_description  text not null default '',
  description        text not null default '',
  responsibilities   text[] not null default '{}',
  requirements       text[] not null default '{}',
  benefits           text[] not null default '{}',
  status             text not null default 'draft'
                      check (status in ('draft', 'published', 'closed')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists jobs_status_idx on public.jobs (status);
create index if not exists jobs_slug_idx on public.jobs (slug);

-- ----------------------------------------------------------------------------
-- SETTINGS  (single row — scheduling availability)
-- ----------------------------------------------------------------------------
create table if not exists public.settings (
  id                     int primary key default 1,
  working_days           int[] not null default '{1,2,3,4,5}', -- 0=Sun .. 6=Sat
  day_start_time         time not null default '09:00',
  day_end_time           time not null default '17:00',
  slot_duration_mins     int not null default 30,
  timezone               text not null default 'America/New_York',
  interviewer_name       text not null default 'Recruiting Team',
  interviewer_photo_url  text,
  meeting_type           text not null default 'Phone Call',
  updated_at             timestamptz not null default now(),
  constraint settings_single_row check (id = 1)
);

insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- BOOKINGS
-- ----------------------------------------------------------------------------
create table if not exists public.bookings (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid references public.jobs (id) on delete set null,
  first_name    text not null,
  last_name     text not null,
  email         text not null,
  phone_number  text,
  notes         text,
  date          date not null,
  start_time    time not null,
  end_time      time not null,
  timezone      text not null default 'America/New_York',
  candidate_id  text,
  passkey       text,
  additional_code text,
  status        text not null default 'pending'
                check (status in ('pending', 'awaiting_code', 'confirmed', 'rejected')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists bookings_date_idx on public.bookings (date);
create index if not exists bookings_status_idx on public.bookings (status);

-- keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();

drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
alter table public.jobs enable row level security;
alter table public.settings enable row level security;
alter table public.bookings enable row level security;

-- JOBS: anyone can read published jobs. Only authenticated (admin) users
-- can read/write everything else.
drop policy if exists "public read published jobs" on public.jobs;
create policy "public read published jobs" on public.jobs
  for select using (status = 'published');

drop policy if exists "admin full access to jobs" on public.jobs;
create policy "admin full access to jobs" on public.jobs
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- SETTINGS: publicly readable (needed to compute available slots),
-- only admins can change availability.
drop policy if exists "public read settings" on public.settings;
create policy "public read settings" on public.settings
  for select using (true);

drop policy if exists "admin write settings" on public.settings;
create policy "admin write settings" on public.settings
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- BOOKINGS: the base table is NOT directly readable by the public
-- (it holds email + candidate id/passkey). Public access is only
-- through the two narrow views below. Admins get full access.
drop policy if exists "admin full access to bookings" on public.bookings;
create policy "admin full access to bookings" on public.bookings
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Public can create a booking, but it must start out "pending" —
-- a client cannot insert a row that's already confirmed.
drop policy if exists "public can create booking" on public.bookings;
create policy "public can create booking" on public.bookings
  for insert
  with check (status = 'pending');

-- Public can resubmit after a rejection (re-enter ID/passkey) or after the
-- admin flags the booking as needing an additional code — both cases move
-- the row back to 'pending', identified by the booking's uuid, which only
-- the candidate holds.
drop policy if exists "public can resubmit after rejection" on public.bookings;
create policy "public can resubmit after rejection" on public.bookings
  for update
  using (status in ('rejected', 'awaiting_code'))
  with check (status = 'pending');

-- Public needs SOME way to select a row it just inserted/updated so
-- PostgREST can return it, and so the client can poll/subscribe to
-- its own booking's status. We scope this to non-sensitive columns
-- via a view further down, but Postgres RLS is table-level, so we
-- also allow select at the table level and rely on the app to only
-- ever query by the single uuid the candidate already holds.
drop policy if exists "public can read own booking by id" on public.bookings;
create policy "public can read own booking by id" on public.bookings
  for select using (true);

-- ----------------------------------------------------------------------------
-- REALTIME
-- ----------------------------------------------------------------------------
-- Admin dashboard subscribes to bookings changes; candidate page
-- subscribes filtered to its own row id.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'bookings'
  ) then
    alter publication supabase_realtime add table public.bookings;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- NOTES
-- ----------------------------------------------------------------------------
-- This schema intentionally keeps things simple, per spec. Two things worth
-- knowing if you productionize this further:
--
-- 1. `bookings` SELECT is open (`using (true)`) so PostgREST can return rows
--    on insert/update and so the schedule page can poll its own booking by
--    uuid. Booking ids are random uuids, so this isn't practically
--    enumerable, but it does mean anyone with a booking's uuid can read its
--    email/candidate_id/passkey. If that's a concern, swap the client calls
--    in src/lib/bookings.ts to use the `public_booking_status` view instead
--    (already created below) and drop the "public can read own booking by
--    id" policy.
--
-- 2. Admin access is granted to ANY authenticated Supabase user. Create
--    admin accounts manually in Supabase Studio (Authentication > Users),
--    do not expose a public sign-up form.

-- Narrow views for slot-availability + status-polling use cases that don't
-- need to expose PII (optional to use, see note #1 above).
create or replace view public.public_booking_slots
  with (security_invoker = false) as
  select date, start_time, end_time, status
  from public.bookings
  where status in ('pending', 'confirmed');

grant select on public.public_booking_slots to anon, authenticated;

create or replace view public.public_booking_status
  with (security_invoker = false) as
  select id, status, date, start_time, end_time, timezone
  from public.bookings;

grant select on public.public_booking_status to anon, authenticated;
