const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const MovementService = require('../services/movementService');
const InventoryService = require('../services/inventoryService');

// Configure multer for CSV file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    }
});

/**
 * GET /api/stock/card
 * Get stock card (movement history) for a specific variant and location
 */
router.get('/card', async (req, res) => {
    try {
        const {
            product_id: productId,
            color_id: colorId,
            size_id: sizeId,
            location_id: locationId,
            from: fromDate,
            to: toDate,
            limit = 100
        } = req.query;

        console.log('📋 Getting stock card for:', {
            productId,
            colorId,
            sizeId,
            locationId,
            fromDate,
            toDate,
            limit
        });

        if (!productId || !colorId || !sizeId || !locationId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: product_id, color_id, size_id, location_id'
            });
        }

        const stockCard = await InventoryService.getStockCard({
            productId: parseInt(productId),
            colorId: parseInt(colorId),
            sizeId: parseInt(sizeId),
            locationId: parseInt(locationId),
            fromDate,
            toDate,
            limit: parseInt(limit)
        });

        res.json({
            success: true,
            data: stockCard
        });

    } catch (error) {
        console.error('❌ Error getting stock card:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get stock card',
            message: error.message
        });
    }
});

/**
 * POST /api/stock/movements
 * Create a stock movement
 */
router.post('/movements', async (req, res) => {
    try {
        const {
            variant_id: variantId,
            product_id: productId,
            color_id: colorId,
            size_id: sizeId,
            location_id: locationId,
            movement_type: movementType,
            reason_code: reasonCode,
            qty,
            unit_cost: unitCost,
            note,
            pic,
            created_by: createdBy
        } = req.body;

        console.log('📦 Creating stock movement:', {
            variantId,
            productId,
            colorId,
            sizeId,
            locationId,
            movementType,
            reasonCode,
            qty
        });

        // Validate required fields
        if (!locationId || !movementType || !reasonCode || !qty) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: location_id, movement_type, reason_code, qty'
            });
        }

        // Resolve variant ID if not provided
        let resolvedVariantId = variantId;
        if (!variantId && productId && colorId && sizeId) {
            resolvedVariantId = await MovementService.resolveVariantId({
                productId: parseInt(productId),
                colorId: parseInt(colorId),
                sizeId: parseInt(sizeId)
            });
        }

        if (!resolvedVariantId) {
            return res.status(400).json({
                success: false,
                error: 'Either variant_id or product_id+color_id+size_id must be provided'
            });
        }

        const movement = await MovementService.createMovement({
            variantId: parseInt(resolvedVariantId),
            locationId: parseInt(locationId),
            movementType,
            reasonCode,
            qty: parseInt(qty),
            unitCost: unitCost ? parseFloat(unitCost) : null,
            note,
            pic,
            createdBy
        });

        res.status(201).json({
            success: true,
            data: movement,
            message: 'Stock movement created successfully'
        });

    } catch (error) {
        console.error('❌ Error creating stock movement:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create stock movement',
            message: error.message
        });
    }
});

/**
 * GET /api/stock/movements
 * Get stock movements with filtering
 */
router.get('/movements', async (req, res) => {
    try {
        const {
            variant_id: variantId,
            location_id: locationId,
            from_date: fromDate,
            to_date: toDate,
            movement_type: movementType,
            reason_code: reasonCode,
            limit = 100
        } = req.query;

        console.log('📋 Getting stock movements with filters:', {
            variantId,
            locationId,
            fromDate,
            toDate,
            movementType,
            reasonCode,
            limit
        });

        const movements = await MovementService.getMovements({
            variantId: variantId ? parseInt(variantId) : null,
            locationId: locationId ? parseInt(locationId) : null,
            fromDate,
            toDate,
            movementType,
            reasonCode,
            limit: parseInt(limit)
        });

        res.json({
            success: true,
            data: movements,
            meta: {
                count: movements.length,
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('❌ Error getting stock movements:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get stock movements',
            message: error.message
        });
    }
});

/**
 * POST /api/stock/transfer
 * Transfer stock between locations
 */
router.post('/transfer', async (req, res) => {
    try {
        const {
            variant_id: variantId,
            product_id: productId,
            color_id: colorId,
            size_id: sizeId,
            from_location_id: fromLocationId,
            to_location_id: toLocationId,
            qty,
            ref_code: refCode,
            pic,
            created_by: createdBy,
            note
        } = req.body;

        console.log('🔄 Creating stock transfer:', {
            variantId,
            productId,
            colorId,
            sizeId,
            fromLocationId,
            toLocationId,
            qty
        });

        // Validate required fields
        if (!fromLocationId || !toLocationId || !qty) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: from_location_id, to_location_id, qty'
            });
        }

        // Resolve variant ID if not provided
        let resolvedVariantId = variantId;
        if (!variantId && productId && colorId && sizeId) {
            resolvedVariantId = await MovementService.resolveVariantId({
                productId: parseInt(productId),
                colorId: parseInt(colorId),
                sizeId: parseInt(sizeId)
            });
        }

        if (!resolvedVariantId) {
            return res.status(400).json({
                success: false,
                error: 'Either variant_id or product_id+color_id+size_id must be provided'
            });
        }

        const movements = await MovementService.transfer({
            variantId: parseInt(resolvedVariantId),
            fromLocationId: parseInt(fromLocationId),
            toLocationId: parseInt(toLocationId),
            qty: parseInt(qty),
            refCode: refCode || `TRANSFER-${Date.now()}`,
            pic,
            createdBy,
            note
        });

        res.status(201).json({
            success: true,
            data: {
                out_movement: movements[0],
                in_movement: movements[1]
            },
            message: 'Stock transfer completed successfully'
        });

    } catch (error) {
        console.error('❌ Error creating stock transfer:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create stock transfer',
            message: error.message
        });
    }
});

