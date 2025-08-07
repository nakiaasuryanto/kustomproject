-- Add columns to support expense transactions
USE kustomproject;

-- Add transaction type column
ALTER TABLE transactions 
ADD COLUMN type ENUM('penjualan', 'pengeluaran') NOT NULL DEFAULT 'penjualan';

-- Make sales-specific columns nullable for expense transactions
ALTER TABLE transactions 
MODIFY COLUMN product VARCHAR(100) NULL,
MODIFY COLUMN promo_type VARCHAR(50) NULL,
MODIFY COLUMN quantity INT NULL,
MODIFY COLUMN price_per_pcs INT NULL,
MODIFY COLUMN total INT NULL,
MODIFY COLUMN fee INT NULL,
MODIFY COLUMN pic_sales VARCHAR(50) NULL;

-- Add expense-specific columns
ALTER TABLE transactions 
ADD COLUMN expense_category VARCHAR(100) NULL,
ADD COLUMN description TEXT NULL,
ADD COLUMN amount INT NULL,
ADD COLUMN pic VARCHAR(50) NULL;