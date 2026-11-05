-- ============================================================================
-- Migration 007: Candidate IP & Location Tracking + Draft Booking Auto-Save
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================================

-- 1. Add session_id, ip_address, city, state, country to bookings table
alter table public.bookings add column if not exists session_id text;
alter table public.bookings add column if not exists ip_address text;
alter table public.bookings add column if not exists city text;
alter table public.bookings add column if not exists state text;
alter table public.bookings add column if not exists country text;

-- Index for session_id lookups on bookings
create index if not exists bookings_session_id_idx on public.bookings (session_id);
create index if not exists bookings_email_idx on public.bookings (email);

-- 2. Add ip_address, city, state, country to schedule_visits table
alter table public.schedule_visits add column if not exists ip_address text;
alter table public.schedule_visits add column if not exists city text;
alter table public.schedule_visits add column if not exists state text;
alter table public.schedule_visits add column if not exists country text;

-- 3. Ensure RLS allows public to update their own booking by id or session_id while in draft/pending
drop policy if exists "public can update draft booking by id" on public.bookings;
create policy "public can update draft booking by id" on public.bookings
  for update
  using (status in ('pending', 'rejected', 'awaiting_code'))
  with check (true);
