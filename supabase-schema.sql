-- Supabase Database Schema for Kustomproject Finance Management System

-- Enable Row Level Security (RLS) for all tables
-- Note: You can adjust these policies based on your security requirements

-- 1. PRODUCTS TABLE with promo pricing
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    
    -- Different price points for different promo types
    price_no_promo INTEGER NOT NULL DEFAULT 0,
    price_b1g1 INTEGER NOT NULL DEFAULT 0,
    price_bundling INTEGER NOT NULL DEFAULT 0,
    price_family_set INTEGER NOT NULL DEFAULT 0,
    price_random_set INTEGER NOT NULL DEFAULT 0,
    price_scrunchie_set INTEGER NOT NULL DEFAULT 0,
    price_2pcs_sablon INTEGER NOT NULL DEFAULT 0,
    price_bulk INTEGER NOT NULL DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. COLORS TABLE
CREATE TABLE IF NOT EXISTS colors (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    hex_code TEXT, -- Optional hex color code for UI
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SIZES TABLE (bonus - for better organization)
CREATE TABLE IF NOT EXISTS sizes (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER DEFAULT 0, -- For ordering S, M, L, XL, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('penjualan', 'pengeluaran')),
    date DATE NOT NULL,
    
    -- Sales transaction fields
    product TEXT,
    color TEXT,
    size TEXT,
    promo_type TEXT,
    quantity INTEGER,
    price_per_pcs INTEGER,
    total INTEGER,
    payment_method TEXT,
    pic_sales TEXT,
    free_item TEXT,
    
    -- Expense transaction fields
    expense_category TEXT,
    description TEXT,
    amount INTEGER,
    pic TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default products with promo pricing
INSERT INTO products (name, price_no_promo, price_b1g1, price_bundling, price_family_set, price_random_set, price_scrunchie_set, price_2pcs_sablon, price_bulk) VALUES
('T-shirt Katun PDK', 45000, 40000, 42000, 38000, 35000, 0, 38000, 35000),
('Long Sleeve', 65000, 58000, 60000, 55000, 50000, 0, 55000, 50000),
('Kaos Artwork', 50000, 45000, 47000, 43000, 40000, 0, 43000, 40000),
('Kaos Premium 24s', 55000, 50000, 52000, 48000, 45000, 0, 48000, 45000),
('Kaos Oversized', 60000, 55000, 57000, 53000, 50000, 0, 53000, 50000),
('Kaos Rugby', 70000, 65000, 67000, 63000, 60000, 0, 63000, 60000),
('Kids T-shirt', 35000, 30000, 32000, 28000, 25000, 0, 28000, 25000),
('Henley', 58000, 53000, 55000, 51000, 48000, 0, 51000, 48000),
('Poloshirt', 65000, 60000, 62000, 58000, 55000, 0, 58000, 55000),
('Poloshirt Long Sleeve', 75000, 70000, 72000, 68000, 65000, 0, 68000, 65000),
('Poloshirt Krah Variasi', 68000, 63000, 65000, 61000, 58000, 0, 61000, 58000),
('Kemeja Pique PDK', 70000, 65000, 67000, 63000, 60000, 0, 63000, 60000),
('Kemeja Pique PJG', 80000, 75000, 77000, 73000, 70000, 0, 73000, 70000),
('Kemeja Drill', 85000, 80000, 82000, 78000, 75000, 0, 78000, 75000),
('Totebag', 25000, 22000, 23000, 20000, 18000, 0, 20000, 18000),
('Shopping Bag', 30000, 27000, 28000, 25000, 22000, 0, 25000, 22000),
('Jaket Varsity', 120000, 115000, 117000, 110000, 105000, 0, 110000, 105000),
('Jaket Micro', 100000, 95000, 97000, 90000, 85000, 0, 90000, 85000),
('Jaket Varsity - Furing', 140000, 135000, 137000, 130000, 125000, 0, 130000, 125000),
('Sweater', 90000, 85000, 87000, 80000, 75000, 0, 80000, 75000),
('Defect Sale', 20000, 18000, 19000, 15000, 12000, 0, 15000, 12000),
('Kaos Ringer', 48000, 43000, 45000, 40000, 38000, 0, 40000, 38000),
('Kaos Krah', 52000, 47000, 49000, 45000, 42000, 0, 45000, 42000),
('Kaos Baseball', 55000, 50000, 52000, 48000, 45000, 0, 48000, 45000),
('Scrunchie', 15000, 12000, 13000, 10000, 8000, 12000, 10000, 8000);

-- Insert default colors
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
('Cream', '#F5F5DC');

-- Insert default sizes
INSERT INTO sizes (name, sort_order) VALUES
('XS', 1),
('S', 2),
('M', 3),
('L', 4),
('XL', 5),
('XXL', 6),
('XXXL', 7),
('All Size', 8);

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all operations for now - adjust based on your needs)
CREATE POLICY "Allow all operations on products" ON products FOR ALL USING (true);
CREATE POLICY "Allow all operations on colors" ON colors FOR ALL USING (true);
CREATE POLICY "Allow all operations on sizes" ON sizes FOR ALL USING (true);
CREATE POLICY "Allow all operations on transactions" ON transactions FOR ALL USING (true);

-- Create functions for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_colors_updated_at BEFORE UPDATE ON colors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();