-- Create database
CREATE DATABASE IF NOT EXISTS kustomproject;
USE kustomproject;

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    product VARCHAR(100) NOT NULL,
    promo_type VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    price_per_pcs INT NOT NULL,
    total INT NOT NULL,
    fee INT NOT NULL,
    payment_method VARCHAR(10) NOT NULL,
    pic_sales VARCHAR(50) NOT NULL,
    free_item TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data for testing
INSERT INTO transactions (date, product, promo_type, quantity, price_per_pcs, total, fee, payment_method, pic_sales, free_item) VALUES
('2024-01-15', 'Kaos Anak', 'No Promo', 2, 50000, 100000, 20000, 'CASH', 'Ayu', NULL),
('2024-01-15', 'Kaos Dewasa', 'B1G1', 4, 75000, 300000, 60000, 'TF', 'Lili', 'Sticker'),
('2024-01-16', 'Kaos PJG', 'Bulk', 10, 80000, 800000, 160000, 'TF', 'Nadira', NULL);