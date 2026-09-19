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
