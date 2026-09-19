-- Fix for Supabase Row Level Security (RLS) blocking history inserts and reads
-- By default, Supabase enables RLS on new tables which blocks the public 'anon' key from accessing them without a policy.
-- This script safely disables RLS for the history_logs table so the frontend can read/write to it freely.

-- 1. Disable Row Level Security on history_logs
ALTER TABLE public.history_logs DISABLE ROW LEVEL SECURITY;

-- 2. Just in case it's re-enabled later, add a public access policy
DROP POLICY IF EXISTS "Enable full access for all users" ON public.history_logs;
CREATE POLICY "Enable full access for all users" ON public.history_logs
FOR ALL USING (true) WITH CHECK (true);

-- 3. Also make sure ticker_items has the correct columns just in case
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'ticker_items'
        AND column_name = 'is_visible'
    ) THEN
        ALTER TABLE public.ticker_items ADD COLUMN is_visible BOOLEAN DEFAULT true;
    END IF;
END $$;
