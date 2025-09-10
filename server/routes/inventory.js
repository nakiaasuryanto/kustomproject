const express = require('express');
const router = express.Router();
const db = require('../db');
const InventoryService = require('../services/inventoryService');

/**
 * GET /api/inventory/tree
 * Get inventory tree grouped by Product+Color → Locations → Sizes
 */
router.get('/tree', async (req, res) => {
    try {
        const {
            product_id: productId,
            color_id: colorId,
            location_id: locationId,
            q,
            only_available
        } = req.query;

        console.log('🌳 Getting inventory tree with filters:', {
            productId,
            colorId,
            locationId,
            q,
            onlyAvailable: only_available === 'true'
        });

        const tree = await InventoryService.getInventoryTree({
            productId: productId ? parseInt(productId) : null,
            colorId: colorId ? parseInt(colorId) : null,
            locationId: locationId ? parseInt(locationId) : null,
            q,
            onlyAvailable: only_available === 'true'
        });

        res.json({
            success: true,
            data: tree,
            meta: {
                total_groups: tree.length,
                filters: {
                    productId,
                    colorId,
                    locationId,
                    q,
                    onlyAvailable: only_available === 'true'
                }
            }
        });

    } catch (error) {
        console.error('❌ Error getting inventory tree:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get inventory tree',
            message: error.message
        });
    }
});

/**
 * GET /api/inventory/stats
 * Get inventory summary statistics
 */
router.get('/stats', async (req, res) => {
    try {
        console.log('📊 Getting inventory statistics');

        const stats = await InventoryService.getInventoryStats();

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('❌ Error getting inventory stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get inventory statistics',
            message: error.message
        });
    }
});

/**
 * GET /api/inventory/locations
 * Get all locations
 */
router.get('/locations', async (req, res) => {
    try {
        const db = require('../db');
        
        console.log('📍 Getting all locations');

        const [locations] = await db.execute(`
            SELECT l.*, 
                   COUNT(sb.id) as variant_count,
                   SUM(sb.qty_on_hand) as total_qty
            FROM locations l
            LEFT JOIN stock_balances sb ON l.id = sb.location_id AND sb.qty_on_hand > 0
            GROUP BY l.id
            ORDER BY l.is_default DESC, l.name ASC
        `);

        res.json({
            success: true,
            data: locations
        });

    } catch (error) {
        console.error('❌ Error getting locations:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get locations',
            message: error.message
        });
    }
});

/**
 * POST /api/inventory/locations
 * Create new location
 */
router.post('/locations', async (req, res) => {
    try {
        const { code, name, is_default = false } = req.body;
        const db = require('../db');

        if (!code || !name) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: code, name'
            });
        }

        console.log('📍 Creating location:', { code, name, is_default });

        // If setting as default, unset other defaults
        if (is_default) {
            await db.execute('UPDATE locations SET is_default = FALSE');
        }

        const [result] = await db.execute(
            'INSERT INTO locations (code, name, is_default) VALUES (?, ?, ?)',
            [code.toUpperCase(), name, is_default]
        );

        const [newLocation] = await db.execute(
            'SELECT * FROM locations WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            data: newLocation[0],
            message: 'Location created successfully'
        });

    } catch (error) {
        console.error('❌ Error creating location:', error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                error: 'Location code already exists'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to create location',
            message: error.message
        });
    }
});

/**
 * GET /api/inventory/variants/search
 * Search for variants by product/color/size
 */
router.get('/variants/search', async (req, res) => {
    try {
        const { q, limit = 20 } = req.query;
        const db = require('../db');

        console.log('🔍 Searching variants with query:', q);

        let query = `
            SELECT 
                pcs.id as variant_id,
                p.id as product_id,
                p.name as product_name,
                c.id as color_id,
                c.name as color_name,
                c.hex_code,
                s.id as size_id,
                s.name as size_name,
                s.sort_order,
                SUM(sb.qty_on_hand) as total_qty,
                COUNT(CASE WHEN sb.qty_on_hand > 0 THEN 1 END) as locations_with_stock
            FROM product_color_sizes pcs
            JOIN product_colors pc ON pcs.product_color_id = pc.id
            JOIN products p ON pc.product_id = p.id
            JOIN colors c ON pc.color_id = c.id
            JOIN sizes s ON pcs.size_id = s.id
            LEFT JOIN stock_balances sb ON pcs.id = sb.variant_id
        `;

        const params = [];

        if (q) {
            query += ` WHERE (p.name LIKE ? OR c.name LIKE ? OR s.name LIKE ?)`;
            const searchTerm = `%${q}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += `
            GROUP BY pcs.id, p.id, p.name, c.id, c.name, c.hex_code, s.id, s.name, s.sort_order
            ORDER BY p.name, c.name, s.sort_order
            LIMIT ?
        `;
        params.push(parseInt(limit));

        const [variants] = await db.execute(query, params);

        res.json({
            success: true,
            data: variants,
            meta: {
                query: q,
                count: variants.length,
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('❌ Error searching variants:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search variants',
            message: error.message
        });
    }
});

/**
 * GET /api/inventory/products
 * Get all available products from inventory
 */
router.get('/products', async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT p.id as product_id, p.name as product_name
            FROM products p
            INNER JOIN product_colors pc ON p.id = pc.product_id
            INNER JOIN product_color_sizes pcs ON pc.id = pcs.product_color_id
            INNER JOIN stock_balances sb ON pcs.id = sb.variant_id
            WHERE sb.qty_on_hand > 0
            ORDER BY p.name ASC
        `;

        const [products] = await db.execute(query);

        res.json({
            success: true,
            data: products
        });

    } catch (error) {
        console.error('❌ Error getting products:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get products',
            message: error.message
        });
    }
});

