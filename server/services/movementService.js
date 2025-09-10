const db = require('../db');

/**
 * Stock Movement Service
 * Handles all stock movements with transactional integrity
 * Maintains append-only ledger and updates cached balances
 */
class MovementService {
    /**
     * Create a stock movement and update balance
     * @param {Object} payload - Movement data
     * @param {Object} connTx - Database connection/transaction
     * @returns {Promise<Object>} Created movement record
     */
    static async createMovement(payload, connTx = null) {
        const connection = connTx || db;
        const isTransaction = !!connTx;
        
        try {
            const {
                variantId,
                locationId,
                movementType, // 'IN' | 'OUT'
                reasonCode,
                qty,
                unit = 'pcs',
                unitCost = null,
                currency = 'IDR',
                refTable = null,
                refId = null,
                refCode = null,
                note = null,
                pic = null,
                createdBy = null
            } = payload;

            // Validate required fields
            if (!variantId || !locationId || !movementType || !reasonCode || !qty) {
                throw new Error('Missing required fields for stock movement');
            }

            if (qty <= 0) {
                throw new Error('Quantity must be positive');
            }

            // Validate movement type and reason code alignment
            const validReasons = {
                'IN': ['OVERPROD_IN', 'RETURN_IN', 'ADJUSTMENT_IN', 'TRANSFER_IN'],
                'OUT': ['SALES_OUT', 'GIFT_OUT', 'ADJUSTMENT_OUT', 'TRANSFER_OUT']
            };

            if (!validReasons[movementType]?.includes(reasonCode)) {
                throw new Error(`Invalid reason code ${reasonCode} for movement type ${movementType}`);
            }

            // Check current balance for OUT movements
            if (movementType === 'OUT') {
                const allowNegative = process.env.ALLOW_NEGATIVE === 'true';
                if (!allowNegative) {
                    const [balanceRows] = await connection.execute(
                        `SELECT qty_on_hand FROM stock_balances 
                         WHERE variant_id = ? AND location_id = ?`,
                        [variantId, locationId]
                    );

                    const currentQty = balanceRows[0]?.qty_on_hand || 0;
                    if (currentQty < qty) {
                        throw new Error(`Insufficient stock. Available: ${currentQty}, Required: ${qty}`);
                    }
                }
            }

            // Insert stock movement
            const [movementResult] = await connection.execute(
                `INSERT INTO stock_movements 
                (variant_id, location_id, movement_type, reason_code, qty, unit, unit_cost, currency, 
                 ref_table, ref_id, ref_code, note, pic, created_by) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [variantId, locationId, movementType, reasonCode, qty, unit, unitCost, currency,
                 refTable, refId, refCode, note, pic, createdBy]
            );

            // Update or create stock balance
            await this.updateStockBalance({
                variantId,
                locationId,
                movementType,
                qty,
                unitCost
            }, connection);

            // Get created movement
            const [movementRows] = await connection.execute(
                'SELECT * FROM stock_movements WHERE id = ?',
                [movementResult.insertId]
            );

            return movementRows[0];

        } catch (error) {
            console.error('Error creating stock movement:', error);
            throw error;
        }
    }

    /**
     * Update stock balance after movement
     * @param {Object} params - Update parameters
     * @param {Object} connection - Database connection
     */
    static async updateStockBalance({ variantId, locationId, movementType, qty, unitCost }, connection) {
        // Get current balance
        const [balanceRows] = await connection.execute(
            `SELECT qty_on_hand, avg_cost FROM stock_balances 
             WHERE variant_id = ? AND location_id = ?`,
            [variantId, locationId]
        );

        let currentQty = 0;
        let currentAvgCost = 0;

        if (balanceRows.length > 0) {
            currentQty = balanceRows[0].qty_on_hand || 0;
            currentAvgCost = parseFloat(balanceRows[0].avg_cost) || 0;
        }

        let newQty = currentQty;
        let newAvgCost = currentAvgCost;

        if (movementType === 'IN') {
            newQty = currentQty + qty;
            
            // Calculate moving average cost for IN movements with cost
            if (unitCost && unitCost > 0) {
                const totalValue = (currentQty * currentAvgCost) + (qty * unitCost);
                newAvgCost = totalValue / newQty;
            }
        } else if (movementType === 'OUT') {
            newQty = currentQty - qty;
            // Average cost remains the same for OUT movements
        }

        // Upsert balance
        if (balanceRows.length > 0) {
            await connection.execute(
                `UPDATE stock_balances 
                 SET qty_on_hand = ?, avg_cost = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE variant_id = ? AND location_id = ?`,
                [newQty, newAvgCost, variantId, locationId]
            );
        } else {
            await connection.execute(
                `INSERT INTO stock_balances (variant_id, location_id, qty_on_hand, avg_cost)
                 VALUES (?, ?, ?, ?)`,
                [variantId, locationId, newQty, newAvgCost]
            );
        }
    }

    /**
     * Transfer stock between locations
     * @param {Object} params - Transfer parameters
     * @returns {Promise<Array>} Created movement records
     */
    static async transfer({ variantId, fromLocationId, toLocationId, qty, refCode, pic, createdBy, note = null }) {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();

            // Validate transfer
            if (fromLocationId === toLocationId) {
                throw new Error('Source and destination locations cannot be the same');
            }

            // Create OUT movement from source
            const outMovement = await this.createMovement({
                variantId,
                locationId: fromLocationId,
                movementType: 'OUT',
                reasonCode: 'TRANSFER_OUT',
                qty,
                refCode,
                pic,
                createdBy,
                note: note || `Transfer to location ${toLocationId}`
            }, connection);

            // Create IN movement to destination
            const inMovement = await this.createMovement({
                variantId,
                locationId: toLocationId,
                movementType: 'IN',
                reasonCode: 'TRANSFER_IN',
                qty,
                refCode,
                pic,
                createdBy,
                note: note || `Transfer from location ${fromLocationId}`
            }, connection);

            await connection.commit();
            return [outMovement, inMovement];

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Resolve variant ID from product, color, and size names (for CSV import)
     * @param {Object} params - Variant names
     * @returns {Promise<Object>} {id: number, created: boolean}
     */
    static async resolveVariantId({ productName, colorName, sizeName }) {
        try {
            // First check if variant exists
            const [existingRows] = await db.execute(`
                SELECT pcs.id
                FROM product_color_sizes pcs
                JOIN product_colors pc ON pcs.product_color_id = pc.id
                JOIN products p ON pc.product_id = p.id
                JOIN colors c ON pc.color_id = c.id
                JOIN sizes s ON pcs.size_id = s.id
                WHERE p.name = ? AND c.name = ? AND s.name = ?
            `, [productName, colorName, sizeName]);

            if (existingRows.length > 0) {
                return { id: existingRows[0].id, created: false };
            }

            // Create the variant if it doesn't exist
            return await this.createVariantFromNames({ productName, colorName, sizeName });

        } catch (error) {
            console.error('Error resolving variant ID from names:', error);
            throw error;
        }
    }

    /**
     * Resolve variant ID from product, color, and size IDs
     * @param {Object} params - Variant identifiers
     * @returns {Promise<number>} Variant ID
     */
    static async resolveVariantIdByIds({ productId, colorId, sizeId }) {
        try {
            const [rows] = await db.execute(`
                SELECT pcs.id
                FROM product_color_sizes pcs
                JOIN product_colors pc ON pcs.product_color_id = pc.id
                WHERE pc.product_id = ? AND pc.color_id = ? AND pcs.size_id = ?
            `, [productId, colorId, sizeId]);

            if (rows.length === 0) {
                // Create variant if it doesn't exist
                return await this.createVariant({ productId, colorId, sizeId });
            }

            return rows[0].id;
        } catch (error) {
            console.error('Error resolving variant ID:', error);
            throw error;
        }
    }

    /**
     * Create a new variant (product-color-size combination)
     * @param {Object} params - Variant identifiers
     * @returns {Promise<number>} Created variant ID
     */
    static async createVariant({ productId, colorId, sizeId }) {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();

            // Create or get product_color
            let [pcRows] = await connection.execute(
                'SELECT id FROM product_colors WHERE product_id = ? AND color_id = ?',
                [productId, colorId]
            );

            let productColorId;
            if (pcRows.length === 0) {
                const [pcResult] = await connection.execute(
                    'INSERT INTO product_colors (product_id, color_id) VALUES (?, ?)',
                    [productId, colorId]
                );
                productColorId = pcResult.insertId;
            } else {
                productColorId = pcRows[0].id;
            }

            // Create product_color_size
            const [pcsResult] = await connection.execute(
                'INSERT INTO product_color_sizes (product_color_id, size_id) VALUES (?, ?)',
                [productColorId, sizeId]
            );

            const variantId = pcsResult.insertId;

            // Initialize stock balances for all locations
            const [locations] = await connection.execute('SELECT id FROM locations');
            
            for (const location of locations) {
                await connection.execute(
                    'INSERT INTO stock_balances (variant_id, location_id, qty_on_hand) VALUES (?, ?, 0)',
                    [variantId, location.id]
                );
            }

            await connection.commit();
            return variantId;

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Create a new variant from product, color, and size names (for CSV import)
     * @param {Object} params - Variant names
     * @returns {Promise<Object>} {id: number, created: boolean}
     */
    static async createVariantFromNames({ productName, colorName, sizeName }) {
        const connection = await db.getConnection();
        
        try {
            await connection.beginTransaction();

            // Map product names (handle name variations)
            const productMapping = {
                'T-SHIRT KATUN 26 / JULI / 2025': 'T-shirt Katun PDK',
                'T-SHIRT KATUN': 'T-shirt Katun PDK',
                'LONG SLEEVE': 'Long Sleeve',
                'HENLEY': 'Henley',
                'POLOSHIRT': 'Poloshirt',
                'POLO LONG SLEEVE': 'Poloshirt Long Sleeve',
                'KEMEJA PIQUE PANJANG': 'Kemeja Pique PJG',
                'KEMEJA PIQUE PENDEK': 'Kemeja Pique PDK',
                'KIDS T-SHIRT': 'Kids T-shirt',
                'KIDS HENLEY': 'Kids T-shirt', // Map to existing
                'POLOSHIRT KRAH VARIASI': 'Poloshirt Krah Variasi',
                'JAKET VARSITY': 'Jaket Varsity',
                'SWEATER': 'Sweater',
                'KAOS RAGLAN + PRODUK GET 1': 'Kaos Premium 24s', // Map to existing
                'KAOS RINGER': 'Kaos Ringer',
                'KAOS KRAH': 'Kaos Krah',
                'KAOS PREMIUM': 'Kaos Premium 24s',
                'KEMEJA DRILL': 'Kemeja Drill',
                'KAOS CARDED': 'T-shirt Katun PDK', // Map to existing
                'KAOS BASEBALL': 'Kaos Baseball'
            };

            const mappedProductName = productMapping[productName] || productName;

            // Get or create product
            let [productRows] = await connection.execute(
                'SELECT id FROM products WHERE name = ?',
                [mappedProductName]
            );

            let productId;
            if (productRows.length === 0) {
                // Create new product with default price
                const [productResult] = await connection.execute(
                    'INSERT INTO products (name, price) VALUES (?, ?)',
                    [mappedProductName, 50000] // Default price
                );
                productId = productResult.insertId;
            } else {
                productId = productRows[0].id;
            }

            // Get or create color
            let [colorRows] = await connection.execute(
                'SELECT id FROM colors WHERE name = ?',
                [colorName]
            );

            let colorId;
            if (colorRows.length === 0) {
                // Create new color
                const [colorResult] = await connection.execute(
                    'INSERT INTO colors (name, hex_code) VALUES (?, ?)',
                    [colorName, '#808080'] // Default gray color
                );
                colorId = colorResult.insertId;
            } else {
                colorId = colorRows[0].id;
            }

            // Get or create size
            let [sizeRows] = await connection.execute(
                'SELECT id FROM sizes WHERE name = ?',
                [sizeName]
            );

            let sizeId;
            if (sizeRows.length === 0) {
                // Create new size with sort order
                const sortOrder = { 'XS': 1, 'S': 2, 'M': 3, 'L': 4, 'XL': 5, 'XXL': 6, '3XL': 7, '4XL': 8, '5XL': 9 };
                const [sizeResult] = await connection.execute(
                    'INSERT INTO sizes (name, sort) VALUES (?, ?)',
                    [sizeName, sortOrder[sizeName] || 10]
                );
                sizeId = sizeResult.insertId;
            } else {
                sizeId = sizeRows[0].id;
            }

            // Now create the variant using the IDs
            // Create or get product_color
            let [pcRows] = await connection.execute(
                'SELECT id FROM product_colors WHERE product_id = ? AND color_id = ?',
                [productId, colorId]
            );

            let productColorId;
            if (pcRows.length === 0) {
                const [pcResult] = await connection.execute(
                    'INSERT INTO product_colors (product_id, color_id) VALUES (?, ?)',
                    [productId, colorId]
                );
                productColorId = pcResult.insertId;
            } else {
                productColorId = pcRows[0].id;
            }

            // Create product_color_size
            const [pcsResult] = await connection.execute(
                'INSERT INTO product_color_sizes (product_color_id, size_id) VALUES (?, ?)',
                [productColorId, sizeId]
            );

            const variantId = pcsResult.insertId;

            // Initialize stock balances for all locations
            const [locations] = await connection.execute('SELECT id FROM locations');
            
            for (const location of locations) {
                await connection.execute(
                    'INSERT INTO stock_balances (variant_id, location_id, qty_on_hand) VALUES (?, ?, 0)',
                    [variantId, location.id]
                );
            }

            await connection.commit();
            return { id: variantId, created: true };

        } catch (error) {
            await connection.rollback();
            console.error('Error creating variant from names:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * Get stock movements for a variant with optional filtering
     * @param {Object} params - Filter parameters
     * @returns {Promise<Array>} Movement records
     */
    static async getMovements({ variantId, locationId, fromDate, toDate, movementType, reasonCode, limit = 100 }) {
        try {
            let query = `
                SELECT sm.*, l.name as location_name, l.code as location_code
                FROM stock_movements sm
                JOIN locations l ON sm.location_id = l.id
                WHERE 1=1
            `;
            const params = [];

            if (variantId) {
                query += ' AND sm.variant_id = ?';
                params.push(variantId);
            }

            if (locationId) {
                query += ' AND sm.location_id = ?';
                params.push(locationId);
            }

            if (fromDate) {
                query += ' AND sm.created_at >= ?';
                params.push(fromDate);
            }

            if (toDate) {
                query += ' AND sm.created_at <= ?';
                params.push(toDate);
            }

            if (movementType) {
                query += ' AND sm.movement_type = ?';
                params.push(movementType);
            }

            if (reasonCode) {
                query += ' AND sm.reason_code = ?';
                params.push(reasonCode);
            }

            query += ' ORDER BY sm.created_at DESC, sm.id DESC';
            
            if (limit) {
                query += ' LIMIT ?';
                params.push(limit);
            }

            const [rows] = await db.execute(query, params);
            return rows;

        } catch (error) {
            console.error('Error getting stock movements:', error);
            throw error;
        }
    }

    /**
     * Bulk create movements for multiple items (used by transactions)
     * @param {Array} items - Array of movement items
     * @param {Object} commonData - Common data for all movements
     * @param {Object} connTx - Database connection/transaction
     * @returns {Promise<Array>} Created movement records
     */
    static async bulkCreateMovements(items, commonData, connTx = null) {
        const connection = connTx || db;
        const movements = [];

        for (const item of items) {
            const variantId = await this.resolveVariantIdByIds({
                productId: item.product_id,
                colorId: item.color_id || null,
                sizeId: item.size_id || null
            });

            const movement = await this.createMovement({
                variantId,
                qty: item.quantity,
                ...commonData
            }, connection);

            movements.push(movement);
        }

        return movements;
    }
}

module.exports = MovementService;