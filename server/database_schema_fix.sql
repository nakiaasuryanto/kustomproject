-- This script updates the transactions table to precisely match the data structure expected by the current index.html.
-- Run this in your Supabase SQL Editor.

-- Drop old, conflicting columns if they exist
ALTER TABLE transactions DROP COLUMN IF EXISTS product;
ALTER TABLE transactions DROP COLUMN IF EXISTS color;
ALTER TABLE transactions DROP COLUMN IF EXISTS size;
ALTER TABLE transactions DROP COLUMN IF EXISTS quantity;
ALTER TABLE transactions DROP COLUMN IF EXISTS price_per_pcs;
ALTER TABLE transactions DROP COLUMN IF EXISTS free_item;

-- Add new columns required by the current index.html form structure
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS items JSONB;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS manual_price INTEGER;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS free_items JSONB;
