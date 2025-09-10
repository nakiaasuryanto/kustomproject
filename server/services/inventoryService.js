const db = require('../db');

/**
 * Inventory Service
 * Handles inventory queries, stock cards, and opname operations
 */
class InventoryService {
    /**
     * Get inventory tree grouped by Product+Color → Locations → Sizes
     * @param {Object} params - Filter parameters
     * @returns {Promise<Array>} Inventory tree structure
     */
    static async getInventoryTree(params = {}) {
        try {
            const {
                productId,
                colorId,
                locationId,
                q, // search query
                onlyAvailable = false
            } = params;

            let query = `
                SELECT 
                    p.id as product_id,
                    p.name as product_name,
                    c.id as color_id,
                    c.name as color_name,
                    c.hex_code as color_hex,
                    l.id as location_id,
                    l.code as location_code,
                    l.name as location_name,
                    l.is_default as location_is_default,
                    s.id as size_id,
                    s.name as size_name,
                    s.sort_order as size_sort,
                    sb.qty_on_hand,
                    sb.avg_cost,
                    sb.updated_at as balance_updated_at,
                    pcs.id as variant_id
                FROM stock_balances sb
                JOIN product_color_sizes pcs ON sb.variant_id = pcs.id
                JOIN product_colors pc ON pcs.product_color_id = pc.id
                JOIN products p ON pc.product_id = p.id
                JOIN colors c ON pc.color_id = c.id
                JOIN sizes s ON pcs.size_id = s.id
                JOIN locations l ON sb.location_id = l.id
                WHERE 1=1
            `;
            
            const queryParams = [];

            // Apply filters
            if (productId) {
                query += ' AND p.id = ?';
                queryParams.push(productId);
            }

            if (colorId) {
                query += ' AND c.id = ?';
                queryParams.push(colorId);
            }

            if (locationId) {
                query += ' AND l.id = ?';
                queryParams.push(locationId);
            }

            if (q) {
                query += ' AND (p.name LIKE ? OR c.name LIKE ? OR s.name LIKE ?)';
                const searchTerm = `%${q}%`;
                queryParams.push(searchTerm, searchTerm, searchTerm);
            }

            if (onlyAvailable) {
                query += ' AND sb.qty_on_hand > 0';
            }

            query += `
                ORDER BY 
                    p.name ASC, 
                    c.name ASC, 
                    l.is_default DESC, 
                    l.name ASC, 
                    s.sort_order ASC, 
                    s.name ASC
            `;

            const [rows] = await db.execute(query, queryParams);

            // Group results into tree structure
            return this.buildInventoryTree(rows);

        } catch (error) {
            console.error('Error getting inventory tree:', error);
            throw error;
        }
    }

    /**
     * Build hierarchical inventory tree from flat rows
     * @param {Array} rows - Flat inventory rows
     * @returns {Array} Hierarchical tree structure
     */
    static buildInventoryTree(rows) {
        const tree = {};

        rows.forEach(row => {
            const productColorKey = `${row.product_id}-${row.color_id}`;
            
            // Initialize product-color group
            if (!tree[productColorKey]) {
                tree[productColorKey] = {
                    product_id: row.product_id,
                    product_name: row.product_name,
                    color_id: row.color_id,
                    color_name: row.color_name,
                    color_hex: row.color_hex,
                    total_qty: 0,
                    locations: {}
                };
            }

            const locationKey = row.location_id;
            
            // Initialize location group
            if (!tree[productColorKey].locations[locationKey]) {
                tree[productColorKey].locations[locationKey] = {
                    location_id: row.location_id,
                    location_code: row.location_code,
                    location_name: row.location_name,
                    location_is_default: row.location_is_default,
                    total_qty: 0,
                    sizes: []
                };
            }

            // Add size data
            tree[productColorKey].locations[locationKey].sizes.push({
                size_id: row.size_id,
                size_name: row.size_name,
                size_sort: row.size_sort,
                variant_id: row.variant_id,
                qty_on_hand: row.qty_on_hand,
                avg_cost: parseFloat(row.avg_cost) || 0,
                balance_updated_at: row.balance_updated_at
            });

            // Update totals
            tree[productColorKey].locations[locationKey].total_qty += row.qty_on_hand;
            tree[productColorKey].total_qty += row.qty_on_hand;
        });

        // Convert to array and sort
        return Object.values(tree).map(productColor => ({
            ...productColor,
            locations: Object.values(productColor.locations).map(location => ({
                ...location,
                sizes: location.sizes.sort((a, b) => a.size_sort - b.size_sort || a.size_name.localeCompare(b.size_name))
            })).sort((a, b) => (b.location_is_default ? 1 : 0) - (a.location_is_default ? 1 : 0) || a.location_name.localeCompare(b.location_name))
        })).sort((a, b) => a.product_name.localeCompare(b.product_name) || a.color_name.localeCompare(b.color_name));
    }

