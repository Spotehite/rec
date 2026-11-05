-- ============================================================================
-- Migration 008: Admin Links List with Duplicate Detection & Agent Tracking
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================================

-- 1. Create admin_links table
create table if not exists public.admin_links (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null,
  link text not null,
  agent text not null,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Indexes for fast search & duplicate link checking
create index if not exists admin_links_created_at_idx on public.admin_links (created_at desc);
create index if not exists admin_links_link_idx on public.admin_links (link);
create index if not exists admin_links_agent_idx on public.admin_links (agent);
create index if not exists admin_links_company_idx on public.admin_links (company);

-- 3. Enable Row Level Security (RLS)
alter table public.admin_links enable row level security;

-- Policies for Authenticated Admins
drop policy if exists "authenticated admins can read admin_links" on public.admin_links;
create policy "authenticated admins can read admin_links" on public.admin_links
  for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated admins can insert admin_links" on public.admin_links;
create policy "authenticated admins can insert admin_links" on public.admin_links
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "authenticated admins can update admin_links" on public.admin_links;
create policy "authenticated admins can update admin_links" on public.admin_links
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated admins can delete admin_links" on public.admin_links;
create policy "authenticated admins can delete admin_links" on public.admin_links
  for delete using (auth.role() = 'authenticated');

-- 4. Enable Supabase Realtime for instant synchronization across all admins
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'admin_links'
  ) then
    alter publication supabase_realtime add table public.admin_links;
  end if;
end $$;
