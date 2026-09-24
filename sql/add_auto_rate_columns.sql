-- Canlı veriden otomatik kur besleme için gereken alanlar.
-- sql/create_live_rates_table.sql çalıştırıldıktan SONRA uygulayın.

-- ── rates: otomasyon alanları ────────────────────────────────────────────────
ALTER TABLE public.rates
    -- Bu satırı hangi canlı sembol besliyor. NULL = tamamen manuel satır.
    ADD COLUMN IF NOT EXISTS live_symbol      text,
    -- Satır kilidi: sarraf elle değiştirdiyse otomasyon bir daha dokunmaz.
    ADD COLUMN IF NOT EXISTS is_manual        boolean NOT NULL DEFAULT false,
    -- Satıra özel marj. NULL ise settings'teki varsayılan kullanılır.
    ADD COLUMN IF NOT EXISTS margin_type      text,      -- 'percent' | 'amount'
    ADD COLUMN IF NOT EXISTS margin_value     numeric,
    -- Kaynak piyasa kapalıyken true; pano "kapalı" rozeti gösterir.
    ADD COLUMN IF NOT EXISTS is_stale         boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS source           text,
    ADD COLUMN IF NOT EXISTS auto_updated_at  timestamptz;

ALTER TABLE public.rates
    DROP CONSTRAINT IF EXISTS rates_margin_type_check;
ALTER TABLE public.rates
    ADD CONSTRAINT rates_margin_type_check
    CHECK (margin_type IS NULL OR margin_type IN ('percent', 'amount'));

-- ── settings: varsayılan marj tipi (margin kolonu zaten mevcut) ──────────────
ALTER TABLE public.settings
    ADD COLUMN IF NOT EXISTS margin_type text NOT NULL DEFAULT 'percent';

ALTER TABLE public.settings
    DROP CONSTRAINT IF EXISTS settings_margin_type_check;
ALTER TABLE public.settings
    ADD CONSTRAINT settings_margin_type_check
    CHECK (margin_type IN ('percent', 'amount'));

-- ── Net olan eşleşmeleri bağla ───────────────────────────────────────────────
-- Cumhuriyet Altını / Ata Altın / 18 Ayar / 14 Ayar kasıtlı olarak BAĞLANMADI:
--   * Cumhuriyet ve Ata hangi sembole denk geliyor, teyit gerekiyor
--   * 18 Ayar kaynakta yok
--   * 14 Ayar (AYAR14) %24.7 makasla geliyor, güvenilmez
-- Bunlar manuel kalır; panelden live_symbol atayınca otomatiğe geçerler.
UPDATE public.rates SET live_symbol = 'HAS'    WHERE name = '24 Ayar (Has) Gram' AND live_symbol IS NULL;
UPDATE public.rates SET live_symbol = 'HAS'    WHERE name = 'Gram Altın'         AND live_symbol IS NULL;
UPDATE public.rates SET live_symbol = 'AYAR22' WHERE name = '22 Ayar Bilezik'    AND live_symbol IS NULL;
UPDATE public.rates SET live_symbol = 'CEYREK' WHERE name = 'Çeyrek Altın'       AND live_symbol IS NULL;
UPDATE public.rates SET live_symbol = 'YARIM'  WHERE name = 'Yarım Altın'        AND live_symbol IS NULL;
UPDATE public.rates SET live_symbol = 'TAM'    WHERE name = 'Tam Altın'          AND live_symbol IS NULL;
UPDATE public.rates SET live_symbol = 'GREMSE' WHERE name = 'Gremse (2.5)'       AND live_symbol IS NULL;
UPDATE public.rates SET live_symbol = 'GUMUS'  WHERE name = 'Gümüş (Gram)'       AND live_symbol IS NULL;
UPDATE public.rates SET live_symbol = 'USD'    WHERE name = 'Amerikan Doları'    AND live_symbol IS NULL;
UPDATE public.rates SET live_symbol = 'EUR'    WHERE name = 'Euro'               AND live_symbol IS NULL;
UPDATE public.rates SET live_symbol = 'GBP'    WHERE name = 'İngiliz Sterlini'   AND live_symbol IS NULL;

-- Kontrol: hangi satır neye bağlandı
-- SELECT name, live_symbol, is_manual, margin_type, margin_value FROM public.rates ORDER BY order_index;
