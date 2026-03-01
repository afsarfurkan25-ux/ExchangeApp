-- Create the announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(50) NOT NULL, -- 'onemli', 'uyari', 'bilgi', 'basari', 'duyuru'
    target_group VARCHAR(100) NOT NULL, -- 'Tüm Üyeler', 'Yöneticiler', 'Standart Üye', 'Teknisyen'
    options JSONB DEFAULT '{}'::jsonb, -- Store boolean toggles like flash, toast, bell
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES members(id) ON DELETE SET NULL
);

-- Create a table to track read status per user
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES members(id) ON DELETE CASCADE,
    announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, announcement_id)
);

-- Fix: The application does not use Supabase Auth (it uses a custom members table validation).
-- Therefore, all requests come through as the "anon" role. Row Level Security policies that 
-- rely on auth.uid() or "authenticated" role will block creating and deleting announcements.
-- We explicitly DISABLE Row Level Security for these tables to match the rest of the app's structure.

ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications DISABLE ROW LEVEL SECURITY;

-- If you previously executed the old script with RLS, you can run these drop statements just in case:
-- DROP POLICY IF EXISTS "Admins can insert announcements" ON announcements;
-- DROP POLICY IF EXISTS "Admins can delete announcements" ON announcements;
-- DROP POLICY IF EXISTS "Everyone can read announcements" ON announcements;
-- DROP POLICY IF EXISTS "Users can select their own notifications" ON user_notifications;
-- DROP POLICY IF EXISTS "Users can insert their own notifications" ON user_notifications;
-- DROP POLICY IF EXISTS "Users can update their own notifications" ON user_notifications;
-- DROP POLICY IF EXISTS "Users can delete their own notifications" ON user_notifications;

-- Set Enable Real-time for announcements
ALTER PUBLICATION supabase_realtime ADD TABLE announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;
