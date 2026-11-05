-- ============================================================================
-- Migration 011: Candidate Latitude & Longitude Geolocation Tracking
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================================

-- 1. Add latitude, longitude, and user_agent to bookings table
alter table public.bookings add column if not exists latitude text;
alter table public.bookings add column if not exists longitude text;
alter table public.bookings add column if not exists user_agent text;

-- 2. Add latitude and longitude to schedule_visits table
alter table public.schedule_visits add column if not exists latitude text;
alter table public.schedule_visits add column if not exists longitude text;

-- 3. Add latitude and longitude to job_applications table if exists
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'job_applications') then
    alter table public.job_applications add column if not exists latitude text;
    alter table public.job_applications add column if not exists longitude text;
  end if;
end $$;
