-- Migration 010: Blocked Dates Table & Calendar Availability
-- Run this in your Supabase project's SQL Editor (Dashboard > SQL Editor)

-- 1. Create table to store blocked dates
CREATE TABLE IF NOT EXISTS public.blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  reason TEXT DEFAULT 'Blocked by administrator',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Fast lookup index
CREATE INDEX IF NOT EXISTS blocked_dates_date_idx ON public.blocked_dates (date);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;

-- 4. Allow public / anonymous users to read blocked dates so the calendar can grey them out
DROP POLICY IF EXISTS "public read blocked_dates" ON public.blocked_dates;
CREATE POLICY "public read blocked_dates" ON public.blocked_dates
  FOR SELECT USING (true);

-- 5. Allow authenticated admins full access to insert, update, delete blocked dates
DROP POLICY IF EXISTS "admin write blocked_dates" ON public.blocked_dates;
CREATE POLICY "admin write blocked_dates" ON public.blocked_dates
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================================
-- QUICK USAGE EXAMPLES:
-- ============================================================================

-- Example: Block specific date range (e.g., Oct 12 to Oct 18, 2026):
-- INSERT INTO public.blocked_dates (date, reason)
-- SELECT d::date, 'Blocked by administrator'
-- FROM generate_series('2026-10-12'::date, '2026-10-18'::date, '1 day'::interval) d
-- ON CONFLICT (date) DO NOTHING;

-- Example: Unblock specific date range:
-- DELETE FROM public.blocked_dates
-- WHERE date BETWEEN '2026-10-12' AND '2026-10-18';

-- Example: View all currently blocked dates:
-- SELECT date, reason, created_at FROM public.blocked_dates ORDER BY date ASC;
