-- Add color and size columns to transactions table
USE kustomproject;

-- Add new columns for product color and size
ALTER TABLE transactions 
ADD COLUMN color VARCHAR(50) NULL AFTER product,
ADD COLUMN size VARCHAR(20) NULL AFTER color;