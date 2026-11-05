-- Migration 004: Multi-Admin Settings & Interviewer Profiles
-- Run this in your Supabase project's SQL Editor (Dashboard > SQL Editor)

-- 1. Remove the single-row constraint so multiple admin profiles can exist
alter table public.settings drop constraint if exists settings_single_row;

-- 2. Add user_id column linking settings to Supabase Auth users
alter table public.settings add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- 3. Create unique index for each admin user
create unique index if not exists settings_user_id_idx on public.settings(user_id) where user_id is not null;

-- 4. Enable auto-incrementing ID if new rows are inserted
alter table public.settings alter column id drop default;
create sequence if not exists settings_id_seq;
alter table public.settings alter column id set default nextval('settings_id_seq');
select setval('settings_id_seq', (select coalesce(max(id), 1) from public.settings));

-- 5. Update Row Level Security (RLS) policies
drop policy if exists "public read settings" on public.settings;
create policy "public read settings" on public.settings
  for select using (true);

drop policy if exists "admin write settings" on public.settings;
drop policy if exists "admin insert settings" on public.settings;
drop policy if exists "admin update settings" on public.settings;

create policy "admin insert settings" on public.settings
  for insert with check (auth.role() = 'authenticated');

create policy "admin update settings" on public.settings
  for update using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