    /**
     * Get stock card (movement history) for a specific variant and location
     * @param {Object} params - Filter parameters
     * @returns {Promise<Object>} Stock card data
     */
    static async getStockCard(params) {
        try {
            const {
                productId,
                colorId,
                sizeId,
                locationId,
                fromDate,
                toDate,
                limit = 100
            } = params;

            // Get variant ID
            const [variantRows] = await db.execute(`
                SELECT pcs.id as variant_id
                FROM product_color_sizes pcs
                JOIN product_colors pc ON pcs.product_color_id = pc.id
                WHERE pc.product_id = ? AND pc.color_id = ? AND pcs.size_id = ?
            `, [productId, colorId, sizeId]);

            if (variantRows.length === 0) {
                throw new Error('Variant not found');
            }

            const variantId = variantRows[0].variant_id;

            // Get opening balance
            let openingQty = 0;
            if (fromDate) {
                const [openingRows] = await db.execute(`
                    SELECT COALESCE(
                        (SELECT SUM(CASE WHEN movement_type = 'IN' THEN qty ELSE -qty END)
                         FROM stock_movements 
                         WHERE variant_id = ? AND location_id = ? AND created_at < ?),
                        0
                    ) as opening_qty
                `, [variantId, locationId, fromDate]);
                
                openingQty = openingRows[0].opening_qty || 0;
            }

            // Get movements
            let movementQuery = `
                SELECT 
                    sm.*,
                    l.name as location_name,
                    l.code as location_code,
                    p.name as product_name,
                    c.name as color_name,
                    s.name as size_name
                FROM stock_movements sm
                JOIN locations l ON sm.location_id = l.id
                JOIN product_color_sizes pcs ON sm.variant_id = pcs.id
                JOIN product_colors pc ON pcs.product_color_id = pc.id
                JOIN products p ON pc.product_id = p.id
                JOIN colors c ON pc.color_id = c.id
                JOIN sizes s ON pcs.size_id = s.id
                WHERE sm.variant_id = ? AND sm.location_id = ?
            `;

            const movementParams = [variantId, locationId];

            if (fromDate) {
                movementQuery += ' AND sm.created_at >= ?';
                movementParams.push(fromDate);
            }

            if (toDate) {
                movementQuery += ' AND sm.created_at <= ?';
                movementParams.push(toDate);
            }

            movementQuery += ' ORDER BY sm.created_at ASC, sm.id ASC';

            if (limit) {
                movementQuery += ' LIMIT ?';
                movementParams.push(limit);
            }

            const [movements] = await db.execute(movementQuery, movementParams);

            // Calculate running balances
            let runningBalance = openingQty;
            const movementsWithBalance = movements.map(movement => {
                const qtyChange = movement.movement_type === 'IN' ? movement.qty : -movement.qty;
                runningBalance += qtyChange;
                
                return {
                    ...movement,
                    qty_change: qtyChange,
                    running_balance: runningBalance
                };
            });

            // Get current balance
            const [currentBalanceRows] = await db.execute(
                'SELECT qty_on_hand, avg_cost FROM stock_balances WHERE variant_id = ? AND location_id = ?',
                [variantId, locationId]
            );

            const currentBalance = currentBalanceRows[0] || { qty_on_hand: 0, avg_cost: 0 };

            return {
                variant_id: variantId,
                product_name: movements[0]?.product_name || '',
                color_name: movements[0]?.color_name || '',
                size_name: movements[0]?.size_name || '',
                location_name: movements[0]?.location_name || '',
                location_code: movements[0]?.location_code || '',
                opening_qty: openingQty,
                current_qty: currentBalance.qty_on_hand,
                avg_cost: parseFloat(currentBalance.avg_cost) || 0,
                movements: movementsWithBalance,
                period: {
                    from: fromDate,
                    to: toDate
                }
            };

        } catch (error) {
            console.error('Error getting stock card:', error);
            throw error;
        }
    }

