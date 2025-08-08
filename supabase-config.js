// Supabase Configuration for Kustomproject Finance Management System

// Replace these with your actual Supabase project credentials
const SUPABASE_URL = 'https://forgfekdtgwcejthjhcz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvcmdmZWtkdGd3Y2VqdGhqaGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2MTk3NjUsImV4cCI6MjA3MDE5NTc2NX0.-GrttEsBJYpl6_CVE8zTtNuTKFsr5YjzVwEhTCd5j4w';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// API Functions for Products
async function getProducts() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('name');
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching products:', error);
        return [];
    }
}

async function getProductById(id) {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching product:', error);
        return null;
    }
}

// API Functions for Colors
async function getColors() {
    try {
        const { data, error } = await supabase
            .from('colors')
            .select('*')
            .order('name');
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching colors:', error);
        return [];
    }
}

// API Functions for Sizes
async function getSizes() {
    try {
        const { data, error } = await supabase
            .from('sizes')
            .select('*')
            .order('sort_order');
            
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching sizes:', error);
        return [];
    }
}

// API Functions for Transactions
async function getTransactions(filters = {}) {
    try {
        let query = supabase
            .from('transactions')
            .select('*')
            .order('created_at', { ascending: false });
            
        // Apply filters if provided
        if (filters.type) {
            query = query.eq('type', filters.type);
        }
        if (filters.startDate) {
            query = query.gte('date', filters.startDate);
        }
        if (filters.endDate) {
            query = query.lte('date', filters.endDate);
        }
        if (filters.pic) {
            query = query.or(`pic_sales.eq.${filters.pic},pic.eq.${filters.pic}`);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }
}

async function createTransaction(transactionData) {
    try {
        // Ensure free_items is an array, or null if empty
        if (transactionData.free_items && transactionData.free_items.length === 0) {
            transactionData.free_items = null;
        }

        const { data, error } = await supabase
            .from('transactions')
            .insert([transactionData])
            .select()
            .single();
            
        if (error) {
            console.error('Supabase error:', error);
            throw error;
        }
        return data;
    } catch (error) {
        console.error('Error creating transaction:', error);
        throw error;
    }
}

async function deleteAllTransactions() {
    try {
        const { error } = await supabase
            .from('transactions')
            .delete()
            .neq('id', 0); // Delete all records
            
        if (error) throw error;
        return { message: 'All transactions cleared successfully' };
    } catch (error) {
        console.error('Error clearing transactions:', error);
        throw error;
    }
}

// Utility function to get price based on promo type
function getProductPrice(product, promoType) {
    const priceMap = {
        'No Promo': product.price_no_promo,
        'B1G1': product.price_b1g1,
        'Bundling': product.price_bundling,
        'Family': product.price_family_set,
        'Random': product.price_random_set
    };
    
    return priceMap[promoType] || product.price_no_promo;
}