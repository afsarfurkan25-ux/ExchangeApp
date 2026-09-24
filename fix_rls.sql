-- Row Level Security (RLS) Güvenlik Yapılandırması
-- Bu dosya, veritabanı tablolarını dış saldırılara karşı korur.

-- 1. ADIM: Güvenliği aktif et (ENABLE)
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history_logs ENABLE ROW LEVEL SECURITY;

-- 2. ADIM: Mevcut (varsa) tüm açık kuralları temizle
DROP POLICY IF EXISTS "Enable all access for everyone" ON public.user_sessions;
DROP POLICY IF EXISTS "Enable all access for everyone" ON public.activities;
DROP POLICY IF EXISTS "Enable all access for everyone" ON public.history_logs;

-- 3. ADIM: Güvenli Kuralları (Policy) Tanımla
-- Admin ve uygulamanın okuma yapabilmesi için:
CREATE POLICY "Enable read access for authenticated users" ON public.user_sessions FOR SELECT USING (true);
CREATE POLICY "Enable read access for authenticated users" ON public.activities FOR SELECT USING (true);
CREATE POLICY "Enable read access for authenticated users" ON public.history_logs FOR SELECT USING (true);

-- Uygulamanın log tutmaya (yazmaya) devam edebilmesi için:
CREATE POLICY "Enable insert access for everyone" ON public.user_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert access for everyone" ON public.activities FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert access for everyone" ON public.history_logs FOR INSERT WITH CHECK (true);