    /**
     * Start stock opname (physical count session)
     * @param {Object} params - Opname parameters
     * @returns {Promise<Object>} Created opname session
     */
    static async startOpname({ opnameCode, locationId = null, createdBy }) {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();

            // Create opname session
            const [opnameResult] = await connection.execute(
                `INSERT INTO stock_opname (opname_code, location_id, status, snapshot_at, created_by)
                 VALUES (?, ?, 'ACTIVE', CURRENT_TIMESTAMP, ?)`,
                [opnameCode, locationId, createdBy]
            );

            const opnameId = opnameResult.insertId;

            // Create opname items (snapshot current balances)
            let balanceQuery = `
                SELECT sb.variant_id, sb.location_id, sb.qty_on_hand
                FROM stock_balances sb
                WHERE sb.qty_on_hand > 0
            `;
            const balanceParams = [];

            if (locationId) {
                balanceQuery += ' AND sb.location_id = ?';
                balanceParams.push(locationId);
            }

            const [balances] = await connection.execute(balanceQuery, balanceParams);

            for (const balance of balances) {
                await connection.execute(
                    `INSERT INTO stock_opname_items (opname_id, variant_id, location_id, system_qty)
                     VALUES (?, ?, ?, ?)`,
                    [opnameId, balance.variant_id, balance.location_id, balance.qty_on_hand]
                );
            }

            await connection.commit();

            // Get created opname with details
            const [opnameRows] = await connection.execute(
                'SELECT * FROM stock_opname WHERE id = ?',
                [opnameId]
            );

            return opnameRows[0];

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Update opname item count
     * @param {Object} params - Count parameters
     * @returns {Promise<Object>} Updated opname item
     */
    static async updateOpnameCount({ opnameId, variantId, locationId, countedQty, countedBy, note = null }) {
        try {
            const [result] = await db.execute(
                `UPDATE stock_opname_items 
                 SET counted_qty = ?, counted_by = ?, counted_at = CURRENT_TIMESTAMP, note = ?
                 WHERE opname_id = ? AND variant_id = ? AND location_id = ?`,
                [countedQty, countedBy, note, opnameId, variantId, locationId]
            );

            if (result.affectedRows === 0) {
                throw new Error('Opname item not found');
            }

            const [itemRows] = await db.execute(
                'SELECT * FROM stock_opname_items WHERE opname_id = ? AND variant_id = ? AND location_id = ?',
                [opnameId, variantId, locationId]
            );

            return itemRows[0];

        } catch (error) {
            console.error('Error updating opname count:', error);
            throw error;
        }
    }

    /**
     * Commit opname and generate adjustments
     * @param {Object} params - Commit parameters
     * @returns {Promise<Object>} Opname results with adjustments
     */
    static async commitOpname({ opnameId, createdBy }) {
        const MovementService = require('./movementService');
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();

            // Check opname status
            const [opnameRows] = await connection.execute(
                'SELECT * FROM stock_opname WHERE id = ? AND status = ?',
                [opnameId, 'ACTIVE']
            );

            if (opnameRows.length === 0) {
                throw new Error('Opname not found or not active');
            }

            const opname = opnameRows[0];

            // Get all counted items with variances
            const [items] = await connection.execute(`
                SELECT * FROM stock_opname_items 
                WHERE opname_id = ? AND counted_qty IS NOT NULL AND variance_qty != 0
                ORDER BY variance_qty DESC
            `, [opnameId]);

            const adjustments = [];

            // Create adjustments for variances
            for (const item of items) {
                const varianceQty = Math.abs(item.variance_qty);
                const movementType = item.variance_qty > 0 ? 'IN' : 'OUT';
                const reasonCode = item.variance_qty > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';

                const adjustment = await MovementService.createMovement({
                    variantId: item.variant_id,
                    locationId: item.location_id,
                    movementType,
                    reasonCode,
                    qty: varianceQty,
                    refTable: 'stock_opname',
                    refId: opnameId,
                    refCode: opname.opname_code,
                    note: `Stock opname adjustment: ${item.note || 'Physical count variance'}`,
                    pic: item.counted_by,
                    createdBy
                }, connection);

                adjustments.push({
                    ...adjustment,
                    variance_qty: item.variance_qty,
                    system_qty: item.system_qty,
                    counted_qty: item.counted_qty
                });
            }

            // Update opname status
            await connection.execute(
                `UPDATE stock_opname 
                 SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [opnameId]
            );

            await connection.commit();

            return {
                opname: { ...opname, status: 'COMPLETED', completed_at: new Date() },
                adjustments,
                summary: {
                    total_items: items.length,
                    positive_variances: items.filter(i => i.variance_qty > 0).length,
                    negative_variances: items.filter(i => i.variance_qty < 0).length,
                    total_adjustments: adjustments.length
                }
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Get opname details with items
     * @param {number} opnameId - Opname ID
     * @returns {Promise<Object>} Opname with items
     */
    static async getOpnameDetails(opnameId) {
        try {
            // Get opname
            const [opnameRows] = await db.execute(
                'SELECT * FROM stock_opname WHERE id = ?',
                [opnameId]
            );

            if (opnameRows.length === 0) {
                throw new Error('Opname not found');
            }

            const opname = opnameRows[0];

            // Get items with product details
            const [items] = await db.execute(`
                SELECT 
                    oi.*,
                    p.name as product_name,
                    c.name as color_name,
                    s.name as size_name,
                    l.code as location_code,
                    l.name as location_name
                FROM stock_opname_items oi
                JOIN product_color_sizes pcs ON oi.variant_id = pcs.id
                JOIN product_colors pc ON pcs.product_color_id = pc.id
                JOIN products p ON pc.product_id = p.id
                JOIN colors c ON pc.color_id = c.id
                JOIN sizes s ON pcs.size_id = s.id
                JOIN locations l ON oi.location_id = l.id
                WHERE oi.opname_id = ?
                ORDER BY p.name, c.name, l.name, s.sort_order
            `, [opnameId]);

            return {
                ...opname,
                items
            };

        } catch (error) {
            console.error('Error getting opname details:', error);
            throw error;
        }
    }

    /**
     * Get inventory summary statistics
     * @returns {Promise<Object>} Inventory statistics
     */
    static async getInventoryStats() {
        try {
            const [stats] = await db.execute(`
                SELECT 
                    COUNT(DISTINCT p.id) as total_products,
                    COUNT(DISTINCT c.id) as total_colors,
                    COUNT(DISTINCT s.id) as total_sizes,
                    COUNT(DISTINCT pcs.id) as total_variants,
                    COUNT(DISTINCT l.id) as total_locations,
                    SUM(sb.qty_on_hand) as total_qty,
                    COUNT(CASE WHEN sb.qty_on_hand > 0 THEN 1 END) as variants_with_stock,
                    COUNT(CASE WHEN sb.qty_on_hand = 0 THEN 1 END) as variants_out_of_stock,
                    AVG(sb.avg_cost) as avg_unit_cost
                FROM stock_balances sb
                JOIN product_color_sizes pcs ON sb.variant_id = pcs.id
                JOIN product_colors pc ON pcs.product_color_id = pc.id
                JOIN products p ON pc.product_id = p.id
                JOIN colors c ON pc.color_id = c.id
                JOIN sizes s ON pcs.size_id = s.id
                JOIN locations l ON sb.location_id = l.id
            `);

            return stats[0];

        } catch (error) {
            console.error('Error getting inventory stats:', error);
            throw error;
        }
    }

    /**
     * Get current stock balance for a variant at a location
     * @param {number} variantId - Variant ID
     * @param {number} locationId - Location ID
     * @returns {Promise<number>} Current stock balance
     */
    static async getStockBalance(variantId, locationId) {
        try {
            const query = `
                SELECT qty_on_hand 
                FROM stock_balances 
                WHERE variant_id = ? AND location_id = ?
            `;

            const result = await db.query(query, [variantId, locationId]);
            return result.length > 0 ? result[0].qty_on_hand : 0;

        } catch (error) {
            console.error('Error getting stock balance:', error);
            throw error;
        }
    }
}

module.exports = InventoryService;