# Kustomproject Finance Management System

A comprehensive fullstack finance and inventory management system for tracking sales, expenses, gifts, and stock movements with real-time analytics.

## 🚀 Features

### 💰 Transaction Management
- **Sales Transactions:** Multi-promo support (No Promo, B1G1, Bundling, Family, Random)
- **Expense Tracking:** Categorized expenses with detailed records
- **Gift Management:** Stock-out tracking for promotional items
- **Multi-item Support:** Handle multiple products per transaction
- **Payment Methods:** CASH, Bank Transfer (Mandiri)
- **PIC Assignment:** Track sales performance by staff

### 📊 Analytics Dashboard
- **Real-time Charts:** Daily trends, product distribution, PIC performance
- **Financial Summary:** Total sales, expenses, cash flow by payment method
- **Commission Tracking:** 20% commission calculation for sales staff
- **Monthly Filtering:** All charts support period-based analysis
- **Password Protection:** Secure dashboard access

### 📦 Inventory & Stock Management
- **Multi-level Variants:** Product → Color → Size (SKU level)
- **Location Management:** Multiple storage locations (Display, Lemari, etc.)
- **Stock Movements:** Comprehensive IN/OUT tracking with reasons
- **Stock Cards:** Complete movement history per variant/location
- **Physical Counts:** Stock opname (physical inventory) sessions
- **Transfer Management:** Move stock between locations
- **Real-time Balances:** Live stock levels with moving average costs

### 📈 Business Intelligence  
- **Hierarchical Inventory View:** Product+Color → Locations → Sizes
- **Stock Alerts:** Out-of-stock and low-stock notifications
- **Movement Audit Trail:** Full traceability of all stock changes
- **Excel Export:** Transaction and stock card exports
- **Search & Filtering:** Advanced filtering across all modules

## 🛠️ Tech Stack

### Frontend
- **HTML/CSS/JavaScript:** Vanilla JS with modern ES6+ features  
- **TailwindCSS:** Utility-first styling framework
- **Chart.js:** Interactive charts and data visualization
- **XLSX.js:** Excel export functionality

### Backend
- **Node.js + Express.js:** RESTful API server
- **MySQL:** Local development database
- **Supabase (PostgreSQL):** Production cloud database
- **Services Architecture:** Modular business logic separation

### Database Design
- **Dual Database Setup:** MySQL for local, Supabase for production
- **Variant Model:** product → product_colors → product_color_sizes (SKU)
- **Audit Trail:** Append-only stock movements with cached balances
- **JSONB Storage:** Complex transaction data with multiple items

## ⚙️ Setup Instructions

### Prerequisites
- **Node.js** (v16 or higher)
- **MySQL/MariaDB** (for local development)
- **Supabase Account** (for production)

### 🗄️ Database Setup

#### Local MySQL Setup
1. Create a MySQL database:
```sql
CREATE DATABASE kustomproject_finance;
```

2. Run inventory migrations:
```bash
# Core tables (if not already created)
mysql -u username -p kustomproject_finance < server/database.sql

# Inventory & stock tables
mysql -u username -p kustomproject_finance < server/mysql/2025_08_inventory.sql
```

#### Supabase Setup (Production)
1. Create a new Supabase project
2. Run the Supabase migration:
```sql
-- Copy and execute the contents of:
-- server/supabase/2025_08_inventory.sql
```
3. Update your Supabase credentials in `supabase-config.js`

### 🚀 Backend Setup

1. Navigate to server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Update `.env` with your database credentials:
```env
# MySQL (Local Development)
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=kustomproject_finance
DB_PORT=3306
PORT=3001

# Stock Management Settings
ALLOW_NEGATIVE=false
DEFAULT_LOCATION=DISPLAY
```

5. Start the server:
```bash
npm start
# or for development
npm run dev
```

Server will run on `http://localhost:3001`

### 🌐 Frontend Setup

**No separate frontend build required!** The system uses vanilla HTML/JS served directly by the Express server.

1. Open your browser and navigate to:
   - **Main App:** `http://localhost:3001`
   - **Dashboard:** `http://localhost:3001/dashboard.html` (Password: `Nakiacantik`)  
   - **Inventory:** `http://localhost:3001/inventory.html`
   - **Transactions:** `http://localhost:3001/transactions.html`

## 🔌 API Endpoints

### Transaction Management
- `GET /api/transactions` - Get all transactions with filtering
- `POST /api/transactions` - Create legacy transaction
- `POST /api/transactions/create` - Create enhanced transaction with stock integration
- `DELETE /api/transactions/clear-all` - Clear all transactions

### Product Management  
- `GET /api/products` - Get all products
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Inventory Management
- `GET /api/inventory/tree` - Get hierarchical inventory view
- `GET /api/inventory/stats` - Get inventory statistics  
- `GET /api/inventory/locations` - Get all storage locations
- `POST /api/inventory/locations` - Create new location
- `GET /api/inventory/variants/search` - Search product variants

### Stock Management
- `GET /api/stock/card` - Get stock card (movement history)
- `GET /api/stock/movements` - Get stock movements with filtering
- `POST /api/stock/movements` - Create stock movement
- `POST /api/stock/transfer` - Transfer stock between locations

