# StationAI – AI-Powered Stationery Item-Finding and Inventory Management System

StationAI is a production-style, full-stack web application designed for stationery shopkeepers to rapidly locate items on physical store shelves, manage stock levels, track batch expirations, record stock transactions, and monitor search accuracy.

---

## 🚀 Key Features

- **Instant Item Finding & Shelf Routing**: Search stationery items by name, brand, category, SKU, or physical shelf location (e.g. `B1`, `A2`, `C3`) with partial term matching.
- **Visual Shelf Locator**: Prominently displays target shelf, row, and column coordinates alongside an interactive 4-shelf map modal (`Shelf A`, `Shelf B`, `Shelf C`, `Shelf D`).
- **Voice Search Integration**: Web Speech API voice search allowing shopkeepers to speak product names directly into the search bar.
- **Out of Stock & Suggested Alternatives**: When a searched item is out of stock, StationAI automatically highlights available in-stock alternatives from the same category or related shelves.
- **Real-Time Dynamic Dashboard**: Displays live counts for Total Products, Available Items, Low Stock, Out of Stock, Expiring Batches, Search Accuracy Feedback, Recent Searches, and Stock Activity.
- **Comprehensive Stock Management**:
  - **Stock In**: Increase inventory quantities with transaction logs.
  - **Stock Out**: Deduct sold items and enforce non-negative stock limits.
  - **Stock Adjust**: Correct stock discrepancies with mandatory audit logs.
  - **Batch & Expiry Management**: FEFO (First Expired First Out) stock deduction with safe/expiring soon/critical/expired statuses.
- **Real Authentication & Role Authorization**:
  - Encrypted password storage using `bcryptjs`.
  - JWT Bearer Token session handling with protected routes.
  - Role support: `ADMIN` / `SHOPKEEPER` (full CRUD & inventory control) vs `STAFF` (read-only sensitive actions).
- **Search History & Accuracy Feedback**: Every query is logged in the `search_history` database table; shopkeeper helpfulness ratings calculate real accuracy metrics in the `feedback` table.
- **Notifications System**: Automatically dispatches low-stock and expiry notifications to the header bell drawer.

---

## 🛠 Technology Stack

- **Frontend**: React 19, JavaScript (ES6+), React Router v7, Lucide React Icons, Vanilla CSS Design System, Vite 8.
- **Backend**: Node.js v24, Express.js REST API, JSON Web Tokens (`jsonwebtoken`), `bcryptjs`.
- **Database**: Relational Database supporting **PostgreSQL / Supabase** with automatic zero-config **SQLite** fallback (`server/database/stationai.db`).

---

## 📁 Project Folder Structure

```
ai-im/
├── server/
│   ├── config/             # Config & dotenv loader
│   ├── controllers/        # REST API Controllers (auth, products, inventory, etc.)
│   ├── database/           # db.js, schema.sql DDL, seed.js script
│   ├── middleware/         # auth.js JWT & role verification
│   ├── routes/             # Express API routes
│   ├── test_api.js         # End-to-end API test suite
│   ├── server.js           # Express app entrypoint
│   └── package.json        # Backend dependencies
├── client/
│   ├── public/             # Static public assets
│   ├── src/
│   │   ├── components/     # Layout, ProductCard, ProductModal, ShelfMapModal, LoadStockModal
│   │   ├── context/        # AuthContext.jsx & StockContext.jsx
│   │   ├── pages/          # Dashboard, FindItem, Inventory, ExpiryAlerts, Architecture, Settings, Profile
│   │   ├── services/       # api.js Centralized HTTP REST Client
│   │   ├── App.jsx         # App router & provider setup
│   │   ├── main.jsx        # React DOM mount point
│   │   └── index.css       # Full CSS design system & responsive styling
│   ├── vite.config.js      # Vite configuration & backend proxy setup
│   └── package.json        # Frontend dependencies
├── .env                    # Environment variables file
├── .env.example            # Environment variables template
├── package.json            # Root project orchestration scripts
└── README.md               # Documentation
```

---

## 🗄 Database Schema

The database consists of 8 relational tables with foreign keys and indexes:

