-- Add 'change' and 'is_up' columns to 'ticker_items' table if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ticker_items' AND column_name='change') THEN 
        ALTER TABLE ticker_items ADD COLUMN change text DEFAULT '0.00%'; 
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ticker_items' AND column_name='is_up') THEN 
        ALTER TABLE ticker_items ADD COLUMN is_up boolean DEFAULT true; 
    END IF;
END $$;

COMMENT ON COLUMN ticker_items.change IS 'Stores the calculated change percentage (e.g. +1.50%)';
COMMENT ON COLUMN ticker_items.is_up IS 'Stores the direction of change (true for Up/Green, false for Down/Red)';
