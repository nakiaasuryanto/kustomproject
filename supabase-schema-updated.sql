-- Updated Supabase Database Schema for Kustomproject Finance Management System
-- Only 3 price columns as specified

-- 1. PRODUCTS TABLE with simplified pricing
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    
    -- Only 3 price columns as specified
    price_no_promo INTEGER NOT NULL DEFAULT 0,
    price_b1g1 INTEGER NOT NULL DEFAULT 0,
    price_random INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. COLORS TABLE (unchanged)
CREATE TABLE IF NOT EXISTS colors (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    hex_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SIZES TABLE (unchanged)
CREATE TABLE IF NOT EXISTS sizes (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TRANSACTIONS TABLE (updated to handle multiple items per transaction)
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('penjualan', 'pengeluaran')),
    date DATE NOT NULL,
    promo_type TEXT, -- Added at transaction level
    
    -- Sales transaction fields - now for multiple items
    items JSONB, -- Store multiple items as JSON array
    manual_price INTEGER, -- For bundling type transactions
    total INTEGER,
    payment_method TEXT,
    pic_sales TEXT,
    free_items JSONB, -- Store multiple free items as JSON array
    
    -- Expense transaction fields
    expense_category TEXT,
    description TEXT,
    amount INTEGER,
    pic TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clear existing data and insert updated products with only 3 price columns
DELETE FROM products;

INSERT INTO products (name, price_no_promo, price_b1g1, price_random) VALUES
('T-shirt Katun PDK', 45000, 40000, 35000),
('Long Sleeve', 65000, 58000, 50000),
('Kaos Artwork', 50000, 45000, 40000),
('Kaos Premium 24s', 55000, 50000, 45000),
('Kaos Oversized', 60000, 55000, 50000),
('Kaos Rugby', 70000, 65000, 60000),
('Kids T-shirt', 35000, 30000, 25000),
('Henley', 58000, 53000, 48000),
('Poloshirt', 65000, 60000, 55000),
('Poloshirt Long Sleeve', 75000, 70000, 65000),
('Poloshirt Krah Variasi', 68000, 63000, 58000),
('Kemeja Pique PDK', 70000, 65000, 60000),
('Kemeja Pique PJG', 80000, 75000, 70000),
('Kemeja Drill', 85000, 80000, 75000),
('Totebag', 25000, 22000, 18000),
('Shopping Bag', 30000, 27000, 22000),
('Jaket Varsity', 120000, 115000, 105000),
('Jaket Micro', 100000, 95000, 85000),
('Jaket Varsity - Furing', 140000, 135000, 125000),
('Sweater', 90000, 85000, 75000),
('Defect Sale', 20000, 18000, 12000),
('Kaos Ringer', 48000, 43000, 38000),
('Kaos Krah', 52000, 47000, 42000),
('Kaos Baseball', 55000, 50000, 45000),
('Scrunchie', 15000, 12000, 8000);

-- Insert colors (unchanged)
INSERT INTO colors (name, hex_code) VALUES
('Black', '#000000'),
('White', '#FFFFFF'),
('Navy Blue', '#000080'),
('Sky Blue', '#87CEEB'),
('Midnight Blue', '#191970'),
('Royal Blue', '#4169E1'),
('Red', '#FF0000'),
('Maroon', '#800000'),
('Dark Red', '#8B0000'),
('Green', '#008000'),
('Forest Green', '#228B22'),
('Dark Green', '#006400'),
('Yellow', '#FFFF00'),
('Gold', '#FFD700'),
('Orange', '#FFA500'),
('Purple', '#800080'),
('Pink', '#FFC0CB'),
('Brown', '#A52A2A'),
('Gray', '#808080'),
('Cream', '#F5F5DC')
ON CONFLICT (name) DO NOTHING;

-- Insert sizes (unchanged)
INSERT INTO sizes (name, sort_order) VALUES
('XS', 1),
('S', 2),
('M', 3),
('L', 4),
('XL', 5),
('XXL', 6),
('XXXL', 7),
('All Size', 8)
ON CONFLICT (name) DO NOTHING;