/**
 * POST /api/stock/opname/start
 * Start a stock opname (physical count session)
 */
router.post('/opname/start', async (req, res) => {
    try {
        const {
            opname_code: opnameCode,
            location_id: locationId,
            created_by: createdBy
        } = req.body;

        console.log('📊 Starting stock opname:', {
            opnameCode,
            locationId,
            createdBy
        });

        if (!opnameCode || !createdBy) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: opname_code, created_by'
            });
        }

        const opname = await InventoryService.startOpname({
            opnameCode,
            locationId: locationId ? parseInt(locationId) : null,
            createdBy
        });

        res.status(201).json({
            success: true,
            data: opname,
            message: 'Stock opname started successfully'
        });

    } catch (error) {
        console.error('❌ Error starting stock opname:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start stock opname',
            message: error.message
        });
    }
});

/**
 * GET /api/stock/opname/:id
 * Get opname details with items
 */
router.get('/opname/:id', async (req, res) => {
    try {
        const { id } = req.params;

        console.log('📊 Getting opname details for ID:', id);

        const opname = await InventoryService.getOpnameDetails(parseInt(id));

        res.json({
            success: true,
            data: opname
        });

    } catch (error) {
        console.error('❌ Error getting opname details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get opname details',
            message: error.message
        });
    }
});

/**
 * PUT /api/stock/opname/:id/count
 * Update physical count for an opname item
 */
router.put('/opname/:id/count', async (req, res) => {
    try {
        const { id: opnameId } = req.params;
        const {
            variant_id: variantId,
            location_id: locationId,
            counted_qty: countedQty,
            counted_by: countedBy,
            note
        } = req.body;

        console.log('📊 Updating opname count:', {
            opnameId,
            variantId,
            locationId,
            countedQty,
            countedBy
        });

        if (!variantId || !locationId || countedQty === undefined || !countedBy) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: variant_id, location_id, counted_qty, counted_by'
            });
        }

        const item = await InventoryService.updateOpnameCount({
            opnameId: parseInt(opnameId),
            variantId: parseInt(variantId),
            locationId: parseInt(locationId),
            countedQty: parseInt(countedQty),
            countedBy,
            note
        });

        res.json({
            success: true,
            data: item,
            message: 'Opname count updated successfully'
        });

    } catch (error) {
        console.error('❌ Error updating opname count:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update opname count',
            message: error.message
        });
    }
});

/**
 * POST /api/stock/opname/:id/commit
 * Commit opname and generate adjustments
 */
router.post('/opname/:id/commit', async (req, res) => {
    try {
        const { id: opnameId } = req.params;
        const { created_by: createdBy } = req.body;

        console.log('📊 Committing stock opname:', { opnameId, createdBy });

        if (!createdBy) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: created_by'
            });
        }

        const result = await InventoryService.commitOpname({
            opnameId: parseInt(opnameId),
            createdBy
        });

        res.json({
            success: true,
            data: result,
            message: 'Stock opname committed successfully'
        });

    } catch (error) {
        console.error('❌ Error committing stock opname:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to commit stock opname',
            message: error.message
        });
    }
});

/**
 * GET /api/stock/opname
 * Get list of stock opname sessions
 */
