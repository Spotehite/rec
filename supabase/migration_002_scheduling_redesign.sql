-- Run this in your Supabase project's SQL Editor.
-- Adds the fields needed for the redesigned scheduling page:
-- phone number + notes on bookings, interviewer display info on settings.

alter table public.bookings
  add column if not exists phone_number text,
  add column if not exists notes text;

alter table public.settings
  add column if not exists interviewer_name text not null default 'Recruiting Team',
  add column if not exists interviewer_photo_url text,
  add column if not exists meeting_type text not null default 'Phone Call';
