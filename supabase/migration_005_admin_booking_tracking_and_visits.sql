-- Migration 005: Admin Booking Attribution & Realtime Schedule Visits
-- Run this in your Supabase project's SQL Editor (Dashboard > SQL Editor)

-- 1. Add admin_email to settings if not exists
alter table public.settings add column if not exists admin_email text;

-- 2. Add admin attribution columns to bookings
alter table public.bookings add column if not exists admin_user_id uuid references auth.users(id) on delete set null;
alter table public.bookings add column if not exists admin_email text;
alter table public.bookings add column if not exists interviewer_name text;

-- 3. Create schedule_visits table to track when someone opens the scheduling link
create table if not exists public.schedule_visits (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  admin_user_id uuid references auth.users(id) on delete set null,
  admin_email text,
  interviewer_name text,
  timezone text default 'America/New_York',
  user_agent text,
  referrer text,
  created_at timestamptz not null default now()
);

-- Index for querying recent visits
create index if not exists schedule_visits_created_at_idx on public.schedule_visits (created_at desc);
create index if not exists schedule_visits_session_idx on public.schedule_visits (session_id);

-- 4. Enable Row Level Security (RLS) on schedule_visits
alter table public.schedule_visits enable row level security;

-- Public can record visits when opening the page
drop policy if exists "public can insert schedule_visits" on public.schedule_visits;
create policy "public can insert schedule_visits" on public.schedule_visits
  for insert with check (true);

-- Authenticated admins can view visit history
drop policy if exists "admin can read schedule_visits" on public.schedule_visits;
create policy "admin can read schedule_visits" on public.schedule_visits
  for select using (auth.role() = 'authenticated');

-- 5. Add schedule_visits to Supabase Realtime publication for instant webhook & dashboard notifications
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'schedule_visits'
  ) then
    alter publication supabase_realtime add table public.schedule_visits;
  end if;
end $$;
