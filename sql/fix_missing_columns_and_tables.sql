-- 1. Add missing `display_font_size` to `settings` table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'settings'
        AND column_name = 'display_font_size'
    ) THEN
        ALTER TABLE public.settings ADD COLUMN display_font_size INTEGER DEFAULT 100;
    END IF;
END $$;

-- 2. Make sure `history_logs` table exists
CREATE TABLE IF NOT EXISTS public.history_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item_name TEXT NOT NULL,
    item_type TEXT NOT NULL,
    old_buy TEXT,
    old_sell TEXT,
    new_buy TEXT,
    new_sell TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. If RLS is enabled on `history_logs`, we need a policy or disable it for simplicity if other tables also don't use it.
-- Depending on the project's security model. We will assume the project relies on no RLS or open RLS.
-- This just ensures the table exists.

-- 4. Verify `is_visible` exists on `ticker_items`
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

-- 5. Verify `change` exists on `rates`
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'rates'
        AND column_name = 'change'
    ) THEN
        ALTER TABLE public.rates ADD COLUMN change TEXT DEFAULT '0.00%';
    END IF;
END $$;
