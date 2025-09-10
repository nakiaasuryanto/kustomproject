-- Kustomproject Finance - Inventory & Stock Management Migration
-- MySQL Version - Created: 2025-08-25
-- Implements variant model: product → product_colors → product_color_sizes (SKU)

SET FOREIGN_KEY_CHECKS = 0;

-- 1. LOCATIONS TABLE
-- Manages storage locations (Display, Lemari, etc.)
CREATE TABLE IF NOT EXISTS locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_locations_code (code),
    INDEX idx_locations_default (is_default)
);

-- 2. PRODUCT_COLORS TABLE
-- Links products with available colors
CREATE TABLE IF NOT EXISTS product_colors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    color_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_product_color (product_id, color_id),
    INDEX idx_product_colors_product (product_id),
    INDEX idx_product_colors_color (color_id)
);

-- 3. PRODUCT_COLOR_SIZES TABLE (SKU Level)
-- Final variant level: specific product + color + size combinations
CREATE TABLE IF NOT EXISTS product_color_sizes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_color_id INT NOT NULL,
    size_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_product_color_size (product_color_id, size_id),
    INDEX idx_product_color_sizes_pc (product_color_id),
    INDEX idx_product_color_sizes_size (size_id),
    
    FOREIGN KEY (product_color_id) REFERENCES product_colors(id) ON DELETE CASCADE
);

-- 4. STOCK_MOVEMENTS TABLE (Append-Only Ledger)
-- Records all stock movements (IN/OUT) with full traceability
CREATE TABLE IF NOT EXISTS stock_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    variant_id INT NOT NULL COMMENT 'References product_color_sizes.id',
    location_id INT NOT NULL,
    movement_type ENUM('IN', 'OUT') NOT NULL,
    reason_code ENUM(
        'SALES_OUT', 'GIFT_OUT', 'ADJUSTMENT_OUT', 'TRANSFER_OUT',
        'OVERPROD_IN', 'RETURN_IN', 'ADJUSTMENT_IN', 'TRANSFER_IN'
    ) NOT NULL,
    qty INT NOT NULL COMMENT 'Always positive, direction determined by movement_type',
    unit VARCHAR(10) DEFAULT 'pcs',
    unit_cost DECIMAL(15,2) NULL COMMENT 'Cost per unit for IN movements',
    currency VARCHAR(3) DEFAULT 'IDR',
    ref_table VARCHAR(50) NULL COMMENT 'Reference table name (transactions, etc)',
    ref_id INT NULL COMMENT 'Reference record ID',
    ref_code VARCHAR(100) NULL COMMENT 'Reference code/number',
    note TEXT NULL,
    pic VARCHAR(100) NULL COMMENT 'Person in charge',
    created_by VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_stock_movements_variant (variant_id),
    INDEX idx_stock_movements_location (location_id),
    INDEX idx_stock_movements_variant_location_date (variant_id, location_id, created_at),
    INDEX idx_stock_movements_ref (ref_table, ref_id),
    INDEX idx_stock_movements_type_reason (movement_type, reason_code),
    
    FOREIGN KEY (variant_id) REFERENCES product_color_sizes(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- 5. STOCK_BALANCES TABLE (Derived & Cached Balances)
-- Current stock on hand per variant per location
CREATE TABLE IF NOT EXISTS stock_balances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    variant_id INT NOT NULL,
    location_id INT NOT NULL,
    qty_on_hand INT DEFAULT 0,
    avg_cost DECIMAL(15,2) NULL COMMENT 'Moving average cost',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_variant_location (variant_id, location_id),
    INDEX idx_stock_balances_variant (variant_id),
    INDEX idx_stock_balances_location (location_id),
    INDEX idx_stock_balances_qty (qty_on_hand),
    
    FOREIGN KEY (variant_id) REFERENCES product_color_sizes(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- 6. STOCK_OPNAME TABLE (Physical Count Sessions)
-- Manages stock opname/physical count sessions
CREATE TABLE IF NOT EXISTS stock_opname (
    id INT AUTO_INCREMENT PRIMARY KEY,
    opname_code VARCHAR(50) NOT NULL UNIQUE,
    location_id INT NULL COMMENT 'NULL for all locations',
    status ENUM('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED') DEFAULT 'DRAFT',
    snapshot_at TIMESTAMP NULL COMMENT 'When counts were frozen',
    completed_at TIMESTAMP NULL,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_stock_opname_location (location_id),
    INDEX idx_stock_opname_status (status),
    INDEX idx_stock_opname_code (opname_code),
    
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- 7. STOCK_OPNAME_ITEMS TABLE
-- Individual count items within an opname session
CREATE TABLE IF NOT EXISTS stock_opname_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    opname_id INT NOT NULL,
    variant_id INT NOT NULL,
    location_id INT NOT NULL,
    system_qty INT DEFAULT 0 COMMENT 'System balance at snapshot',
    counted_qty INT NULL COMMENT 'Physical count',
    variance_qty INT GENERATED ALWAYS AS (counted_qty - system_qty) STORED,
    note TEXT NULL,
    counted_by VARCHAR(100) NULL,
    counted_at TIMESTAMP NULL,
    
    UNIQUE KEY unique_opname_variant_location (opname_id, variant_id, location_id),
    INDEX idx_opname_items_opname (opname_id),
    INDEX idx_opname_items_variant (variant_id),
    INDEX idx_opname_items_variance (variance_qty),
    
    FOREIGN KEY (opname_id) REFERENCES stock_opname(id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_color_sizes(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

SET FOREIGN_KEY_CHECKS = 1;

-- SEED DATA
-- Insert default locations
INSERT INTO locations (code, name, is_default) VALUES 
('DISPLAY', 'Display Area', TRUE),
('LEMARI', 'Storage Cabinet', FALSE)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Create initial product-color-size variants for existing data
-- This assumes products, colors, and sizes tables already exist
INSERT IGNORE INTO product_colors (product_id, color_id)
SELECT p.id, c.id 
FROM products p 
CROSS JOIN colors c
WHERE p.id IN (1, 2, 3, 4, 5, 6, 7, 8); -- Adjust based on existing products

INSERT IGNORE INTO product_color_sizes (product_color_id, size_id)
SELECT pc.id, s.id
FROM product_colors pc
CROSS JOIN sizes s;

-- Initialize stock balances (zero inventory)
INSERT IGNORE INTO stock_balances (variant_id, location_id, qty_on_hand)
SELECT pcs.id, l.id, 0
FROM product_color_sizes pcs
CROSS JOIN locations l;

COMMIT;