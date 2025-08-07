
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Import routes
const transactionsRouter = require('./routes/transactions');
const productsRouter = require('./routes/products');

app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static('../'));

// Root endpoint
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

// Use routes
app.use('/api/transactions', transactionsRouter);
app.use('/api/products', productsRouter);

// Test database connection on startup
db.execute('SELECT 1')
    .then(() => {
        console.log('✅ Database connected successfully');
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📡 API available at http://localhost:${PORT}/api`);
        });
    })
    .catch((error) => {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
    });
