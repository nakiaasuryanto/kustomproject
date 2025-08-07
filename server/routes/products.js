
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET products
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM products ORDER BY name ASC');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// POST new product
router.post('/', async (req, res) => {
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
router.put('/:id', async (req, res) => {
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
router.delete('/:id', async (req, res) => {
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

module.exports = router;
