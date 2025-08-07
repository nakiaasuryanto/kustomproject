# Kustomproject - Transaction Dashboard

A fullstack transaction dashboard for internal sales tracking with real-time updates.

## Features

- **Form Input (Left Side):**
  - Date picker
  - Product dropdown (Kaos Anak, Kaos Dewasa, Kaos PJG)
  - Promo Type dropdown (B1G1, Free, Bulk, No Promo)
  - Quantity input
  - Price per piece input
  - Payment Method dropdown (CASH, TF)
  - PIC Sales dropdown (Ayu, Lili, Nadira)
  - Optional free item field

- **Live Calculations:**
  - Total = Quantity × Price per pcs
  - Fee = 20% of Total
  - Real-time calculation display

- **Transaction List (Right Side):**
  - Real-time transaction updates
  - Displays all transaction details
  - Scrollable list with responsive design

## Tech Stack

### Frontend
- React 18
- TailwindCSS
- Zustand (State Management)
- Axios (API calls)

### Backend
- Node.js + Express
- MySQL
- REST API

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MySQL/MariaDB

### Database Setup

1. Create a MySQL database:
```sql
CREATE DATABASE kustomproject;
```

2. Import the database schema:
```bash
mysql -u username -p kustomproject < server/database.sql
```

### Backend Setup

1. Navigate to server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Update `.env` with your database credentials:
```
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=kustomproject
DB_PORT=3306
PORT=5000
```

5. Start the server:
```bash
npm run dev
```

Server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

Frontend will run on `http://localhost:3000`

## API Endpoints

- `GET /api/transactions` - Get all transactions
- `POST /api/transactions` - Create new transaction

## Database Schema

```sql
CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    product VARCHAR(100) NOT NULL,
    promo_type VARCHAR(50) NOT NULL,
    quantity INT NOT NULL,
    price_per_pcs INT NOT NULL,
    total INT NOT NULL,
    fee INT NOT NULL,
    payment_method VARCHAR(10) NOT NULL,
    pic_sales VARCHAR(50) NOT NULL,
    free_item TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Project Structure

```
/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API service
│   │   ├── store/          # Zustand store
│   │   └── ...
│   └── package.json
├── server/                 # Node.js backend
│   ├── server.js          # Main server file
│   ├── db.js              # Database connection
│   ├── database.sql       # Database schema
│   └── package.json
└── README.md
```

## Usage

1. Start both backend and frontend servers
2. Open `http://localhost:3000` in your browser
3. Fill out the transaction form on the left
4. See live calculations for Total and Fee
5. Submit the form to add a transaction
6. View real-time updates in the transaction list on the right