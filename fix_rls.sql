-- Bu komutlar, tabloları Supabase arayüzünden oluştururken
-- otomatik açılan RLS (Satır Düzeyi Güvenlik) kilidini kaldırır.
-- Bu sayede uygulamanız tablolara veri okuyup yazabilir.

ALTER TABLE public.user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.history_logs DISABLE ROW LEVEL SECURITY;