### Stock Opname (Physical Count)
- `GET /api/stock/opname` - Get opname sessions list
- `POST /api/stock/opname/start` - Start new opname session
- `GET /api/stock/opname/:id` - Get opname details
- `PUT /api/stock/opname/:id/count` - Update physical count
- `POST /api/stock/opname/:id/commit` - Commit opname and generate adjustments

📋 **Complete API documentation:** See `api-docs/inventory-api.http` for detailed examples and request/response formats.

## 🗂️ Database Schema

### Core Tables
- **`products`** - Product catalog with multi-tier pricing
- **`colors`** - Color master data with hex codes  
- **`sizes`** - Size master data with sort order
- **`locations`** - Storage locations (Display, Lemari, etc.)

### Variant Hierarchy  
- **`product_colors`** - Product-Color combinations
- **`product_color_sizes`** - Final SKU level (Product+Color+Size)

### Transaction System
- **`transactions`** - Enhanced transactions with JSONB items storage
  - Supports: Sales, Expenses, Gifts
  - Multi-item transactions with free items
  - Payment method and PIC tracking

### Inventory & Stock Management
- **`stock_movements`** - Append-only ledger of all stock changes
  - Movement types: IN, OUT
  - Reason codes: SALES_OUT, GIFT_OUT, ADJUSTMENT_IN/OUT, TRANSFER_IN/OUT, etc.
  - Full audit trail with references and notes

- **`stock_balances`** - Real-time cached balances per variant per location
  - Quantity on hand and moving average cost
  - Updated automatically via triggers

### Stock Opname (Physical Inventory)
- **`stock_opname`** - Physical count sessions  
- **`stock_opname_items`** - Individual count records with variances

### Key Relationships
```sql
products (1) → (M) product_colors (1) → (M) product_color_sizes
                                              ↓
stock_balances ← (1:M) locations         (M:1) stock_movements
```

## 📁 Project Structure

```
kuspro-finance/
├── 🌐 Frontend (Vanilla JS + TailwindCSS)
│   ├── index.html              # Main transaction interface
│   ├── dashboard.html          # Analytics dashboard  
│   ├── inventory.html          # Inventory management
│   ├── transactions.html       # Transaction history
│   ├── supabase-config.js      # Database API functions
│   └── js/
│       ├── inventoryApi.js     # Inventory API client
│       └── inventoryUI.js      # Inventory UI logic
│
├── 🗄️ Backend (Node.js + Express)
│   ├── server.js               # Main server file
│   ├── db.js                   # MySQL connection pool
│   ├── package.json            # Dependencies
│   ├── routes/
│   │   ├── transactions.js     # Transaction endpoints
│   │   ├── products.js         # Product endpoints
│   │   ├── inventory.js        # Inventory endpoints  
│   │   └── stock.js           # Stock movement endpoints
│   ├── services/
│   │   ├── movementService.js  # Stock movement business logic
│   │   └── inventoryService.js # Inventory business logic  
│   ├── mysql/
│   │   └── 2025_08_inventory.sql # MySQL inventory migration
│   └── supabase/
│       └── 2025_08_inventory.sql # Supabase inventory migration
│
├── 📚 Documentation
│   ├── api-docs/
│   │   └── inventory-api.http  # API testing collection
│   └── README.md              # This file
│
└── 📄 Database Schemas
    ├── supabase-schema*.sql   # Supabase schemas
    └── server/database.sql    # Core MySQL schema
```

## 🎯 Usage Guide

### 💼 Basic Workflow
1. **Start the server:** `npm start` in `/server` directory
2. **Access the application:**
   - Transaction Entry: `http://localhost:3001`  
   - Analytics Dashboard: `http://localhost:3001/dashboard.html`
   - Inventory Management: `http://localhost:3001/inventory.html`

### 💰 Transaction Management
1. **Sales:** Select products, colors, sizes, quantities → Auto-calculate totals
2. **Expenses:** Choose category, enter description and amount  
3. **Gifts:** Track promotional items without money flow
4. **Multi-item Support:** Add multiple products per transaction
5. **Real-time Updates:** See transactions appear instantly in dashboard

### 📦 Inventory Operations
1. **View Stock:** Hierarchical view: Product+Color → Locations → Sizes
2. **Stock Movements:** IN (production, returns) / OUT (sales, adjustments)  
3. **Transfers:** Move stock between Display and Storage locations
4. **Stock Cards:** Complete movement history per item/location
5. **Physical Counts:** Stock opname sessions with variance tracking

### 📊 Analytics & Reporting
1. **Dashboard Access:** Password: `Nakiacantik`
2. **Financial Overview:** Sales, expenses, cash flow by payment method
3. **PIC Performance:** Individual sales tracking with 20% commission
4. **Inventory Analytics:** Stock levels, movement patterns, alerts  
5. **Excel Export:** Transaction history and stock cards

### 🔧 Advanced Features
- **Search & Filter:** Advanced filtering across all modules
- **Bulk Operations:** Multiple stock movements and adjustments
- **Audit Trail:** Complete traceability of all changes
- **Multi-location:** Support for multiple storage locations
- **Cost Tracking:** Moving average cost calculation

---

## 🤝 Support & Contributing

For questions or support, please refer to the API documentation in `api-docs/inventory-api.http` or review the source code structure above.

**Built for Kustomproject** - A complete finance and inventory management solution.