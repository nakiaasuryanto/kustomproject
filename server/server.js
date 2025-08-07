const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static('../'));

// Root endpoint
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// GET all transactions with optional filters
app.get('/api/transactions', async (req, res) => {
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

// GET products
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM products ORDER BY name ASC');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// POST new product
app.post('/api/products', async (req, res) => {
    try {
        const { name, price } = req.body;
        
        if (!name || price === undefined) {
            return res.status(400).json({ error: 'Missing required fields: name, price' });
        }

        const [result] = await db.execute(
            'INSERT INTO products (name, price) VALUES (?, ?)',
            [name, price]
        );

        res.status(201).json({
            message: 'Product created successfully',
            id: result.insertId
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Product name already exists' });
        }
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

// PUT update product
app.put('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price } = req.body;
        
        if (!name || price === undefined) {
            return res.status(400).json({ error: 'Missing required fields: name, price' });
        }

        const [result] = await db.execute(
            'UPDATE products SET name = ?, price = ? WHERE id = ?',
            [name, price, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ message: 'Product updated successfully' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Product name already exists' });
        }
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// DELETE product
app.delete('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [result] = await db.execute('DELETE FROM products WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// POST new transaction
app.post('/api/transactions', async (req, res) => {
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
app.delete('/api/transactions/clear-all', async (req, res) => {
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

// Test database connection on startup
db.execute('SELECT 1')
    .then(() => {
        console.log('✅ Database connected successfully');
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📡 API available at http://localhost:${PORT}/api`);
        });
    })
    .catch((error) => {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
    });