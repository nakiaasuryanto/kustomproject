-- Create products table
USE kustomproject;

-- Create products table with id, name, and price
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    price INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert existing products from the current form options
INSERT INTO products (name, price) VALUES
('T-shirt Katun PDK', 45000),
('Long Sleeve', 65000),
('Kaos Artwork', 50000),
('Kaos Premium 24s', 55000),
('Kaos Oversized', 60000),
('Kaos Rugby', 70000),
('Kids T-shirt', 35000),
('Henley', 58000),
('Poloshirt', 65000),
('Poloshirt Long Sleeve', 75000),
('Poloshirt Krah Variasi', 68000),
('Kemeja Pique PDK', 70000),
('Kemeja Pique PJG', 80000),
('Kemeja Drill', 85000),
('Totebag', 25000),
('Shopping Bag', 30000),
('Jaket Varsity', 120000),
('Jaket Micro', 100000),
('Jaket Varsity - Furing', 140000),
('Sweater', 90000),
('Defect Sale', 20000),
('Kaos Ringer', 48000),
('Kaos Krah', 52000),
('Kaos Baseball', 55000),
('Scrunchie', 15000);