/**
 * GET /api/inventory/colors/:productId
 * Get available colors for a specific product
 */
router.get('/colors/:productId', async (req, res) => {
    try {
        const { productId } = req.params;

        const query = `
            SELECT DISTINCT c.id as color_id, c.name as color_name
            FROM colors c
            INNER JOIN product_colors pc ON c.id = pc.color_id
            INNER JOIN product_color_sizes pcs ON pc.id = pcs.product_color_id
            INNER JOIN stock_balances sb ON pcs.id = sb.variant_id
            WHERE pc.product_id = ? AND sb.qty_on_hand > 0
            ORDER BY c.name ASC
        `;

        const [colors] = await db.execute(query, [productId]);

        res.json({
            success: true,
            data: colors
        });

    } catch (error) {
        console.error('❌ Error getting colors:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get colors',
            message: error.message
        });
    }
});

/**
 * GET /api/inventory/sizes/:productId/:colorId
 * Get available sizes for a specific product+color combination
 */
router.get('/sizes/:productId/:colorId', async (req, res) => {
    try {
        const { productId, colorId } = req.params;

        const query = `
            SELECT DISTINCT s.id as size_id, s.name as size_name, 
                   SUM(sb.qty_on_hand) as total_qty,
                   l.name as location_name,
                   sb.qty_on_hand as qty_per_location,
                   sb.location_id
            FROM sizes s
            INNER JOIN product_color_sizes pcs ON s.id = pcs.size_id
            INNER JOIN product_colors pc ON pcs.product_color_id = pc.id
            INNER JOIN stock_balances sb ON pcs.id = sb.variant_id
            INNER JOIN locations l ON sb.location_id = l.id
            WHERE pc.product_id = ? AND pc.color_id = ? AND sb.qty_on_hand > 0
            GROUP BY s.id, s.name, l.id, l.name, sb.qty_on_hand
            ORDER BY 
                CASE s.name 
                    WHEN 'XS' THEN 1
                    WHEN 'S' THEN 2 
                    WHEN 'M' THEN 3 
                    WHEN 'L' THEN 4 
                    WHEN 'XL' THEN 5 
                    WHEN 'XXL' THEN 6 
                    ELSE 7 
                END ASC
        `;

        const sizes = await db.query(query, [productId, colorId]);

        // Group by size and aggregate locations
        const sizeMap = {};
        sizes.forEach(row => {
            if (!sizeMap[row.size_id]) {
                sizeMap[row.size_id] = {
                    size_id: row.size_id,
                    size_name: row.size_name,
                    total_qty: 0,
                    locations: []
                };
            }
            
            sizeMap[row.size_id].total_qty += row.qty_per_location;
            sizeMap[row.size_id].locations.push({
                location_id: row.location_id,
                location_name: row.location_name,
                qty: row.qty_per_location
            });
        });

        const result = Object.values(sizeMap);

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('❌ Error getting sizes:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get sizes',
            message: error.message
        });
    }
});

/**
 * DELETE /api/inventory/variant/:id
 * Delete a specific inventory variant and all related data
 */
router.delete('/variant/:id', async (req, res) => {
    try {
        const variantId = parseInt(req.params.id);
        
        if (!variantId || isNaN(variantId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid variant ID provided'
            });
        }

        console.log(`🗑️ Deleting inventory variant: ${variantId}`);

        // Start a transaction to ensure data consistency
        await db.query('START TRANSACTION');

        try {
            // First, check if the variant exists
            const [variants] = await db.execute(
                'SELECT * FROM product_color_sizes WHERE id = ?',
                [variantId]
            );

            if (variants.length === 0) {
                await db.query('ROLLBACK');
                return res.status(404).json({
                    success: false,
                    error: 'Inventory variant not found'
                });
            }

            // Delete related data in the correct order (to respect foreign key constraints)
            
            // 1. Delete stock opname items that reference this variant
            await db.execute(
                'DELETE FROM stock_opname_items WHERE variant_id = ?',
                [variantId]
            );

            // 2. Delete stock movements for this variant
            await db.execute(
                'DELETE FROM stock_movements WHERE variant_id = ?',
                [variantId]
            );

            // 3. Delete stock balances for this variant
            await db.execute(
                'DELETE FROM stock_balances WHERE variant_id = ?',
                [variantId]
            );

            // 4. Finally, delete the variant itself
            const [deleteResult] = await db.execute(
                'DELETE FROM product_color_sizes WHERE id = ?',
                [variantId]
            );

            if (deleteResult.affectedRows === 0) {
                await db.query('ROLLBACK');
                return res.status(500).json({
                    success: false,
                    error: 'Failed to delete inventory variant'
                });
            }

            // Commit the transaction
            await db.query('COMMIT');

            console.log(`✅ Successfully deleted variant ${variantId} and all related data`);

            res.json({
                success: true,
                message: 'Inventory variant deleted successfully',
                deletedVariantId: variantId
            });

        } catch (transactionError) {
            // Rollback on any error
            await db.query('ROLLBACK');
            throw transactionError;
        }

    } catch (error) {
        console.error('❌ Error deleting inventory variant:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete inventory variant',
            message: error.message
        });
    }
});

module.exports = router;