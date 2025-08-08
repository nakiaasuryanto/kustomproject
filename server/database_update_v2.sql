-- This script updates the transactions table to match the new application structure.

-- Step 1: Drop the old, redundant columns.
ALTER TABLE transactions DROP COLUMN IF EXISTS product;
ALTER TABLE transactions DROP COLUMN IF EXISTS color;
ALTER TABLE transactions DROP COLUMN IF EXISTS size;
ALTER TABLE transactions DROP COLUMN IF EXISTS quantity;
ALTER TABLE transactions DROP COLUMN IF EXISTS price_per_pcs;
ALTER TABLE transactions DROP COLUMN IF EXISTS free_item;

-- Step 2: Add new columns to support the new features.
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS free_items JSONB;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS manual_price INTEGER;
