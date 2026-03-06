-- user_sessions Table
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    login_time TIMESTAMPTZ DEFAULT now(),
    logout_time TIMESTAMPTZ,
    ip_address TEXT,
    device_info TEXT,
    is_active BOOLEAN DEFAULT true
);

-- activities Table
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'giris', 'cikis', 'fiyat', 'sistem'
    icon TEXT,
    text_content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Update history_logs Table
ALTER TABLE public.history_logs
ADD COLUMN IF NOT EXISTS user_name TEXT,
ADD COLUMN IF NOT EXISTS user_role TEXT,
ADD COLUMN IF NOT EXISTS item_group TEXT, -- 'altin', 'doviz', 'gumus'
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manuel'; -- 'manuel', 'api_otomatik', 'toplu'

-- Re-enable Realtime for new tables (if not already enabled)
alter publication supabase_realtime add table public.user_sessions;
alter publication supabase_realtime add table public.activities;