-- This script cleans up the transactions table, restoring it to a correct state.

-- Drop the incorrect columns that were added.
ALTER TABLE transactions DROP COLUMN IF EXISTS items;
ALTER TABLE transactions DROP COLUMN IF EXISTS free_items;
ALTER TABLE transactions DROP COLUMN IF EXISTS manual_price;

-- Restore the original columns that might have been removed.
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS product TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS size TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS quantity INTEGER;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS price_per_pcs INTEGER;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS free_item TEXT;
