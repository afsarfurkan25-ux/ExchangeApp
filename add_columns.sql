-- Supabase SQL Editor'de bu komutları çalıştırın --

-- Rates tablosuna is_visible ekle
ALTER TABLE rates 
ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE;

-- Ticker Items tablosuna is_visible ekle
ALTER TABLE ticker_items 
ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE;

-- Rates tablosuna değişim oranı (change) ekle
ALTER TABLE rates
ADD COLUMN IF NOT EXISTS change TEXT DEFAULT '0.00';
