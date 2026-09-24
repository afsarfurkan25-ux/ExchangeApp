-- 1. Veritabanı Şeması Güncellemeleri
-- organizations tablosu
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- app_role ENUM (Eğer yoksa oluştur)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE app_role AS ENUM ('admin', 'user');
    END IF;
END$$;

-- Mevcut members (kullanıcı) tablosuna kolonları ekle (Zaten role sütunu metin olarak var, ancak biz yeni gereksinime uyarlıyoruz)
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS app_role app_role DEFAULT 'user';

-- Panellere özel olması gereken uygulama tablolarına organization_id ekle
DO $$
DECLARE
    t TEXT;
    app_tables TEXT[] := ARRAY['settings', 'rates', 'ticker_items', 'live_rates', 'history_logs', 'activities', 'user_sessions', 'user_presence', 'announcements', 'user_notifications'];
BEGIN
    FOREACH t IN ARRAY app_tables
    LOOP
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;', t);
    END LOOP;
END $$;


-- 2. RLS (Row Level Security) ve Yardımcı Fonksiyonlar
-- Aktif kullanıcının organization_id bilgisini dönen fonksiyon (kendi yapınıza göre auth.uid() veya frontend'den JWT üzerinden ayarlanabilir. 
-- Ancak bu proje 'members' üzerinden kendi custom login mantığını yürüttüğü için auth.uid() ile eşleşme auth.users'a geçiş yapıldığında çalışacaktır.)
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS uuid AS $$
  -- Eğer standart Supabase Auth kullanılıyorsa:
  -- SELECT organization_id FROM public.members WHERE id = auth.uid();
  -- Not: Projede custom auth kullanılıyorsa, bu RLS yapısı için Supabase Auth (auth.users) altyapısına geçiş yapmanız gerekmektedir.
  -- RLS politikalarının doğrudan Supabase'in JWT context'inden auth.uid() okuması gerekir.
  SELECT organization_id FROM public.members WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Tüm ana tablolarda RLS aktif et ve Politikaları ekle
DO $$
DECLARE
    t TEXT;
    app_tables TEXT[] := ARRAY['settings', 'rates', 'ticker_items', 'live_rates', 'history_logs', 'activities', 'user_sessions', 'user_presence', 'announcements', 'user_notifications'];
BEGIN
    FOREACH t IN ARRAY app_tables
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
        
        -- Mevcut policy'leri temizle (varsa)
        EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_policy" ON public.%I;', t);
        
        -- Yeni policy ekle
        EXECUTE format('CREATE POLICY "tenant_isolation_policy" ON public.%I
            FOR ALL
            USING (organization_id = public.get_user_org_id())
            WITH CHECK (organization_id = public.get_user_org_id());', t);
    END LOOP;
END $$;

-- members tablosu RLS kuralları
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "members_isolation_policy" ON public.members;

-- Kullanıcılar kendi profillerini görebilir
CREATE POLICY "members_self_read_policy" ON public.members
    FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "members_self_update_policy" ON public.members
    FOR UPDATE
    USING (id = auth.uid());

-- Adminler kendi organizasyonundaki tüm profilleri görebilir ve yönetebilir
CREATE POLICY "members_admin_all_policy" ON public.members
    FOR ALL
    USING (
        organization_id = public.get_user_org_id() 
        AND (SELECT app_role FROM public.members WHERE id = auth.uid()) = 'admin'
    )
    WITH CHECK (
        organization_id = public.get_user_org_id() 
        AND (SELECT app_role FROM public.members WHERE id = auth.uid()) = 'admin'
    );


-- 3. Otomasyon Trigger'ları
-- auth.users'a yeni kayıt geldiğinde members (profil) kaydı oluşturan trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.members (id, name, username, app_role)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email, 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Tablolara INSERT atılırken organization_id boşsa otomatik dolduran trigger fonksiyonu
CREATE OR REPLACE FUNCTION public.set_organization_id()
RETURNS trigger AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := public.get_user_org_id();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
DECLARE
    t TEXT;
    app_tables TEXT[] := ARRAY['members', 'settings', 'rates', 'ticker_items', 'live_rates', 'history_logs', 'activities', 'user_sessions', 'user_presence', 'announcements', 'user_notifications'];
BEGIN
    FOREACH t IN ARRAY app_tables
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS tr_%I_set_org_id ON public.%I;', t, t);
        EXECUTE format('CREATE TRIGGER tr_%I_set_org_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE PROCEDURE public.set_organization_id();', t, t);
    END LOOP;
END $$;
