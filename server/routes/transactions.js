
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all transactions with optional filters
router.get('/', async (req, res) => {
    try {
        const { type, pic, start, end } = req.query;
        
        let query = 'SELECT * FROM transactions WHERE 1=1';
        const params = [];
        
        // Add filters
        if (type) {
            query += ' AND type = ?';
            params.push(type);
        }
        
        if (pic) {
            query += ' AND (pic_sales = ? OR pic = ?)';
            params.push(pic, pic);
        }
        
        if (start) {
            query += ' AND date >= ?';
            params.push(start);
        }
        
        if (end) {
            query += ' AND date <= ?';
            params.push(end);
        }
        
        query += ' ORDER BY created_at DESC';
        
        console.log('🔍 Query:', query);
        console.log('📊 Params:', params);
        
        const [rows] = await db.execute(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// POST new transaction
router.post('/', async (req, res) => {
    try {
        console.log('📝 Received transaction data:', req.body);
        const { type, date, payment_method } = req.body;

        // Validate common required fields
        if (!type || !date || !payment_method) {
            return res.status(400).json({ error: 'Missing required fields: type, date, payment_method' });
        }

        let result;

        if (type === 'penjualan') {
            // Handle sales transaction
            const {
                product,
                promo_type,
                quantity,
                price_per_pcs,
                total,
                pic_sales,
                free_item
            } = req.body;

            // Validate sales-specific required fields
            if (!product || !promo_type || !quantity || !price_per_pcs || !pic_sales) {
                return res.status(400).json({ error: 'Missing required sales fields' });
            }

            const [insertResult] = await db.execute(
                `INSERT INTO transactions 
                 (type, date, product, promo_type, quantity, price_per_pcs, total, payment_method, pic_sales, free_item) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [type, date, product, promo_type, quantity, price_per_pcs, total, payment_method, pic_sales, free_item || null]
            );
            result = insertResult;

        } else if (type === 'pengeluaran') {
            // Handle expense transaction
            const {
                expense_category,
                description,
                amount,
                pic
            } = req.body;

            // Validate expense-specific required fields
            if (!expense_category || !description || !amount) {
                return res.status(400).json({ error: 'Missing required expense fields' });
            }

            const [insertResult] = await db.execute(
                `INSERT INTO transactions 
                 (type, date, expense_category, description, amount, payment_method, pic) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [type, date, expense_category, description, amount, payment_method, pic || null]
            );
            result = insertResult;

        } else {
            return res.status(400).json({ error: 'Invalid transaction type. Must be "penjualan" or "pengeluaran"' });
        }

        // Return the created transaction
        const [newTransaction] = await db.execute(
            'SELECT * FROM transactions WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json(newTransaction[0]);
    } catch (error) {
        console.error('❌ Error creating transaction:', error);
        console.error('📊 Request body was:', req.body);
        res.status(500).json({ error: 'Failed to create transaction', details: error.message });
    }
});

// DELETE all transactions (clear database)
router.delete('/clear-all', async (req, res) => {
    try {
        // Delete all transactions
        const [result] = await db.query('DELETE FROM transactions');
        
        // Reset auto increment counter
        await db.query('ALTER TABLE transactions AUTO_INCREMENT = 1');
        
        console.log('🗑️ All transactions cleared');
        res.json({ 
            message: 'All transactions cleared successfully', 
            deletedCount: result.affectedRows 
        });
    } catch (error) {
        console.error('Error clearing transactions:', error);
        res.status(500).json({ error: 'Failed to clear transactions' });
    }
});

module.exports = router;
