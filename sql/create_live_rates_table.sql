-- Merkezî ingestion servisinin yazdığı canlı kur tablosu.
-- İstemciler buraya YAZMAZ; yalnızca realtime ile okur.

CREATE TABLE IF NOT EXISTS public.live_rates (
    symbol        text PRIMARY KEY,          -- kanonik sembol: HAS, ONS, USD, CEYREK...
    bid           numeric NOT NULL,
    ask           numeric NOT NULL,
    prev_close    numeric,
    change_pct    numeric,
    category      text,
    source        text NOT NULL,             -- hangi kaynaktan geldi (altinapi-socket, altinapi-rest...)
    upstream_symbol text,                    -- kaynaktaki orijinal sembol
    is_stale      boolean NOT NULL DEFAULT false,  -- piyasa kapalı / snapshot / kaynak bayat
    fetched_at    timestamptz NOT NULL,      -- değerin kaynaktaki anı
    updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS live_rates_updated_at_idx ON public.live_rates (updated_at DESC);

-- RLS: herkes okuyabilir, kimse yazamaz. Yazma yalnızca service_role ile
-- (ingestion servisi) yapılır ve service_role RLS'i baypas eder.
ALTER TABLE public.live_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "live_rates okunabilir" ON public.live_rates;
CREATE POLICY "live_rates okunabilir" ON public.live_rates
    FOR SELECT USING (true);

-- Realtime yayınına ekle (zaten ekliyse hata vermemesi için kontrollü)
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_rates;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
