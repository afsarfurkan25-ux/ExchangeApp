-- Kalan manuel satırların canlı sembollere bağlanması.
-- sql/add_auto_rate_columns.sql'den SONRA uygulanır.

-- Cumhuriyet Altını ve Ata Altın: kaynakta bu ikisini ayıran iki sembol yok,
-- her ikisi de ATA_YENI'den beslenir. İki satır aynı fiyatı gösterecektir.
UPDATE public.rates SET live_symbol = 'ATA'    WHERE name = 'Cumhuriyet Altını';
UPDATE public.rates SET live_symbol = 'ATA'    WHERE name = 'Ata Altın';

-- 14 Ayar: AYAR14 sembolü mevcut. Makası ~%25 (işçilik farkı), bu yüzden
-- ingestion tarafında bu sembole özel %30 eşik tanımlandı.
UPDATE public.rates SET live_symbol = 'AYAR14' WHERE name = '14 Ayar';

-- 18 Ayar: kaynakta karşılığı yok, manuel kalıyor (live_symbol NULL).

-- Kontrol:
-- SELECT name, live_symbol, is_manual, margin_type, margin_buy, margin_sell
-- FROM public.rates ORDER BY order_index;