1. **`users`**: `id`, `name`, `email` (UNIQUE), `password` (HASHED), `role` (`ADMIN` | `STAFF`), `shop_name`, `phone`, `created_at`, `updated_at`
2. **`products`**: `id`, `sku` (UNIQUE), `name`, `description`, `category`, `brand`, `price`, `image_url`, `unit`, `expiry_tracking`, `created_at`, `updated_at`
3. **`inventory`**: `id`, `product_id` (FK), `quantity`, `reorder_level`, `shelf_location`, `shelf_row`, `shelf_column`, `supplier`, `updated_at`
4. **`batches`**: `id`, `product_id` (FK), `batch_number`, `quantity_loaded`, `current_quantity`, `loaded_date`, `expiry_date`, `supplier`, `shelf_location`, `shelf_row`, `shelf_column`, `created_at`, `updated_at`
5. **`stock_transactions`**: `id`, `product_id` (FK), `transaction_type` (`STOCK_IN` | `STOCK_OUT` | `ADJUSTMENT` | `RETURN`), `quantity`, `previous_quantity`, `new_quantity`, `reason`, `user_id` (FK), `created_at`
6. **`search_history`**: `id`, `user_id` (FK), `search_query`, `product_id` (FK), `result_count`, `result_status`, `shelf_location`, `created_at`
7. **`feedback`**: `id`, `user_id` (FK), `product_id` (FK), `search_query`, `helpful`, `issue_type`, `comment`, `created_at`
8. **`notifications`**: `id`, `user_id` (FK), `type`, `title`, `message`, `related_product_id` (FK), `is_read`, `created_at`
9. **`settings`**: `id`, `shop_name`, `low_stock_threshold`, `currency`, `notify_low_stock`, `notify_expiry`, `expiry_warning_days`

---

## ⚙️ Environment Variables

Create `.env` in the root directory:

```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=*
JWT_SECRET=stationai_super_secret_jwt_key_2026_prod

# Optional: PostgreSQL / Supabase connection string (Leave blank for automatic SQLite)
DATABASE_URL=

VITE_API_URL=/api
```

---

## ⚡ Quick Start & Run Commands

### 1. Install Dependencies
```bash
# Install root, backend and frontend dependencies
npm run install-all  # or cd server && npm install & cd client && npm install
```

### 2. Seed Database
```bash
npm run seed
```

### 3. Start Backend REST API Server
```bash
npm run server   # Starts Express server on http://localhost:5000
```

### 4. Start Frontend Client Development Server
```bash
npm run client   # Starts Vite dev server on http://localhost:5173
```

---

## 🔑 Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Shopkeeper Admin** | `admin@stationai.shop` | `admin123` |
| **Store Staff** | `staff@stationai.shop` | `staff123` |

---

## 📡 Key REST API Endpoints

- **Auth**:
  - `POST /api/auth/login` - User login & JWT issuance
  - `POST /api/auth/register` - New user registration
  - `GET /api/auth/me` - Fetch authenticated user profile
  - `PUT /api/auth/profile` - Update user details
- **Products**:
  - `GET /api/products` - List all products with inventory & batch info
  - `POST /api/products` - Create new product (Admin only)
  - `PUT /api/products/:id` - Update product details (Admin only)
  - `DELETE /api/products/:id` - Delete product (Admin only)
- **Inventory**:
  - `PUT /api/inventory/:productId` - Update stock level & log transaction
  - `POST /api/inventory/stock-in` - Receive new stock shipment
  - `POST /api/inventory/stock-out` - Deduct sold stock
  - `GET /api/inventory/transactions` - Fetch stock transaction history
- **Search & Expiry**:
  - `GET /api/search?q=:query` - Search products and log history
  - `GET /api/search/history` - Fetch recent search history
  - `DELETE /api/search/history` - Clear search history
  - `GET /api/expiry` - Fetch batch expiry alerts & statistics
  - `POST /api/expiry/batch/:productId` - Load new batch
- **Dashboard & Feedback**:
  - `GET /api/dashboard/stats` - Fetch real-time dashboard metrics
  - `POST /api/feedback` - Submit search accuracy rating & comments
  - `GET /api/notifications` - Fetch notification drawer alerts

---

## 🧪 Verification & Testing

Run the automated backend test suite:
```bash
cd server
node test_api.js
```

Build the production frontend bundle:
```bash
cd client
npm run build
```

---

## 🚀 Deployment Instructions

- **Frontend**: Deploy `client` to Vercel or Netlify. Set environment variable `VITE_API_URL` to your production API URL.
- **Backend**: Deploy `server` to Render, Railway, or Heroku. Set `DATABASE_URL` (Supabase / Neon PostgreSQL) and `JWT_SECRET`.
