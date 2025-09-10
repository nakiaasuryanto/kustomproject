-- Kustomproject Finance - Inventory & Stock Management Migration
-- Supabase/PostgreSQL Version - Created: 2025-08-25
-- Implements variant model: product → product_colors → product_color_sizes (SKU)

-- 1. LOCATIONS TABLE
-- Manages storage locations (Display, Lemari, etc.)
CREATE TABLE IF NOT EXISTS locations (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PRODUCT_COLORS TABLE
-- Links products with available colors
CREATE TABLE IF NOT EXISTS product_colors (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    color_id BIGINT NOT NULL REFERENCES colors(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(product_id, color_id)
);

-- 3. PRODUCT_COLOR_SIZES TABLE (SKU Level)
-- Final variant level: specific product + color + size combinations
CREATE TABLE IF NOT EXISTS product_color_sizes (
    id BIGSERIAL PRIMARY KEY,
    product_color_id BIGINT NOT NULL REFERENCES product_colors(id) ON DELETE CASCADE,
    size_id BIGINT NOT NULL REFERENCES sizes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(product_color_id, size_id)
);

-- 4. STOCK_MOVEMENTS TABLE (Append-Only Ledger)
-- Records all stock movements (IN/OUT) with full traceability
CREATE TABLE IF NOT EXISTS stock_movements (
    id BIGSERIAL PRIMARY KEY,
    variant_id BIGINT NOT NULL REFERENCES product_color_sizes(id) ON DELETE CASCADE,
    location_id BIGINT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    movement_type VARCHAR(10) NOT NULL CHECK (movement_type IN ('IN', 'OUT')),
    reason_code VARCHAR(20) NOT NULL CHECK (reason_code IN (
        'SALES_OUT', 'GIFT_OUT', 'ADJUSTMENT_OUT', 'TRANSFER_OUT',
        'OVERPROD_IN', 'RETURN_IN', 'ADJUSTMENT_IN', 'TRANSFER_IN'
    )),
    qty INTEGER NOT NULL CHECK (qty > 0),
    unit VARCHAR(10) DEFAULT 'pcs',
    unit_cost DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'IDR',
    ref_table VARCHAR(50),
    ref_id BIGINT,
    ref_code VARCHAR(100),
    note TEXT,
    pic VARCHAR(100),
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. STOCK_BALANCES TABLE (Derived & Cached Balances)
-- Current stock on hand per variant per location
CREATE TABLE IF NOT EXISTS stock_balances (
    id BIGSERIAL PRIMARY KEY,
    variant_id BIGINT NOT NULL REFERENCES product_color_sizes(id) ON DELETE CASCADE,
    location_id BIGINT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    qty_on_hand INTEGER DEFAULT 0,
    avg_cost DECIMAL(15,2),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(variant_id, location_id)
);

-- 6. STOCK_OPNAME TABLE (Physical Count Sessions)
-- Manages stock opname/physical count sessions
CREATE TABLE IF NOT EXISTS stock_opname (
    id BIGSERIAL PRIMARY KEY,
    opname_code VARCHAR(50) NOT NULL UNIQUE,
    location_id BIGINT REFERENCES locations(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
    snapshot_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. STOCK_OPNAME_ITEMS TABLE
-- Individual count items within an opname session
CREATE TABLE IF NOT EXISTS stock_opname_items (
    id BIGSERIAL PRIMARY KEY,
    opname_id BIGINT NOT NULL REFERENCES stock_opname(id) ON DELETE CASCADE,
    variant_id BIGINT NOT NULL REFERENCES product_color_sizes(id) ON DELETE CASCADE,
    location_id BIGINT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    system_qty INTEGER DEFAULT 0,
    counted_qty INTEGER,
    variance_qty INTEGER GENERATED ALWAYS AS (counted_qty - system_qty) STORED,
    note TEXT,
    counted_by VARCHAR(100),
    counted_at TIMESTAMPTZ,
    
    UNIQUE(opname_id, variant_id, location_id)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_locations_code ON locations(code);
CREATE INDEX IF NOT EXISTS idx_locations_default ON locations(is_default);

CREATE INDEX IF NOT EXISTS idx_product_colors_product ON product_colors(product_id);
CREATE INDEX IF NOT EXISTS idx_product_colors_color ON product_colors(color_id);

CREATE INDEX IF NOT EXISTS idx_product_color_sizes_pc ON product_color_sizes(product_color_id);
CREATE INDEX IF NOT EXISTS idx_product_color_sizes_size ON product_color_sizes(size_id);

CREATE INDEX IF NOT EXISTS idx_stock_movements_variant ON stock_movements(variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_location ON stock_movements(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_variant_location_date ON stock_movements(variant_id, location_id, created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_ref ON stock_movements(ref_table, ref_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type_reason ON stock_movements(movement_type, reason_code);

CREATE INDEX IF NOT EXISTS idx_stock_balances_variant ON stock_balances(variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_balances_location ON stock_balances(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_balances_qty ON stock_balances(qty_on_hand);

CREATE INDEX IF NOT EXISTS idx_stock_opname_location ON stock_opname(location_id);
CREATE INDEX IF NOT EXISTS idx_stock_opname_status ON stock_opname(status);
CREATE INDEX IF NOT EXISTS idx_stock_opname_code ON stock_opname(opname_code);

CREATE INDEX IF NOT EXISTS idx_opname_items_opname ON stock_opname_items(opname_id);
CREATE INDEX IF NOT EXISTS idx_opname_items_variant ON stock_opname_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_opname_items_variance ON stock_opname_items(variance_qty);

-- TRIGGERS for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_colors_updated_at BEFORE UPDATE ON product_colors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_color_sizes_updated_at BEFORE UPDATE ON product_color_sizes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_balances_updated_at BEFORE UPDATE ON stock_balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_opname_updated_at BEFORE UPDATE ON stock_opname
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- SEED DATA
-- Insert default locations
INSERT INTO locations (code, name, is_default) VALUES 
('DISPLAY', 'Display Area', TRUE),
('LEMARI', 'Storage Cabinet', FALSE)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- Create initial product-color-size variants for existing data
-- This assumes products, colors, and sizes tables already exist
INSERT INTO product_colors (product_id, color_id)
SELECT p.id, c.id 
FROM products p 
CROSS JOIN colors c
WHERE p.id IN (1, 2, 3, 4, 5, 6, 7, 8) -- Adjust based on existing products
ON CONFLICT (product_id, color_id) DO NOTHING;

INSERT INTO product_color_sizes (product_color_id, size_id)
SELECT pc.id, s.id
FROM product_colors pc
CROSS JOIN sizes s
ON CONFLICT (product_color_id, size_id) DO NOTHING;

-- Initialize stock balances (zero inventory)
INSERT INTO stock_balances (variant_id, location_id, qty_on_hand)
SELECT pcs.id, l.id, 0
FROM product_color_sizes pcs
CROSS JOIN locations l
ON CONFLICT (variant_id, location_id) DO NOTHING;