router.get('/opname', async (req, res) => {
    try {
        const { status, location_id: locationId, limit = 50 } = req.query;
        const db = require('../db');

        console.log('📊 Getting stock opname list with filters:', {
            status,
            locationId,
            limit
        });

        let query = `
            SELECT 
                so.*,
                l.code as location_code,
                l.name as location_name,
                COUNT(soi.id) as total_items,
                COUNT(CASE WHEN soi.counted_qty IS NOT NULL THEN 1 END) as counted_items,
                COUNT(CASE WHEN soi.variance_qty != 0 THEN 1 END) as variance_items
            FROM stock_opname so
            LEFT JOIN locations l ON so.location_id = l.id
            LEFT JOIN stock_opname_items soi ON so.id = soi.opname_id
            WHERE 1=1
        `;

        const params = [];

        if (status) {
            query += ' AND so.status = ?';
            params.push(status);
        }

        if (locationId) {
            query += ' AND so.location_id = ?';
            params.push(parseInt(locationId));
        }

        query += `
            GROUP BY so.id, l.code, l.name
            ORDER BY so.created_at DESC
            LIMIT ?
        `;
        params.push(parseInt(limit));

        const [opnames] = await db.execute(query, params);

        res.json({
            success: true,
            data: opnames,
            meta: {
                count: opnames.length,
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('❌ Error getting stock opname list:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get stock opname list',
            message: error.message
        });
    }
});

/**
 * POST /api/stock/import-csv
 * Import stock data from CSV file
 */
router.post('/import-csv', upload.single('file'), async (req, res) => {
    try {
        const { mode = 'add' } = req.body;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No CSV file uploaded'
            });
        }

        // Parse CSV data
        const csvData = req.file.buffer.toString('utf8');
        console.log('📄 First few lines of CSV:', csvData.substring(0, 500));
        
        // Auto-detect delimiter
        const firstLine = csvData.split('\n')[0];
        const delimiter = firstLine.includes(';') ? ';' : ',';
        console.log('📄 Detected delimiter:', delimiter);
        
        const records = parse(csvData, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            delimiter: delimiter,
            relax_quotes: true,
            escape: '"'
        });

        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid CSV data - no records found'
            });
        }

        console.log(`📄 Processing CSV import: ${records.length} records, mode: ${mode}`);
        console.log('📄 Sample row:', records[0]);

        const db = require('../db');
        const results = {
            imported: 0,
            created: 0,
            updated: 0,
            errors: []
        };

        // Process each CSV row
        for (let i = 0; i < records.length; i++) {
            const row = records[i];
            try {
                const {
                    product_name: productName,
                    color_name: colorName,
                    size_name: sizeName,
                    location_name: locationName,
                    quantity,
                    unit_cost: unitCost
                } = row;

                // Validate required fields
                if (!productName || !colorName || !sizeName || !locationName || quantity === undefined) {
                    results.errors.push(`Row ${i + 2}: Missing required fields - ${JSON.stringify(row)}`);
                    continue;
                }

                const qty = parseInt(quantity);
                const cost = parseFloat(unitCost) || 0;

                if (isNaN(qty) || qty < 0) {
                    results.errors.push(`Row ${i + 2}: Invalid quantity "${quantity}"`);
                    continue;
                }

                console.log(`📦 Processing row ${i + 2}: ${productName} ${colorName} ${sizeName} qty=${qty}`);

                // Resolve or create variant using name-based method
                const variantResult = await MovementService.resolveVariantId({
                    productName,
                    colorName,
                    sizeName
                });

                if (variantResult.created) {
                    results.created++;
                    console.log(`✨ Created new variant: ${productName} ${colorName} ${sizeName}`);
                }

                // Get location ID with mapping
                const [locations] = await db.execute('SELECT * FROM locations');
                
                // Map CSV location names to database location names
                const locationMapping = {
                    'display': 'display area',
                    'lemari': 'storage cabinet'
                };
                
                const mappedLocationName = locationMapping[locationName.toLowerCase()] || locationName.toLowerCase();
                const location = locations.find(loc => 
                    loc.name.toLowerCase() === mappedLocationName
                );

                if (!location) {
                    results.errors.push(`Row ${i + 2}: Unknown location "${locationName}" (mapped to "${mappedLocationName}")`);
                    continue;
                }

                if (mode === 'add') {
                    // Add to existing stock
                    if (qty > 0) {
                        await MovementService.createMovement({
                            variantId: variantResult.id,
                            locationId: location.id,
                            movementType: 'IN',
                            reasonCode: 'ADJUSTMENT_IN',
                            qty: qty,
                            unitCost: cost,
                            refCode: 'CSV_IMPORT',
                            pic: 'CSV_IMPORT',
                            note: `CSV Import: ${productName} ${colorName} ${sizeName}`
                        });
                    }
                } else if (mode === 'set') {
                    // Set stock level (replace)
                    const currentBalance = await InventoryService.getStockBalance(
                        variantResult.id, location.id
                    );
                    
                    const difference = qty - (currentBalance || 0);
                    
                    if (difference !== 0) {
                        await MovementService.createMovement({
                            variantId: variantResult.id,
                            locationId: location.id,
                            movementType: difference > 0 ? 'IN' : 'OUT',
                            reasonCode: difference > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
                            qty: Math.abs(difference),
                            unitCost: cost,
                            refCode: 'CSV_SET',
                            pic: 'CSV_IMPORT',
                            note: `CSV Set Stock: ${productName} ${colorName} ${sizeName} -> ${qty}`
                        });
                    }
                }

                results.imported++;
                results.updated++;

            } catch (rowError) {
                console.error(`❌ Error processing CSV row ${i + 2}:`, rowError);
                results.errors.push(`Row ${i + 2}: ${rowError.message}`);
            }
        }

        console.log(`✅ CSV import completed: ${results.imported} imported, ${results.errors.length} errors`);

        res.json({
            success: true,
            ...results,
            message: `Successfully imported ${results.imported} of ${records.length} records`
        });

    } catch (error) {
        console.error('❌ Error importing CSV stock:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to import CSV stock',
            message: error.message
        });
    }
});

module.exports = router;