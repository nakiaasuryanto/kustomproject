
const express = require('express');
const router = express.Router();
const db = require('../db');
const MovementService = require('../services/movementService');

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

// POST new transaction (Enhanced with stock integration)
router.post('/create', async (req, res) => {
    const connection = await db.getConnection();
    
    try {
        await connection.beginTransaction();
        
        console.log('📝 Creating enhanced transaction:', req.body);
        const { type, date, items, payment_method, total = 0 } = req.body;

        // Validate common required fields
        if (!type || !date) {
            return res.status(400).json({ 
                success: false,
                error: 'Missing required fields: type, date' 
            });
        }

        let transactionId;
        let stockMovements = [];

        if (type === 'penjualan') {
            // Handle sales transaction
            const {
                promo_type,
                pic_sales,
                free_items,
                manual_price
            } = req.body;

            if (!items || !Array.isArray(items) || items.length === 0) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Sales transactions must have items' 
                });
            }

            if (!pic_sales) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Missing required field: pic_sales' 
                });
            }

            // Create transaction record
            const [insertResult] = await connection.execute(
                `INSERT INTO transactions 
                 (type, date, promo_type, items, total, manual_price, payment_method, pic_sales, free_items) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [type, date, promo_type, JSON.stringify(items), total, manual_price, payment_method, pic_sales, 
                 free_items ? JSON.stringify(free_items) : null]
            );
            transactionId = insertResult.insertId;

            // Create stock movements for sold items
            for (const item of items) {
                if (item.product_id && item.quantity > 0) {
                    try {
                        // Resolve color and size IDs from names if needed
                        let colorId = item.color_id;
                        let sizeId = item.size_id;

                        if (!colorId && item.color) {
                            const [colorRows] = await connection.execute(
                                'SELECT id FROM colors WHERE name = ?',
                                [item.color]
                            );
                            colorId = colorRows[0]?.id;
                        }

                        if (!sizeId && item.size) {
                            const [sizeRows] = await connection.execute(
                                'SELECT id FROM sizes WHERE name = ?',
                                [item.size]
                            );
                            sizeId = sizeRows[0]?.id;
                        }

                        if (colorId && sizeId) {
                            const variantId = await MovementService.resolveVariantId({
                                productId: item.product_id,
                                colorId,
                                sizeId
                            });

                            // Get default location (DISPLAY)
                            const [locationRows] = await connection.execute(
                                'SELECT id FROM locations WHERE is_default = TRUE LIMIT 1'
                            );
                            const locationId = locationRows[0]?.id || 1;

                            const movement = await MovementService.createMovement({
                                variantId,
                                locationId,
                                movementType: 'OUT',
                                reasonCode: 'SALES_OUT',
                                qty: item.quantity,
                                refTable: 'transactions',
                                refId: transactionId,
                                refCode: `TXN-${transactionId}`,
                                pic: pic_sales,
                                createdBy: pic_sales
                            }, connection);

                            stockMovements.push(movement);
                        }
                    } catch (stockError) {
                        console.warn('⚠️ Could not create stock movement for item:', item, stockError.message);
                    }
                }
            }

            // Create stock movements for free items (treated as SALES_OUT)
            if (free_items && Array.isArray(free_items)) {
                for (const freeItem of free_items) {
                    if (freeItem.product_id) {
                        try {
                            let colorId = freeItem.color_id;
                            let sizeId = freeItem.size_id;

                            if (!colorId && freeItem.color) {
                                const [colorRows] = await connection.execute(
                                    'SELECT id FROM colors WHERE name = ?',
                                    [freeItem.color]
                                );
                                colorId = colorRows[0]?.id;
                            }

                            if (!sizeId && freeItem.size) {
                                const [sizeRows] = await connection.execute(
                                    'SELECT id FROM sizes WHERE name = ?',
                                    [freeItem.size]
                                );
                                sizeId = sizeRows[0]?.id;
                            }

                            if (colorId && sizeId) {
                                const variantId = await MovementService.resolveVariantId({
                                    productId: freeItem.product_id,
                                    colorId,
                                    sizeId
                                });

                                const [locationRows] = await connection.execute(
                                    'SELECT id FROM locations WHERE is_default = TRUE LIMIT 1'
                                );
                                const locationId = locationRows[0]?.id || 1;

                                const movement = await MovementService.createMovement({
                                    variantId,
                                    locationId,
                                    movementType: 'OUT',
                                    reasonCode: 'SALES_OUT',
                                    qty: 1,
                                    refTable: 'transactions',
                                    refId: transactionId,
                                    refCode: `TXN-${transactionId}-FREE`,
                                    note: `Free item: ${freeItem.name}`,
                                    pic: pic_sales,
                                    createdBy: pic_sales
                                }, connection);

                                stockMovements.push(movement);
                            }
                        } catch (stockError) {
                            console.warn('⚠️ Could not create stock movement for free item:', freeItem, stockError.message);
                        }
                    }
                }
            }

        } else if (type === 'gift') {
            // Handle gift transaction
            const { reason, pic, recipient } = req.body;

            if (!items || !Array.isArray(items) || items.length === 0) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Gift transactions must have items' 
                });
            }

            // Create transaction record
            const [insertResult] = await connection.execute(
                `INSERT INTO transactions 
                 (type, date, items, reason, recipient, pic, total, payment_method) 
                 VALUES (?, ?, ?, ?, ?, ?, 0, NULL)`,
                [type, date, JSON.stringify(items), reason, recipient, pic]
            );
            transactionId = insertResult.insertId;

            // Create stock movements for gift items
            for (const item of items) {
                if (item.product_id && item.quantity > 0) {
                    try {
                        let colorId = item.color_id;
                        let sizeId = item.size_id;

                        if (!colorId && item.color) {
                            const [colorRows] = await connection.execute(
                                'SELECT id FROM colors WHERE name = ?',
                                [item.color]
                            );
                            colorId = colorRows[0]?.id;
                        }

                        if (!sizeId && item.size) {
                            const [sizeRows] = await connection.execute(
                                'SELECT id FROM sizes WHERE name = ?',
                                [item.size]
                            );
                            sizeId = sizeRows[0]?.id;
                        }

                        if (colorId && sizeId) {
                            const variantId = await MovementService.resolveVariantId({
                                productId: item.product_id,
                                colorId,
                                sizeId
                            });

                            const [locationRows] = await connection.execute(
                                'SELECT id FROM locations WHERE is_default = TRUE LIMIT 1'
                            );
                            const locationId = locationRows[0]?.id || 1;

                            const movement = await MovementService.createMovement({
                                variantId,
                                locationId,
                                movementType: 'OUT',
                                reasonCode: 'SALES_OUT', // Per specification: gifts use SALES_OUT
                                qty: item.quantity,
                                refTable: 'transactions',
                                refId: transactionId,
                                refCode: `GIFT-${transactionId}`,
                                note: `Gift: ${reason || 'Gift transaction'}`,
                                pic,
                                createdBy: pic
                            }, connection);

                            stockMovements.push(movement);
                        }
                    } catch (stockError) {
                        console.warn('⚠️ Could not create stock movement for gift item:', item, stockError.message);
                    }
                }
            }

        } else if (type === 'pengeluaran') {
            // Handle expense transaction (no stock movement)
            const { expense_category, description, amount, pic } = req.body;

            if (!expense_category || !description || !amount) {
                return res.status(400).json({ 
                    success: false,
                    error: 'Missing required expense fields' 
                });
            }

            const [insertResult] = await connection.execute(
                `INSERT INTO transactions 
                 (type, date, expense_category, description, amount, payment_method, pic) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [type, date, expense_category, description, amount, payment_method, pic]
            );
            transactionId = insertResult.insertId;

        } else {
            return res.status(400).json({ 
                success: false,
                error: 'Invalid transaction type. Must be "penjualan", "gift", or "pengeluaran"' 
            });
        }

        await connection.commit();

        // Get created transaction
        const [newTransaction] = await connection.execute(
            'SELECT * FROM transactions WHERE id = ?',
            [transactionId]
        );

        res.status(201).json({
            success: true,
            data: {
                transaction: newTransaction[0],
                stock_movements: stockMovements
            },
            message: 'Transaction created successfully'
        });

    } catch (error) {
        await connection.rollback();
        console.error('❌ Error creating enhanced transaction:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to create transaction', 
            message: error.message 
        });
    } finally {
        connection.release();
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
