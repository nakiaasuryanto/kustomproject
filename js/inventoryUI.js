/**
 * Inventory UI Module
 * Handles all UI interactions for inventory management
 */

class InventoryUI {
    constructor() {
        this.inventoryData = [];
        this.locations = [];
        this.expandedRows = new Set();
        this.currentFilters = {};
        this.selectedItems = new Set();
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Inventory UI...');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load initial data
        await this.loadInitialData();
        
        // Setup filters
        await this.setupFilters();
        
        console.log('✅ Inventory UI initialized');
    }

    setupEventListeners() {
        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.loadInventoryData();
        });

        // Filter buttons
        document.getElementById('applyFilters').addEventListener('click', () => {
            this.applyFilters();
        });

        document.getElementById('resetFilters').addEventListener('click', () => {
            this.resetFilters();
        });

        // Stock movement button
        document.getElementById('stockMovementBtn').addEventListener('click', () => {
            this.showStockMovementModal();
        });

        // Stock opname button
        document.getElementById('stockOpnameBtn').addEventListener('click', () => {
            this.showStockOpnameModal();
        });

        // CSV import button
        document.getElementById('csvImportBtn').addEventListener('click', () => {
            this.showCsvImportModal();
        });

        // Bulk action buttons
        document.getElementById('selectAllCheckbox').addEventListener('change', (e) => {
            this.toggleSelectAll(e.target.checked);
        });

        document.getElementById('selectAllBtn').addEventListener('click', () => {
            this.selectAll();
        });

        document.getElementById('deselectAllBtn').addEventListener('click', () => {
            this.deselectAll();
        });

        document.getElementById('bulkMoveBtn').addEventListener('click', () => {
            this.showBulkStockMovementModal();
        });

        document.getElementById('bulkTransferBtn').addEventListener('click', () => {
            this.showBulkTransferModal();
        });

        document.getElementById('bulkAdjustBtn').addEventListener('click', () => {
            this.showBulkAdjustmentModal();
        });

        document.getElementById('bulkExportBtn').addEventListener('click', () => {
            this.exportSelectedItems();
        });

        document.getElementById('bulkDeleteBtn').addEventListener('click', () => {
            this.showBulkDeleteModal();
        });

        // Delete modal event listeners
        document.getElementById('closeDeleteConfirmModal').addEventListener('click', () => {
            this.hideDeleteModal();
        });

        document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
            this.hideDeleteModal();
        });

        document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
            this.confirmDelete();
        });

        document.getElementById('deleteConfirmCheckbox').addEventListener('change', (e) => {
            document.getElementById('confirmDeleteBtn').disabled = !e.target.checked;
        });

        // Bulk modal close buttons
        document.getElementById('closeBulkStockMovementModal').addEventListener('click', () => {
            this.hideBulkStockMovementModal();
        });

        document.getElementById('closeBulkTransferModal').addEventListener('click', () => {
            this.hideBulkTransferModal();
        });

        document.getElementById('closeBulkAdjustmentModal').addEventListener('click', () => {
            this.hideBulkAdjustmentModal();
        });

        // Bulk form submissions
        document.getElementById('bulkStockMovementForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitBulkStockMovement();
        });

        document.getElementById('bulkTransferForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitBulkTransfer();
        });

        document.getElementById('bulkAdjustmentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitBulkAdjustment();
        });

        // Modal close buttons
        document.getElementById('closeStockCardModal').addEventListener('click', () => {
            this.hideStockCardModal();
        });

        document.getElementById('closeStockMovementModal').addEventListener('click', () => {
            this.hideStockMovementModal();
        });

        document.getElementById('closeTransferModal').addEventListener('click', () => {
            this.hideTransferModal();
        });

        document.getElementById('closeCsvImportModal').addEventListener('click', () => {
            this.hideCsvImportModal();
        });

        // Close modals when clicking outside
        document.getElementById('stockCardModal').addEventListener('click', (e) => {
            if (e.target.id === 'stockCardModal') {
                this.hideStockCardModal();
            }
        });

        document.getElementById('stockMovementModal').addEventListener('click', (e) => {
            if (e.target.id === 'stockMovementModal') {
                this.hideStockMovementModal();
            }
        });

        document.getElementById('transferModal').addEventListener('click', (e) => {
            if (e.target.id === 'transferModal') {
                this.hideTransferModal();
            }
        });

        document.getElementById('csvImportModal').addEventListener('click', (e) => {
            if (e.target.id === 'csvImportModal') {
                this.hideCsvImportModal();
            }
        });

        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideStockCardModal();
                this.hideStockMovementModal();
                this.hideTransferModal();
                this.hideCsvImportModal();
            }
        });

        // Stock movement form
        document.getElementById('stockMovementForm').addEventListener('submit', (e) => {
            this.handleStockMovementSubmit(e);
        });

        document.getElementById('cancelStockMovement').addEventListener('click', () => {
            this.hideStockMovementModal();
        });

        // Movement type change
        document.getElementById('movementType').addEventListener('change', () => {
            this.updateReasonCodes();
        });

        // Variant search
        document.getElementById('variantSearch').addEventListener('input', (e) => {
            this.debounce(this.searchVariants.bind(this), 300)(e.target.value);
        });

        // Search input
        document.getElementById('searchQuery').addEventListener('input', (e) => {
            this.debounce(this.applyFilters.bind(this), 500)();
        });

        // Retry button
        document.getElementById('retryBtn').addEventListener('click', () => {
            this.loadInventoryData();
        });

        // CSV Import event listeners
        document.getElementById('csvFileInput').addEventListener('change', (e) => {
            this.handleCsvFileSelect(e);
        });

        document.getElementById('previewCsvBtn').addEventListener('click', () => {
            this.previewCsvData();
        });

        document.getElementById('importCsvBtn').addEventListener('click', () => {
            this.importCsvData();
        });

        document.getElementById('cancelCsvImport').addEventListener('click', () => {
            this.hideCsvImportModal();
        });
    }

    async loadInitialData() {
        this.showLoading();
        
        try {
            // Load inventory stats and data in parallel
            await Promise.all([
                this.loadInventoryStats(),
                this.loadLocations(),
                this.loadInventoryData()
            ]);

        } catch (error) {
            console.error('❌ Error loading initial data:', error);
            this.showError();
        }
    }

    async loadInventoryStats() {
        try {
            const stats = await InventoryAPI.getInventoryStats();
            
            document.getElementById('totalProducts').textContent = stats.total_products || 0;
            document.getElementById('totalVariants').textContent = `${stats.total_variants || 0} variants`;
            document.getElementById('totalQuantity').textContent = stats.total_qty || 0;
            document.getElementById('inStockVariants').textContent = `${stats.variants_with_stock || 0} in stock`;
            document.getElementById('totalLocations').textContent = stats.total_locations || 0;
            document.getElementById('outOfStockVariants').textContent = stats.variants_out_of_stock || 0;

        } catch (error) {
            console.error('❌ Error loading inventory stats:', error);
        }
    }

    async loadLocations() {
        try {
            this.locations = await InventoryAPI.getLocations();
            console.log('📍 Loaded locations:', this.locations.length);

        } catch (error) {
            console.error('❌ Error loading locations:', error);
            this.locations = [];
        }
    }

    async loadInventoryData() {
        this.showLoading();
        
        try {
            const result = await InventoryAPI.getInventoryTree(this.currentFilters);
            this.inventoryData = result.data;
            
            console.log('📦 Loaded inventory data:', this.inventoryData.length, 'groups');
            
            if (this.inventoryData.length === 0) {
                this.showEmpty();
            } else {
                this.renderInventoryTable();
                this.hideAllStates();
            }

        } catch (error) {
            console.error('❌ Error loading inventory data:', error);
            this.showError();
        }
    }

    async setupFilters() {
        try {
            // Setup location filter
            const locationSelect = document.getElementById('filterLocation');
            locationSelect.innerHTML = '<option value="">All Locations</option>';
            
            this.locations.forEach(location => {
                const option = document.createElement('option');
                option.value = location.id;
                option.textContent = `${location.name} (${location.code})`;
                locationSelect.appendChild(option);
            });

            // Setup movement location filter
            const movementLocationSelect = document.getElementById('movementLocation');
            movementLocationSelect.innerHTML = '<option value="">Select Location</option>';
            
            this.locations.forEach(location => {
                const option = document.createElement('option');
                option.value = location.id;
                option.textContent = `${location.name} (${location.code})`;
                movementLocationSelect.appendChild(option);
            });

            // Load products and colors for filters (simplified version)
            // This would be enhanced with actual product/color data
            console.log('🔧 Filters setup completed');

        } catch (error) {
            console.error('❌ Error setting up filters:', error);
        }
    }

    renderInventoryTable() {
        const tbody = document.getElementById('inventoryTableBody');
        tbody.innerHTML = '';

        this.inventoryData.forEach(productColor => {
            const row = this.createProductColorRow(productColor);
            tbody.appendChild(row);

            // Add expanded location rows if this product-color is expanded
            if (this.expandedRows.has(this.getProductColorKey(productColor))) {
                Object.values(productColor.locations).forEach(location => {
                    const locationRow = this.createLocationRow(productColor, location);
                    tbody.appendChild(locationRow);
                });
            }
        });
    }

    createProductColorRow(productColor) {
        const row = document.createElement('tr');
        row.className = 'inventory-row expandable border-l-4 border-blue-500';
        row.dataset.productColorKey = this.getProductColorKey(productColor);
        
        const isExpanded = this.expandedRows.has(this.getProductColorKey(productColor));
        if (isExpanded) {
            row.classList.add('expanded');
        }

        row.innerHTML = `
            <td class="px-4 py-4 text-center">
                <input type="checkbox" 
                       class="product-color-checkbox rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                       data-product-id="${productColor.product_id}"
                       data-color-id="${productColor.color_id}"
                       onchange="inventoryUI.onProductColorCheckboxChange('${productColor.product_id}', '${productColor.color_id}', this.checked)"
                       title="Select all variants of this product-color">
            </td>
            <td class="px-4 py-4">
                <div class="flex items-center">
                    <button class="expand-btn mr-2 text-gray-500 hover:text-gray-700">
                        <svg class="w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-90' : ''}" 
                             fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </button>
                    <div>
                        <div class="font-medium text-gray-900">${productColor.product_name}</div>
                        <div class="flex items-center mt-1">
                            <div class="w-4 h-4 rounded border mr-2" 
                                 style="background-color: ${productColor.color_hex || '#e5e7eb'}"></div>
                            <div class="text-sm text-gray-600">${productColor.color_name}</div>
                        </div>
                    </div>
                </div>
            </td>
            <td class="px-4 py-4">
                <span class="text-lg font-semibold ${productColor.total_qty > 0 ? 'text-green-600' : 'text-red-600'}">
                    ${productColor.total_qty}
                </span>
            </td>
            <td class="px-4 py-4">
                <div class="text-sm text-gray-600">
                    ${Object.values(productColor.locations).length} location(s)
                </div>
            </td>
            <td class="px-4 py-4">
                <div class="flex space-x-2">
                    <button class="text-blue-600 hover:text-blue-800 text-sm" onclick="inventoryUI.showTransferModal(${productColor.product_id}, ${productColor.color_id})">
                        🔄 Transfer
                    </button>
                    <button class="text-green-600 hover:text-green-800 text-sm" onclick="inventoryUI.adjustStock(${productColor.product_id}, ${productColor.color_id})">
                        📝 Adjust
                    </button>
                    <button class="text-purple-600 hover:text-purple-800 text-sm" onclick="inventoryUI.showStockMovementModal()">
                        📦 Add Stock
                    </button>
                </div>
            </td>
        `;

        // Add click handler for expansion
        row.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                this.toggleProductColorExpansion(productColor);
            }
        });

        return row;
    }

    createLocationRow(productColor, location) {
        const row = document.createElement('tr');
        row.className = 'inventory-row bg-gray-50 border-l-4 border-gray-300';
        
        row.innerHTML = `
            <td class="px-4 py-3 pl-12">
                <div class="flex items-center">
                    <div class="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
                    <div>
                        <div class="font-medium text-gray-800">${location.location_name}</div>
                        <div class="text-xs text-gray-500">${location.location_code}${location.location_is_default ? ' (Default)' : ''}</div>
                    </div>
                </div>
            </td>
            <td class="px-4 py-3">
                <span class="text-md font-medium ${location.total_qty > 0 ? 'text-green-600' : 'text-gray-400'}">
                    ${location.total_qty}
                </span>
            </td>
            <td class="px-4 py-3">
                <div class="flex flex-wrap">
                    ${location.sizes.map(size => `
                        <div class="size-variant-item ${size.qty_on_hand > 0 ? 'has-stock' : ''}">
                            <input type="checkbox" 
                                   class="inventory-row-checkbox rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                                   data-variant-id="${size.variant_id}"
                                   onchange="inventoryUI.onRowCheckboxChange('${size.variant_id}', this.checked)">
                            <span onclick="inventoryUI.showStockCard(${productColor.product_id}, ${productColor.color_id}, ${size.size_id}, ${location.location_id})"
                                  class="cursor-pointer" 
                                  title="Click to view stock card">
                                ${size.size_name}: ${size.qty_on_hand}
                            </span>
                            <button class="delete-btn text-red-600 hover:text-red-800 text-xs ml-2 p-1 rounded" 
                                    onclick="inventoryUI.deleteItem('${size.variant_id}')"
                                    title="Delete this variant">
                                🗑️
                            </button>
                        </div>
                    `).join('')}
                </div>
            </td>
            <td class="px-4 py-3">
                <div class="flex space-x-2">
                    <button class="text-purple-600 hover:text-purple-800 text-sm" 
                            onclick="inventoryUI.showLocationStockCard(${productColor.product_id}, ${productColor.color_id}, ${location.location_id})">
                        📋 Stock Card
                    </button>
                </div>
            </td>
        `;

        return row;
    }

    toggleProductColorExpansion(productColor) {
        const key = this.getProductColorKey(productColor);
        
        if (this.expandedRows.has(key)) {
            this.expandedRows.delete(key);
        } else {
            this.expandedRows.add(key);
        }
        
        this.renderInventoryTable();
    }

    getProductColorKey(productColor) {
        return `${productColor.product_id}-${productColor.color_id}`;
    }

    applyFilters() {
        this.currentFilters = {
            productId: document.getElementById('filterProduct').value || null,
            colorId: document.getElementById('filterColor').value || null,
            locationId: document.getElementById('filterLocation').value || null,
            q: document.getElementById('searchQuery').value.trim() || null,
            onlyAvailable: document.getElementById('onlyAvailable').checked
        };

        this.loadInventoryData();
    }

    resetFilters() {
        document.getElementById('filterProduct').value = '';
        document.getElementById('filterColor').value = '';
        document.getElementById('filterLocation').value = '';
        document.getElementById('searchQuery').value = '';
        document.getElementById('onlyAvailable').checked = false;
        
        this.currentFilters = {};
        this.loadInventoryData();
    }

    async showStockCard(productId, colorId, sizeId, locationId) {
        try {
            console.log('📋 Loading stock card:', { productId, colorId, sizeId, locationId });
            
            // Show modal with loading state
            document.getElementById('stockCardContent').innerHTML = `
                <div class="text-center py-8">
                    <div class="loading-spinner mx-auto mb-4"></div>
                    <div class="text-gray-600">Loading stock card...</div>
                </div>
            `;
            document.getElementById('stockCardModal').classList.remove('hidden');

            // Get stock card data
            const stockCard = await InventoryAPI.getStockCard({
                productId,
                colorId,
                sizeId,
                locationId,
                fromDate: this.getDateMonthsAgo(3), // Last 3 months
                limit: 100
            });

            // Render stock card
            this.renderStockCard(stockCard);

        } catch (error) {
            console.error('❌ Error loading stock card:', error);
            document.getElementById('stockCardContent').innerHTML = `
                <div class="text-center py-8 text-red-600">
                    Error loading stock card: ${error.message}
                </div>
            `;
        }
    }

    renderStockCard(stockCard) {
        const content = document.getElementById('stockCardContent');
        
        content.innerHTML = `
            <div class="mb-6">
                <h4 class="text-lg font-semibold mb-2">
                    ${stockCard.product_name} - ${stockCard.color_name} (${stockCard.size_name})
                </h4>
                <div class="text-sm text-gray-600 mb-4">
                    Location: ${stockCard.location_name} (${stockCard.location_code})
                </div>
                <div class="grid grid-cols-3 gap-4 mb-4">
                    <div class="bg-blue-50 p-3 rounded">
                        <div class="text-sm text-gray-600">Opening Balance</div>
                        <div class="text-lg font-semibold text-blue-600">${stockCard.opening_qty}</div>
                    </div>
                    <div class="bg-green-50 p-3 rounded">
                        <div class="text-sm text-gray-600">Current Balance</div>
                        <div class="text-lg font-semibold text-green-600">${stockCard.current_qty}</div>
                    </div>
                    <div class="bg-gray-50 p-3 rounded">
                        <div class="text-sm text-gray-600">Avg Cost</div>
                        <div class="text-lg font-semibold text-gray-600">Rp ${(stockCard.avg_cost || 0).toLocaleString()}</div>
                    </div>
                </div>
            </div>

            <div class="mb-4 flex justify-between items-center">
                <h5 class="font-semibold">Movement History</h5>
                <button onclick="inventoryUI.exportStockCard('${stockCard.product_name}', '${stockCard.color_name}', '${stockCard.size_name}')" 
                        class="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
                    📤 Export Excel
                </button>
            </div>

            <div class="overflow-x-auto max-h-96">
                <table class="min-w-full table-auto">
                    <thead class="bg-gray-50 sticky top-0">
                        <tr>
                            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">Reason</th>
                            <th class="px-3 py-2 text-right text-xs font-medium text-gray-500">In</th>
                            <th class="px-3 py-2 text-right text-xs font-medium text-gray-500">Out</th>
                            <th class="px-3 py-2 text-right text-xs font-medium text-gray-500">Balance</th>
                            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">Ref</th>
                            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500">PIC</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${stockCard.movements.map(movement => `
                            <tr>
                                <td class="px-3 py-2 text-sm text-gray-900">
                                    ${new Date(movement.created_at).toLocaleDateString('id-ID')}
                                </td>
                                <td class="px-3 py-2 text-sm">
                                    <span class="px-2 py-1 text-xs rounded-full ${
                                        movement.movement_type === 'IN' 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-red-100 text-red-800'
                                    }">
                                        ${movement.movement_type}
                                    </span>
                                </td>
                                <td class="px-3 py-2 text-sm text-gray-900">${movement.reason_code}</td>
                                <td class="px-3 py-2 text-sm text-right ${movement.movement_type === 'IN' ? 'text-green-600 font-medium' : 'text-gray-400'}">
                                    ${movement.movement_type === 'IN' ? movement.qty : '-'}
                                </td>
                                <td class="px-3 py-2 text-sm text-right ${movement.movement_type === 'OUT' ? 'text-red-600 font-medium' : 'text-gray-400'}">
                                    ${movement.movement_type === 'OUT' ? movement.qty : '-'}
                                </td>
                                <td class="px-3 py-2 text-sm text-right font-medium">${movement.running_balance}</td>
                                <td class="px-3 py-2 text-sm text-gray-500">${movement.ref_code || '-'}</td>
                                <td class="px-3 py-2 text-sm text-gray-500">${movement.pic || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            ${stockCard.movements.length === 0 ? `
                <div class="text-center py-8 text-gray-500">
                    No movements found for the selected period
                </div>
            ` : ''}
        `;
    }

    showStockMovementModal() {
        // Reset form
        document.getElementById('stockMovementForm').reset();
        document.getElementById('selectedVariantId').value = '';
        this.updateReasonCodes();
        
        document.getElementById('stockMovementModal').classList.remove('hidden');
    }

    hideStockMovementModal() {
        document.getElementById('stockMovementModal').classList.add('hidden');
    }

    hideStockCardModal() {
        document.getElementById('stockCardModal').classList.add('hidden');
    }

    hideTransferModal() {
        document.getElementById('transferModal').classList.add('hidden');
    }

    showStockOpnameModal() {
        // For now, just show a notification - opname feature can be expanded later
        this.showNotification('Stock Opname feature coming soon!', 'info');
        console.log('📊 Stock Opname modal requested');
    }

    showLocationStockCard(productId, colorId, locationId) {
        // Show stock card for all sizes in a specific location
        this.showStockCard(productId, colorId, null, locationId);
    }

    showTransferModal(productId, colorId) {
        console.log('🔄 Transfer modal requested for:', { productId, colorId });
        
        // Load transfer form content
        document.getElementById('transferContent').innerHTML = `
            <div class="text-center py-8">
                <div class="text-gray-600">Transfer functionality coming soon!</div>
                <p class="text-sm text-gray-500 mt-2">This will allow transferring stock between locations.</p>
            </div>
        `;
        
        document.getElementById('transferModal').classList.remove('hidden');
    }

    updateReasonCodes() {
        const movementType = document.getElementById('movementType').value;
        const reasonSelect = document.getElementById('reasonCode');
        
        const reasons = {
            'IN': [
                { value: 'OVERPROD_IN', text: 'Overproduction' },
                { value: 'RETURN_IN', text: 'Return' },
                { value: 'ADJUSTMENT_IN', text: 'Adjustment In' },
                { value: 'TRANSFER_IN', text: 'Transfer In' }
            ],
            'OUT': [
                { value: 'SALES_OUT', text: 'Sales' },
                { value: 'ADJUSTMENT_OUT', text: 'Adjustment Out' },
                { value: 'TRANSFER_OUT', text: 'Transfer Out' }
            ]
        };

        reasonSelect.innerHTML = '';
        (reasons[movementType] || []).forEach(reason => {
            const option = document.createElement('option');
            option.value = reason.value;
            option.textContent = reason.text;
            reasonSelect.appendChild(option);
        });
    }

    async searchVariants(query) {
        if (!query || query.length < 2) return;

        try {
            const variants = await InventoryAPI.searchVariants(query, 10);
            // This would show a dropdown with search results
            // For now, we'll just log the results
            console.log('🔍 Search results:', variants);

        } catch (error) {
            console.error('❌ Error searching variants:', error);
        }
    }

    async handleStockMovementSubmit(e) {
        e.preventDefault();
        
        try {
            const formData = new FormData(e.target);
            const data = {
                variant_id: document.getElementById('selectedVariantId').value,
                location_id: document.getElementById('movementLocation').value,
                movement_type: document.getElementById('movementType').value,
                reason_code: document.getElementById('reasonCode').value,
                qty: parseInt(document.getElementById('movementQty').value),
                unit_cost: document.getElementById('unitCost').value ? parseFloat(document.getElementById('unitCost').value) : null,
                note: document.getElementById('movementNote').value,
                pic: document.getElementById('movementPic').value,
                created_by: document.getElementById('movementPic').value
            };

            if (!data.variant_id || !data.location_id || !data.qty) {
                alert('Please fill in all required fields');
                return;
            }

            const movement = await InventoryAPI.createMovement(data);
            
            this.hideStockMovementModal();
            this.showNotification('Stock movement created successfully', 'success');
            this.loadInventoryData();

        } catch (error) {
            console.error('❌ Error creating stock movement:', error);
            this.showNotification(`Error: ${error.message}`, 'error');
        }
    }

    showNotification(message, type = 'info') {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${
            type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
            type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
            'bg-blue-100 text-blue-800 border border-blue-200'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    exportStockCard(productName, colorName, sizeName) {
        // This would export the stock card data to Excel
        console.log('📤 Exporting stock card for:', productName, colorName, sizeName);
        this.showNotification('Export feature coming soon!', 'info');
    }

    getDateMonthsAgo(months) {
        const date = new Date();
        date.setMonth(date.getMonth() - months);
        return date.toISOString().split('T')[0];
    }

    showLoading() {
        this.hideAllStates();
        document.getElementById('loadingState').classList.remove('hidden');
    }

    showError() {
        this.hideAllStates();
        document.getElementById('errorState').classList.remove('hidden');
    }

    showEmpty() {
        this.hideAllStates();
        document.getElementById('emptyState').classList.remove('hidden');
    }

    hideAllStates() {
        document.getElementById('loadingState').classList.add('hidden');
        document.getElementById('errorState').classList.add('hidden');
        document.getElementById('emptyState').classList.add('hidden');
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // CSV Import Methods
    showCsvImportModal() {
        // Reset form
        document.getElementById('csvFileInput').value = '';
        document.getElementById('csvPreview').classList.add('hidden');
        document.getElementById('csvImportProgress').classList.add('hidden');
        document.getElementById('previewCsvBtn').disabled = true;
        document.getElementById('importCsvBtn').disabled = true;
        
        // Reset radio buttons
        document.querySelector('input[name="importMode"][value="add"]').checked = true;
        
        this.csvData = null;
        
        document.getElementById('csvImportModal').classList.remove('hidden');
    }

    hideCsvImportModal() {
        document.getElementById('csvImportModal').classList.add('hidden');
        this.csvData = null;
    }

    handleCsvFileSelect(event) {
        const file = event.target.files[0];
        if (!file) {
            document.getElementById('previewCsvBtn').disabled = true;
            document.getElementById('importCsvBtn').disabled = true;
            return;
        }

        if (file.type !== 'text/csv') {
            this.showNotification('Please select a valid CSV file', 'error');
            return;
        }

        document.getElementById('previewCsvBtn').disabled = false;
        this.csvFile = file;
    }

    async previewCsvData() {
        if (!this.csvFile) return;

        try {
            const text = await this.csvFile.text();
            const lines = text.split('\n').filter(line => line.trim());
            
            if (lines.length < 2) {
                this.showNotification('CSV file must have at least a header row and one data row', 'error');
                return;
            }

            // Auto-detect delimiter
            const firstLine = lines[0];
            const delimiter = firstLine.includes(';') ? ';' : ',';
            const headers = firstLine.split(delimiter).map(h => h.trim());
            const requiredHeaders = ['product_name', 'color_name', 'size_name', 'location_name', 'quantity', 'unit_cost'];
            
            // Check for required headers
            const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
            if (missingHeaders.length > 0) {
                this.showNotification(`Missing required columns: ${missingHeaders.join(', ')}`, 'error');
                return;
            }

            // Parse CSV data
            this.csvData = [];
            for (let i = 1; i < lines.length && i < 6; i++) { // Preview first 5 rows
                const values = lines[i].split(delimiter).map(v => v.trim());
                if (values.length === headers.length) {
                    const row = {};
                    headers.forEach((header, index) => {
                        row[header] = values[index];
                    });
                    this.csvData.push(row);
                }
            }

            // Store full data for import
            this.fullCsvData = [];
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(delimiter).map(v => v.trim());
                if (values.length === headers.length) {
                    const row = {};
                    headers.forEach((header, index) => {
                        row[header] = values[index];
                    });
                    this.fullCsvData.push(row);
                }
            }

            this.renderCsvPreview();
            document.getElementById('importCsvBtn').disabled = false;

        } catch (error) {
            console.error('❌ Error parsing CSV:', error);
            this.showNotification('Error parsing CSV file', 'error');
        }
    }

    renderCsvPreview() {
        if (!this.csvData || this.csvData.length === 0) return;

        const previewDiv = document.getElementById('csvPreview');
        const tableDiv = document.getElementById('csvPreviewTable');
        
        const headers = Object.keys(this.csvData[0]);
        
        tableDiv.innerHTML = `
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        ${headers.map(header => `
                            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                ${header.replace('_', ' ')}
                            </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${this.csvData.map(row => `
                        <tr>
                            ${headers.map(header => `
                                <td class="px-3 py-2 text-sm text-gray-900">
                                    ${row[header]}
                                </td>
                            `).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        previewDiv.classList.remove('hidden');
    }

    async importCsvData() {
        if (!this.csvFile) {
            this.showNotification('No CSV file selected', 'error');
            return;
        }

        const importMode = document.querySelector('input[name="importMode"]:checked').value;
        
        // Show progress
        document.getElementById('csvImportProgress').classList.remove('hidden');
        document.getElementById('csvImportStatus').textContent = 'Starting import...';
        document.getElementById('importCsvBtn').disabled = true;

        try {
            const response = await InventoryAPI.importCsvStock(this.csvFile, importMode);

            if (response.success) {
                document.getElementById('csvImportStatus').textContent = 'Import completed successfully!';
                document.getElementById('csvImportResults').innerHTML = `
                    <div class="text-green-600">
                        ✅ Successfully imported ${response.imported || 'all'} records<br>
                        ${response.created ? `📦 Created ${response.created} new variants` : ''}<br>
                        ${response.updated ? `🔄 Updated ${response.updated} existing variants` : ''}
                    </div>
                `;
                
                // Refresh inventory data
                setTimeout(() => {
                    this.loadInventoryData();
                    this.hideCsvImportModal();
                }, 3000);
                
                this.showNotification('CSV import completed successfully!', 'success');
            } else {
                throw new Error(response.message || 'Import failed');
            }

        } catch (error) {
            console.error('❌ Error importing CSV:', error);
            document.getElementById('csvImportStatus').textContent = 'Import failed';
            document.getElementById('csvImportResults').innerHTML = `
                <div class="text-red-600">
                    ❌ Error: ${error.message}
                </div>
            `;
            this.showNotification(`Import failed: ${error.message}`, 'error');
        } finally {
            document.getElementById('importCsvBtn').disabled = false;
        }
    }

    // ===========================
    // BULK ACTION METHODS
    // ===========================

    updateSelectedCount() {
        const count = this.selectedItems.size;
        document.getElementById('selectedCount').textContent = `${count} variants selected`;
        
        // Show/hide bulk actions toolbar
        const toolbar = document.getElementById('bulkActionsToolbar');
        if (count > 0) {
            toolbar.classList.remove('hidden');
        } else {
            toolbar.classList.add('hidden');
        }

        // Update select all checkbox state based on product-color checkboxes
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');
        const allProductColorCheckboxes = document.querySelectorAll('.product-color-checkbox');
        const checkedProductColorCheckboxes = document.querySelectorAll('.product-color-checkbox:checked');
        
        if (checkedProductColorCheckboxes.length === 0) {
            selectAllCheckbox.indeterminate = false;
            selectAllCheckbox.checked = false;
        } else if (checkedProductColorCheckboxes.length === allProductColorCheckboxes.length) {
            selectAllCheckbox.indeterminate = false;
            selectAllCheckbox.checked = true;
        } else {
            selectAllCheckbox.indeterminate = true;
            selectAllCheckbox.checked = false;
        }
    }

    toggleSelectAll(checked) {
        // Toggle all product-color checkboxes
        const productColorCheckboxes = document.querySelectorAll('.product-color-checkbox');
        productColorCheckboxes.forEach(checkbox => {
            if (checkbox.checked !== checked) {
                checkbox.checked = checked;
                // Trigger the change event to handle all variants within this product-color
                const productId = checkbox.dataset.productId;
                const colorId = checkbox.dataset.colorId;
                this.onProductColorCheckboxChange(productId, colorId, checked);
            }
        });
        this.updateSelectedCount();
    }

    selectAll() {
        this.toggleSelectAll(true);
    }

    deselectAll() {
        this.toggleSelectAll(false);
    }

    onRowCheckboxChange(variantId, checked) {
        if (checked) {
            this.selectedItems.add(variantId);
        } else {
            this.selectedItems.delete(variantId);
        }

        // Update parent product-color checkbox state
        this.updateProductColorCheckboxStates();
        this.updateSelectedCount();
    }

    updateProductColorCheckboxStates() {
        // For each product-color checkbox, check if all its variants are selected
        const productColorCheckboxes = document.querySelectorAll('.product-color-checkbox');
        
        productColorCheckboxes.forEach(checkbox => {
            const productId = checkbox.dataset.productId;
            const colorId = checkbox.dataset.colorId;
            
            // Find all variant IDs for this product-color combination
            const productColor = this.inventoryData.find(pc => 
                pc.product_id == productId && pc.color_id == colorId
            );
            
            if (!productColor) return;

            const variantIds = new Set();
            Object.values(productColor.locations).forEach(location => {
                location.sizes.forEach(size => {
                    if (size.variant_id) {
                        variantIds.add(size.variant_id.toString());
                    }
                });
            });

            // Check if all variants are selected
            const allSelected = Array.from(variantIds).every(variantId => 
                this.selectedItems.has(variantId)
            );
            
            const noneSelected = Array.from(variantIds).every(variantId => 
                !this.selectedItems.has(variantId)
            );

            if (allSelected) {
                checkbox.checked = true;
                checkbox.indeterminate = false;
            } else if (noneSelected) {
                checkbox.checked = false;
                checkbox.indeterminate = false;
            } else {
                checkbox.checked = false;
                checkbox.indeterminate = true;
            }
        });
    }

    onProductColorCheckboxChange(productId, colorId, checked) {
        // Find all variant IDs for this product-color combination
        const productColor = this.inventoryData.find(pc => 
            pc.product_id == productId && pc.color_id == colorId
        );
        
        if (!productColor) return;

        // Collect all variant IDs from all locations and sizes for this product-color
        const variantIds = new Set();
        Object.values(productColor.locations).forEach(location => {
            location.sizes.forEach(size => {
                if (size.variant_id) {
                    variantIds.add(size.variant_id.toString());
                }
            });
        });

        // Add or remove all variant IDs
        variantIds.forEach(variantId => {
            if (checked) {
                this.selectedItems.add(variantId);
            } else {
                this.selectedItems.delete(variantId);
            }
        });

        // Update any individual size-level checkboxes to match
        variantIds.forEach(variantId => {
            const checkbox = document.querySelector(`.inventory-row-checkbox[data-variant-id="${variantId}"]`);
            if (checkbox) {
                checkbox.checked = checked;
            }
        });

        this.updateSelectedCount();
    }

    showBulkStockMovementModal() {
        if (this.selectedItems.size === 0) {
            this.showNotification('Please select items first', 'warning');
            return;
        }

        document.getElementById('bulkSelectedItems').textContent = `${this.selectedItems.size} items selected`;
        this.populateLocationDropdown('bulkMovementLocation');
        document.getElementById('bulkStockMovementModal').classList.remove('hidden');
    }

    hideBulkStockMovementModal() {
        document.getElementById('bulkStockMovementModal').classList.add('hidden');
    }

    showBulkTransferModal() {
        if (this.selectedItems.size === 0) {
            this.showNotification('Please select items first', 'warning');
            return;
        }

        document.getElementById('bulkTransferSelectedItems').textContent = `${this.selectedItems.size} items selected`;
        this.populateLocationDropdown('bulkFromLocation');
        this.populateLocationDropdown('bulkToLocation');
        document.getElementById('bulkTransferModal').classList.remove('hidden');
    }

    hideBulkTransferModal() {
        document.getElementById('bulkTransferModal').classList.add('hidden');
    }

    showBulkAdjustmentModal() {
        if (this.selectedItems.size === 0) {
            this.showNotification('Please select items first', 'warning');
            return;
        }

        document.getElementById('bulkAdjustSelectedItems').textContent = `${this.selectedItems.size} items selected`;
        this.populateBulkAdjustmentItems();
        document.getElementById('bulkAdjustmentModal').classList.remove('hidden');
    }

    hideBulkAdjustmentModal() {
        document.getElementById('bulkAdjustmentModal').classList.add('hidden');
    }

    populateBulkAdjustmentItems() {
        const tbody = document.getElementById('bulkAdjustmentItems');
        tbody.innerHTML = '';

        this.selectedItems.forEach(variantId => {
            const variant = this.findVariantById(variantId);
            if (variant) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-3 py-2">${variant.product_name} - ${variant.color_name} (${variant.size_name})</td>
                    <td class="px-3 py-2">${variant.total_qty}</td>
                    <td class="px-3 py-2">
                        <input type="number" 
                               class="w-20 px-2 py-1 border rounded text-sm adjustment-qty-input" 
                               data-variant-id="${variantId}"
                               value="${variant.total_qty}" 
                               min="0">
                    </td>
                `;
                tbody.appendChild(row);
            }
        });
    }

    findVariantById(variantId) {
        for (const productColor of this.inventoryData) {
            for (const location of Object.values(productColor.locations)) {
                for (const size of location.sizes) {
                    if (size.variant_id && size.variant_id.toString() === variantId) {
                        return {
                            variant_id: size.variant_id,
                            product_name: productColor.product_name,
                            color_name: productColor.color_name,
                            size_name: size.size_name,
                            total_qty: size.qty_on_hand,
                            locations: [location]
                        };
                    }
                }
            }
        }
        return null;
    }

    async submitBulkStockMovement() {
        const location = document.getElementById('bulkMovementLocation').value;
        const movementType = document.getElementById('bulkMovementType').value;
        const reasonCode = document.getElementById('bulkReasonCode').value;
        const note = document.getElementById('bulkMovementNote').value;
        const pic = document.getElementById('bulkMovementPic').value;

        if (!location || !movementType || !reasonCode) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        try {
            let successCount = 0;
            let errorCount = 0;

            for (const variantId of this.selectedItems) {
                try {
                    const variant = this.findVariantById(variantId);
                    if (!variant) continue;

                    // Use available quantity for stock out movements
                    const qty = movementType === 'OUT' ? Math.min(1, variant.total_qty) : 1;

                    await InventoryAPI.createStockMovement({
                        variant_id: parseInt(variantId),
                        location_id: parseInt(location),
                        movement_type: movementType,
                        reason_code: reasonCode,
                        qty,
                        note: `${note} (Bulk operation)`,
                        pic
                    });

                    successCount++;
                } catch (error) {
                    console.error(`Error creating movement for variant ${variantId}:`, error);
                    errorCount++;
                }
            }

            if (successCount > 0) {
                this.showNotification(`Successfully created ${successCount} stock movements`, 'success');
                this.loadInventoryData();
                this.deselectAll();
                this.hideBulkStockMovementModal();
            }

            if (errorCount > 0) {
                this.showNotification(`${errorCount} movements failed`, 'error');
            }

        } catch (error) {
            console.error('Bulk stock movement error:', error);
            this.showNotification('Failed to create bulk stock movements', 'error');
        }
    }

    async submitBulkTransfer() {
        const fromLocation = document.getElementById('bulkFromLocation').value;
        const toLocation = document.getElementById('bulkToLocation').value;
        const note = document.getElementById('bulkTransferNote').value;
        const pic = document.getElementById('bulkTransferPic').value;

        if (!fromLocation || !toLocation) {
            this.showNotification('Please select both locations', 'error');
            return;
        }

        if (fromLocation === toLocation) {
            this.showNotification('Source and destination locations must be different', 'error');
            return;
        }

        try {
            let successCount = 0;
            let errorCount = 0;

            for (const variantId of this.selectedItems) {
                try {
                    const variant = this.findVariantById(variantId);
                    if (!variant) continue;

                    // Transfer 1 unit by default, or available quantity if less than 1
                    const qty = Math.min(1, variant.total_qty);
                    if (qty <= 0) continue;

                    await InventoryAPI.transferStock({
                        variant_id: parseInt(variantId),
                        from_location_id: parseInt(fromLocation),
                        to_location_id: parseInt(toLocation),
                        qty,
                        note: `${note} (Bulk transfer)`,
                        pic
                    });

                    successCount++;
                } catch (error) {
                    console.error(`Error transferring variant ${variantId}:`, error);
                    errorCount++;
                }
            }

            if (successCount > 0) {
                this.showNotification(`Successfully transferred ${successCount} items`, 'success');
                this.loadInventoryData();
                this.deselectAll();
                this.hideBulkTransferModal();
            }

            if (errorCount > 0) {
                this.showNotification(`${errorCount} transfers failed`, 'error');
            }

        } catch (error) {
            console.error('Bulk transfer error:', error);
            this.showNotification('Failed to perform bulk transfer', 'error');
        }
    }

    async submitBulkAdjustment() {
        const reason = document.getElementById('bulkAdjustReason').value;
        const pic = document.getElementById('bulkAdjustPic').value;
        const note = document.getElementById('bulkAdjustNote').value;

        if (!reason || !pic) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        try {
            let successCount = 0;
            let errorCount = 0;

            const adjustmentInputs = document.querySelectorAll('.adjustment-qty-input');
            
            for (const input of adjustmentInputs) {
                try {
                    const variantId = input.dataset.variantId;
                    const newQty = parseInt(input.value) || 0;
                    const variant = this.findVariantById(variantId);
                    
                    if (!variant) continue;

                    const currentQty = variant.total_qty;
                    const difference = newQty - currentQty;

                    if (difference === 0) continue; // No change needed

                    const movementType = difference > 0 ? 'IN' : 'OUT';
                    const reasonCode = difference > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';

                    await InventoryAPI.createStockMovement({
                        variant_id: parseInt(variantId),
                        location_id: 1, // Default to first location, or get from variant
                        movement_type: movementType,
                        reason_code: reasonCode,
                        qty: Math.abs(difference),
                        note: `${note} (Bulk adjustment: ${currentQty} → ${newQty})`,
                        pic
                    });

                    successCount++;
                } catch (error) {
                    console.error(`Error adjusting variant ${input.dataset.variantId}:`, error);
                    errorCount++;
                }
            }

            if (successCount > 0) {
                this.showNotification(`Successfully adjusted ${successCount} items`, 'success');
                this.loadInventoryData();
                this.deselectAll();
                this.hideBulkAdjustmentModal();
            }

            if (errorCount > 0) {
                this.showNotification(`${errorCount} adjustments failed`, 'error');
            }

        } catch (error) {
            console.error('Bulk adjustment error:', error);
            this.showNotification('Failed to perform bulk adjustment', 'error');
        }
    }

    exportSelectedItems() {
        if (this.selectedItems.size === 0) {
            this.showNotification('Please select items first', 'warning');
            return;
        }

        const selectedData = [];
        
        this.selectedItems.forEach(variantId => {
            const variant = this.findVariantById(variantId);
            if (variant) {
                selectedData.push({
                    'Product Name': variant.product_name,
                    'Color': variant.color_name,
                    'Size': variant.size_name,
                    'Total Quantity': variant.total_qty,
                    'Locations': variant.locations?.map(loc => `${loc.location_name}: ${loc.qty}`).join(', ') || 'N/A'
                });
            }
        });

        // Create CSV content
        const csvContent = this.arrayToCSV(selectedData);
        
        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `selected_inventory_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showNotification(`Exported ${selectedData.length} items to CSV`, 'success');
    }

    arrayToCSV(data) {
        if (!data.length) return '';
        
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        
        for (const row of data) {
            const values = headers.map(header => {
                const value = row[header] || '';
                return `"${value.toString().replace(/"/g, '""')}"`;
            });
            csvRows.push(values.join(','));
        }
        
        return csvRows.join('\n');
    }

    // ===========================
    // HELPER METHODS
    // ===========================

    populateLocationDropdown(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        select.innerHTML = '<option value="">Select Location</option>';
        
        this.locations.forEach(location => {
            const option = document.createElement('option');
            option.value = location.id;
            option.textContent = `${location.name} (${location.code})`;
            select.appendChild(option);
        });
    }

    // ===========================
    // DELETE FUNCTIONALITY
    // ===========================

    deleteItem(variantId) {
        // Select the item and show delete modal
        this.selectedItems.clear();
        this.selectedItems.add(variantId);
        this.showDeleteModal();
    }

    showBulkDeleteModal() {
        if (this.selectedItems.size === 0) {
            this.showNotification('Please select items first', 'warning');
            return;
        }
        this.showDeleteModal();
    }

    showDeleteModal() {
        const selectedCount = this.selectedItems.size;
        const isMultiple = selectedCount > 1;
        
        // Update warning text
        const warningText = isMultiple 
            ? `This action cannot be undone. All stock balances and movement history for the ${selectedCount} selected items will be permanently deleted.`
            : `This action cannot be undone. All stock balances and movement history for this item will be permanently deleted.`;
        
        document.getElementById('deleteWarningText').textContent = warningText;
        
        // Populate items list
        const itemsContent = document.getElementById('deleteItemsContent');
        itemsContent.innerHTML = '';
        
        this.selectedItems.forEach(variantId => {
            const variant = this.findVariantById(variantId);
            if (variant) {
                const li = document.createElement('li');
                li.innerHTML = `
                    <div class="flex items-center justify-between">
                        <span>• ${variant.product_name} - ${variant.color_name} (${variant.size_name})</span>
                        <span class="text-xs text-gray-500">Qty: ${variant.total_qty}</span>
                    </div>
                `;
                itemsContent.appendChild(li);
            }
        });
        
        // Reset checkbox and button state
        document.getElementById('deleteConfirmCheckbox').checked = false;
        document.getElementById('confirmDeleteBtn').disabled = true;
        
        // Show modal
        document.getElementById('deleteConfirmModal').classList.remove('hidden');
    }

    hideDeleteModal() {
        document.getElementById('deleteConfirmModal').classList.add('hidden');
        // Don't clear selectedItems here in case they want to try another bulk action
    }

    async confirmDelete() {
        if (this.selectedItems.size === 0) {
            this.hideDeleteModal();
            return;
        }

        try {
            let successCount = 0;
            let errorCount = 0;
            const itemsToDelete = Array.from(this.selectedItems);

            // Show progress
            const confirmBtn = document.getElementById('confirmDeleteBtn');
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = '<div class="loading-spinner mr-2"></div> Deleting...';

            for (const variantId of itemsToDelete) {
                try {
                    await InventoryAPI.deleteInventoryItem(parseInt(variantId));
                    successCount++;
                } catch (error) {
                    console.error(`Error deleting variant ${variantId}:`, error);
                    errorCount++;
                }
            }

            // Show results
            if (successCount > 0) {
                const message = successCount === 1 
                    ? 'Item deleted successfully' 
                    : `Successfully deleted ${successCount} items`;
                this.showNotification(message, 'success');
                
                // Refresh inventory data
                this.loadInventoryData();
                this.deselectAll();
            }

            if (errorCount > 0) {
                this.showNotification(`Failed to delete ${errorCount} items`, 'error');
            }

            this.hideDeleteModal();

        } catch (error) {
            console.error('Delete operation error:', error);
            this.showNotification('Failed to delete items', 'error');
            
            // Reset button state
            const confirmBtn = document.getElementById('confirmDeleteBtn');
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '🗑️ Delete Items';
        }
    }
}

// Initialize inventory UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.inventoryUI = new InventoryUI();
});