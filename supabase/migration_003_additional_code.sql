-- Run this in your Supabase project's SQL Editor.
-- Adds support for a second, optional verification code: admins can put a
-- pending booking into 'awaiting_code' status, which prompts the candidate
-- for an extra code before it goes back to 'pending' for final review.

alter table public.bookings
  add column if not exists additional_code text;

-- Widen the status constraint to include the new 'awaiting_code' value.
-- (Constraint name matches the one Postgres auto-generated in schema.sql;
-- if this DROP fails because your constraint has a different name, find it
-- with: select conname from pg_constraint where conrelid = 'public.bookings'::regclass;)
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings
  add constraint bookings_status_check
  check (status in ('pending', 'awaiting_code', 'confirmed', 'rejected'));

-- The public "resubmit" policy needs to also allow moving from
-- 'awaiting_code' back to 'pending' (submitting the extra code), not just
-- from 'rejected'.
drop policy if exists "public can resubmit after rejection" on public.bookings;
drop policy if exists "public can resubmit after rejection or code request" on public.bookings;
create policy "public can resubmit after rejection or code request" on public.bookings
  for update
  using (status in ('rejected', 'awaiting_code'))
  with check (status = 'pending');
