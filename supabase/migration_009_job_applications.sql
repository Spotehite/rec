-- ============================================================================
-- Migration 009: Job Applications Table & CV Storage Metadata
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================================

-- 1. Create job_applications table
create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete set null,
  job_slug text,
  job_title text not null,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone_number text,
  linkedin_url text,
  portfolio_url text,
  resume_filename text,
  resume_file_data text,
  cover_note text,
  status text not null default 'submitted',
  ip_address text,
  city text,
  state text,
  country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Indexes for fast query and search
create index if not exists job_applications_created_at_idx on public.job_applications (created_at desc);
create index if not exists job_applications_email_idx on public.job_applications (email);
create index if not exists job_applications_job_id_idx on public.job_applications (job_id);
create index if not exists job_applications_status_idx on public.job_applications (status);

-- 3. Enable Row Level Security (RLS)
alter table public.job_applications enable row level security;

-- Public can submit job applications
drop policy if exists "public can insert job_applications" on public.job_applications;
create policy "public can insert job_applications" on public.job_applications
  for insert with check (true);

-- Authenticated admins can view and manage job applications
drop policy if exists "authenticated admins can read job_applications" on public.job_applications;
create policy "authenticated admins can read job_applications" on public.job_applications
  for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated admins can update job_applications" on public.job_applications;
create policy "authenticated admins can update job_applications" on public.job_applications
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated admins can delete job_applications" on public.job_applications;
create policy "authenticated admins can delete job_applications" on public.job_applications
  for delete using (auth.role() = 'authenticated');

-- 4. Add to Realtime publication
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'job_applications'
  ) then
    alter publication supabase_realtime add table public.job_applications;
  end if;
end $$;
