/**
 * Inventory API Module
 * Handles all API calls for inventory management
 */

const InventoryAPI = {
    baseURL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:3001/api' 
        : '/api',

    /**
     * Get inventory tree
     */
    async getInventoryTree(filters = {}) {
        try {
            const params = new URLSearchParams();
            
            if (filters.productId) params.append('product_id', filters.productId);
            if (filters.colorId) params.append('color_id', filters.colorId);
            if (filters.locationId) params.append('location_id', filters.locationId);
            if (filters.q) params.append('q', filters.q);
            if (filters.onlyAvailable) params.append('only_available', 'true');

            const response = await fetch(`${this.baseURL}/inventory/tree?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return result;

        } catch (error) {
            console.error('Error getting inventory tree:', error);
            throw error;
        }
    },

    /**
     * Get inventory statistics
     */
    async getInventoryStats() {
        try {
            const response = await fetch(`${this.baseURL}/inventory/stats`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return result.data;

        } catch (error) {
            console.error('Error getting inventory stats:', error);
            throw error;
        }
    },

    /**
     * Get all locations
     */
    async getLocations() {
        try {
            const response = await fetch(`${this.baseURL}/inventory/locations`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return result.data;

        } catch (error) {
            console.error('Error getting locations:', error);
            throw error;
        }
    },

    /**
     * Search variants
     */
    async searchVariants(query, limit = 20) {
        try {
            const params = new URLSearchParams();
            if (query) params.append('q', query);
            if (limit) params.append('limit', limit);

            const response = await fetch(`${this.baseURL}/inventory/variants/search?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return result.data;

        } catch (error) {
            console.error('Error searching variants:', error);
            throw error;
        }
    },

    /**
     * Get stock card
     */
    async getStockCard(params) {
        try {
            const urlParams = new URLSearchParams();
            
            if (params.productId) urlParams.append('product_id', params.productId);
            if (params.colorId) urlParams.append('color_id', params.colorId);
            if (params.sizeId) urlParams.append('size_id', params.sizeId);
            if (params.locationId) urlParams.append('location_id', params.locationId);
            if (params.fromDate) urlParams.append('from', params.fromDate);
            if (params.toDate) urlParams.append('to', params.toDate);
            if (params.limit) urlParams.append('limit', params.limit);

            const response = await fetch(`${this.baseURL}/stock/card?${urlParams}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return result.data;

        } catch (error) {
            console.error('Error getting stock card:', error);
            throw error;
        }
    },

    /**
     * Create stock movement
     */
    async createMovement(data) {
        try {
            const response = await fetch(`${this.baseURL}/stock/movements`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return result.data;

        } catch (error) {
            console.error('Error creating stock movement:', error);
            throw error;
        }
    },

    /**
     * Transfer stock between locations
     */
    async transferStock(data) {
        try {
            const response = await fetch(`${this.baseURL}/stock/transfer`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return result.data;

        } catch (error) {
            console.error('Error transferring stock:', error);
            throw error;
        }
    },

    /**
     * Start stock opname
     */
    async startOpname(data) {
        try {
            const response = await fetch(`${this.baseURL}/stock/opname/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return result.data;

        } catch (error) {
            console.error('Error starting stock opname:', error);
            throw error;
        }
    },

    /**
     * Get stock opname list
     */
    async getOpnameList(filters = {}) {
        try {
            const params = new URLSearchParams();
            
            if (filters.status) params.append('status', filters.status);
            if (filters.locationId) params.append('location_id', filters.locationId);
            if (filters.limit) params.append('limit', filters.limit);

            const response = await fetch(`${this.baseURL}/stock/opname?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return result.data;

        } catch (error) {
            console.error('Error getting opname list:', error);
            throw error;
        }
    },

    /**
     * Get opname details
     */
    async getOpnameDetails(opnameId) {
        try {
            const response = await fetch(`${this.baseURL}/stock/opname/${opnameId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return result.data;

        } catch (error) {
            console.error('Error getting opname details:', error);
            throw error;
        }
    },

    /**
     * Update opname count
     */
    async updateOpnameCount(opnameId, data) {
        try {
            const response = await fetch(`${this.baseURL}/stock/opname/${opnameId}/count`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return result.data;

        } catch (error) {
            console.error('Error updating opname count:', error);
            throw error;
        }
    },

    /**
     * Commit opname
     */
    async commitOpname(opnameId, data) {
        try {
            const response = await fetch(`${this.baseURL}/stock/opname/${opnameId}/commit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return result.data;

        } catch (error) {
            console.error('Error committing opname:', error);
            throw error;
        }
    },

    /**
     * Get stock movements
     */
    async getMovements(filters = {}) {
        try {
            const params = new URLSearchParams();
            
            if (filters.variantId) params.append('variant_id', filters.variantId);
            if (filters.locationId) params.append('location_id', filters.locationId);
            if (filters.fromDate) params.append('from_date', filters.fromDate);
            if (filters.toDate) params.append('to_date', filters.toDate);
            if (filters.movementType) params.append('movement_type', filters.movementType);
            if (filters.reasonCode) params.append('reason_code', filters.reasonCode);
            if (filters.limit) params.append('limit', filters.limit);

            const response = await fetch(`${this.baseURL}/stock/movements?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return result.data;

        } catch (error) {
            console.error('Error getting stock movements:', error);
            throw error;
        }
    },

    /**
     * Import stock data from CSV file
     */
    async importCsvStock(file, importMode = 'add') {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('mode', importMode);

            const response = await fetch(`${this.baseURL}/stock/import-csv`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'CSV import failed');
            }

            return result;

        } catch (error) {
            console.error('Error importing CSV stock:', error);
            throw error;
        }
    },

    /**
     * Delete inventory item (variant)
     */
    async deleteInventoryItem(variantId) {
        try {
            const response = await fetch(`${this.baseURL}/inventory/variant/${variantId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Failed to delete inventory item');
            }

            return result;

        } catch (error) {
            console.error('Error deleting inventory item:', error);
            throw error;
        }
    },

    /**
     * Create stock movement
     */
    async createStockMovement(data) {
        try {
            const response = await fetch(`${this.baseURL}/stock/movements`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Failed to create stock movement');
            }

            return result;

        } catch (error) {
            console.error('Error creating stock movement:', error);
            throw error;
        }
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.InventoryAPI = InventoryAPI;
}