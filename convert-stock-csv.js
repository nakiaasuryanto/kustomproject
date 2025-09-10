#!/usr/bin/env node

/**
 * CSV Stock Data Converter
 * Converts complex stock spreadsheet to simple CSV format for import
 */

const fs = require('fs');
const path = require('path');

function parseComplexCSV(filePath) {
    console.log('📄 Reading complex CSV file...');
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const simpleData = [];
    let currentProduct = '';
    
    // Skip header rows (first 2 rows)
    for (let i = 2; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const columns = line.split(',');
        
        // Check if this is a product header row (has product name in first column)
        const firstCol = columns[0] ? columns[0].trim() : '';
        
        if (firstCol && !firstCol.startsWith(',') && firstCol !== '') {
            // This might be a product name or color
            if (firstCol.toUpperCase().includes('T-SHIRT') || 
                firstCol.toUpperCase().includes('LONG SLEEVE') ||
                firstCol.toUpperCase().includes('HENLEY') ||
                firstCol.toUpperCase().includes('POLO') ||
                firstCol.toUpperCase().includes('KEMEJA') ||
                firstCol.toUpperCase().includes('JAKET') ||
                firstCol.toUpperCase().includes('SWEATER') ||
                firstCol.toUpperCase().includes('KAOS') ||
                firstCol.toUpperCase().includes('KIDS')) {
                
                currentProduct = firstCol.trim();
                console.log(`📦 Found product: ${currentProduct}`);
                continue;
            }
        }
        
        // Check if this row has color data (second column has color name)
        const colorName = columns[1] ? columns[1].trim() : '';
        
        if (colorName && colorName !== '' && currentProduct) {
            // Parse stock quantities for each size and location
            // Column structure: KODE SKU, WARNA, S, M, L, XL, XXL, 3XL, ..., DISPLAY S, M, L, XL, XXL, ..., TOTAL S, M, L, XL, XXL
            
            const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
            
            // STOCK OFFLINE columns (positions 2-6)
            const offlineStocks = [
                parseInt(columns[2]) || 0,  // S
                parseInt(columns[3]) || 0,  // M  
                parseInt(columns[4]) || 0,  // L
                parseInt(columns[5]) || 0,  // XL
                parseInt(columns[6]) || 0   // XXL
            ];
            
            // DISPLAY columns (positions 10-14)
            const displayStocks = [
                parseInt(columns[10]) || 0, // S
                parseInt(columns[11]) || 0, // M
                parseInt(columns[12]) || 0, // L
                parseInt(columns[13]) || 0, // XL
                parseInt(columns[14]) || 0  // XXL
            ];
            
            // Add offline stock entries
            sizes.forEach((size, index) => {
                if (offlineStocks[index] > 0) {
                    simpleData.push({
                        product_name: currentProduct,
                        color_name: colorName,
                        size_name: size,
                        location_name: 'Lemari', // Offline = Lemari
                        quantity: offlineStocks[index],
                        unit_cost: 0 // Will need to be filled manually or set default
                    });
                }
            });
            
            // Add display stock entries  
            sizes.forEach((size, index) => {
                if (displayStocks[index] > 0) {
                    simpleData.push({
                        product_name: currentProduct,
                        color_name: colorName,
                        size_name: size,
                        location_name: 'Display',
                        quantity: displayStocks[index],
                        unit_cost: 0 // Will need to be filled manually or set default
                    });
                }
            });
        }
    }
    
    return simpleData;
}

function writeSimpleCSV(data, outputPath) {
    console.log('💾 Writing simple CSV format...');
    
    const headers = ['product_name', 'color_name', 'size_name', 'location_name', 'quantity', 'unit_cost'];
    let csvContent = headers.join(',') + '\n';
    
    data.forEach(row => {
        const csvRow = [
            `"${row.product_name}"`,
            `"${row.color_name}"`, 
            `"${row.size_name}"`,
            `"${row.location_name}"`,
            row.quantity,
            row.unit_cost
        ].join(',');
        
        csvContent += csvRow + '\n';
    });
    
    fs.writeFileSync(outputPath, csvContent, 'utf-8');
    console.log(`✅ Conversion complete! Output saved to: ${outputPath}`);
}

function main() {
    const inputFile = process.argv[2];
    const outputFile = process.argv[3];
    
    if (!inputFile) {
        console.log('Usage: node convert-stock-csv.js <input-file> [output-file]');
        console.log('');
        console.log('Example:');
        console.log('  node convert-stock-csv.js "Database Stock Kustomproject - STOCKWAREHOUSE 14_08_2025.csv" converted-stock.csv');
        process.exit(1);
    }
    
    if (!fs.existsSync(inputFile)) {
        console.error('❌ Input file not found:', inputFile);
        process.exit(1);
    }
    
    const defaultOutput = outputFile || 'converted-stock-data.csv';
    
    try {
        console.log('🚀 Starting conversion...');
        console.log('📥 Input:', inputFile);
        console.log('📤 Output:', defaultOutput);
        console.log('');
        
        const simpleData = parseComplexCSV(inputFile);
        
        console.log(`📊 Conversion Summary:`);
        console.log(`   Total entries: ${simpleData.length}`);
        console.log(`   Products: ${[...new Set(simpleData.map(d => d.product_name))].length}`);
        console.log(`   Colors: ${[...new Set(simpleData.map(d => d.color_name))].length}`);
        console.log(`   Sizes: ${[...new Set(simpleData.map(d => d.size_name))].length}`);
        console.log('');
        
        writeSimpleCSV(simpleData, defaultOutput);
        
        console.log('');
        console.log('📋 Next steps:');
        console.log('1. Review the converted file and add unit_cost values');
        console.log('2. Import the file through http://localhost:3001/inventory.html');
        console.log('3. Click "📄 Import CSV" and select the converted file');
        
    } catch (error) {
        console.error('❌ Conversion failed:', error.message);
        process.exit(1);
    }
}

main();