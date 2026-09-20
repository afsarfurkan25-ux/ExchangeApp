-- Marjı alış ve satış için ayırır.
-- sql/add_auto_rate_columns.sql çalıştırıldıktan SONRA uygulanır.
--
-- Formül:
--   Alış  = piyasa alış (bid) − alış marjı
--   Satış = piyasa satış (ask) + satış marjı
--
-- Yani pozitif marj makası sarrafın lehine açar. Ters yöne kaydırmak
-- isterseniz negatif değer girebilirsiniz (ör. alış marjı -10 => bid + 10).
-- Birim (yüzde/tutar) satır başına tektir, iki tarafa da aynı uygulanır.

ALTER TABLE public.rates
    ADD COLUMN IF NOT EXISTS margin_buy  numeric,
    ADD COLUMN IF NOT EXISTS margin_sell numeric;

-- Eski tek marj değerini iki tarafa da taşı (varsa)
UPDATE public.rates
SET margin_buy  = COALESCE(margin_buy,  margin_value),
    margin_sell = COALESCE(margin_sell, margin_value)
WHERE margin_value IS NOT NULL;

ALTER TABLE public.rates DROP COLUMN IF EXISTS margin_value;

-- settings: genel varsayılan da iki taraflı olsun
ALTER TABLE public.settings
    ADD COLUMN IF NOT EXISTS margin_sell numeric;

UPDATE public.settings SET margin_sell = COALESCE(margin_sell, margin) WHERE margin IS NOT NULL;

-- Not: settings.margin artık "varsayılan ALIŞ marjı",
--      settings.margin_sell "varsayılan SATIŞ marjı" anlamına gelir.

-- Kontrol:
-- SELECT name, live_symbol, margin_type, margin_buy, margin_sell, is_manual
-- FROM public.rates ORDER BY order_index;
