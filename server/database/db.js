import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Pool } = pkg;
import { config } from '../config/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance = null;
let pgPool = null;
let pgInitialized = false;

const PG_SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'STAFF',
  shop_name TEXT DEFAULT 'StationAI Central Mart',
  phone TEXT DEFAULT '+91 98765 43210',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  brand TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0.0,
  image_url TEXT,
  unit TEXT DEFAULT 'piece',
  expiry_tracking BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  product_id INTEGER UNIQUE NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 5,
  shelf TEXT NOT NULL DEFAULT 'B',
  row_number INTEGER NOT NULL DEFAULT 1,
  column_number INTEGER NOT NULL DEFAULT 1,
  location_code TEXT NOT NULL DEFAULT 'B-01-01',
  shelf_location TEXT NOT NULL DEFAULT 'B-01-01',
  shelf_row TEXT NOT NULL DEFAULT 'Row 1',
  shelf_column TEXT NOT NULL DEFAULT '01',
  supplier TEXT DEFAULT 'General Supplier',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS batches (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  batch_number TEXT NOT NULL,
  quantity_loaded INTEGER NOT NULL DEFAULT 0,
  current_quantity INTEGER NOT NULL DEFAULT 0,
  loaded_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE NOT NULL,
  supplier TEXT DEFAULT 'General Supplier',
  shelf TEXT DEFAULT 'B',
  row_number INTEGER DEFAULT 1,
  column_number INTEGER DEFAULT 1,
  location_code TEXT DEFAULT 'B-01-01',
  shelf_location TEXT DEFAULT 'B-01-01',
  shelf_row TEXT DEFAULT 'Row 1',
  shelf_column TEXT DEFAULT '01',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_transactions (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reason TEXT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS search_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  search_query TEXT NOT NULL,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  result_count INTEGER DEFAULT 0,
  result_status TEXT DEFAULT 'No Matches',
  shelf_location TEXT DEFAULT '—',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feedback (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  search_query TEXT,
  helpful BOOLEAN NOT NULL,
  issue_type TEXT,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY,
  shop_name TEXT DEFAULT 'StationAI Central Mart',
  store_type TEXT DEFAULT 'General Store',
  low_stock_threshold INTEGER DEFAULT 10,
  currency TEXT DEFAULT '₹',
  notify_low_stock BOOLEAN DEFAULT TRUE,
  notify_expiry BOOLEAN DEFAULT TRUE,
  expiry_warning_days INTEGER DEFAULT 30,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  description TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bills (
  id SERIAL PRIMARY KEY,
  billing_id TEXT UNIQUE NOT NULL,
  subtotal NUMERIC NOT NULL DEFAULT 0.0,
  discount NUMERIC NOT NULL DEFAULT 0.0,
  tax NUMERIC NOT NULL DEFAULT 0.0,
  grand_total NUMERIC NOT NULL DEFAULT 0.0,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  status TEXT NOT NULL DEFAULT 'Completed',
  customer_name TEXT DEFAULT 'Walk-in Customer',
  customer_phone TEXT DEFAULT '',
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bill_items (
  id SERIAL PRIMARY KEY,
  bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  sku TEXT,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  returned_quantity INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  reference_id TEXT,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

const SQLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'STAFF',
  shop_name TEXT DEFAULT 'StationAI Demo Store',
  phone TEXT DEFAULT '+91 98765 43210',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  brand TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0.0,
  image_url TEXT,
  unit TEXT DEFAULT 'piece',
  expiry_tracking BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER UNIQUE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 5,
  shelf TEXT NOT NULL DEFAULT 'B',
  row_number INTEGER NOT NULL DEFAULT 1,
  column_number INTEGER NOT NULL DEFAULT 1,
  location_code TEXT NOT NULL DEFAULT 'B-01-01',
  shelf_location TEXT NOT NULL DEFAULT 'B-01-01',
  shelf_row TEXT NOT NULL DEFAULT 'Row 1',
  shelf_column TEXT NOT NULL DEFAULT '01',
  supplier TEXT DEFAULT 'General Supplier',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  batch_number TEXT NOT NULL,
  quantity_loaded INTEGER NOT NULL DEFAULT 0,
  current_quantity INTEGER NOT NULL DEFAULT 0,
  loaded_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE NOT NULL,
  supplier TEXT DEFAULT 'General Supplier',
  shelf TEXT DEFAULT 'B',
  row_number INTEGER DEFAULT 1,
  column_number INTEGER DEFAULT 1,
  location_code TEXT DEFAULT 'B-01-01',
  shelf_location TEXT DEFAULT 'B-01-01',
  shelf_row TEXT DEFAULT 'Row 1',
  shelf_column TEXT DEFAULT '01',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stock_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reason TEXT,
  user_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS search_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  search_query TEXT NOT NULL,
  product_id INTEGER,
  result_count INTEGER DEFAULT 0,
  result_status TEXT DEFAULT 'No Matches',
  shelf_location TEXT DEFAULT '—',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  product_id INTEGER,
  search_query TEXT,
  helpful BOOLEAN NOT NULL,
  issue_type TEXT,
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_product_id INTEGER,
  is_read BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (related_product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_name TEXT DEFAULT 'StationAI Central Mart',
  store_type TEXT DEFAULT 'General Store',
  low_stock_threshold INTEGER DEFAULT 10,
  currency TEXT DEFAULT '₹',
  notify_low_stock BOOLEAN DEFAULT 1,
  notify_expiry BOOLEAN DEFAULT 1,
  expiry_warning_days INTEGER DEFAULT 30,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  activity_type TEXT NOT NULL,
  product_id INTEGER,
  product_name TEXT NOT NULL,
  description TEXT NOT NULL,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  billing_id TEXT UNIQUE NOT NULL,
  subtotal REAL NOT NULL DEFAULT 0.0,
  discount REAL NOT NULL DEFAULT 0.0,
  tax REAL NOT NULL DEFAULT 0.0,
  grand_total REAL NOT NULL DEFAULT 0.0,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  status TEXT NOT NULL DEFAULT 'Completed',
  customer_name TEXT DEFAULT 'Walk-in Customer',
  customer_phone TEXT DEFAULT '',
  user_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS bill_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_id INTEGER NOT NULL,
  product_id INTEGER,
  product_name TEXT NOT NULL,
  sku TEXT,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL,
  returned_quantity INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  movement_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  reference_id TEXT,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  user_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
`;

async function runColumnMigrations(db, isPostgres = false) {
  try {
    if (isPostgres) {
      await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS shelf TEXT DEFAULT 'B'`);
      await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS row_number INTEGER DEFAULT 1`);
      await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS column_number INTEGER DEFAULT 1`);
      await db.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS location_code TEXT DEFAULT 'B-01-01'`);
      await db.query(`ALTER TABLE batches ADD COLUMN IF NOT EXISTS shelf TEXT DEFAULT 'B'`);
      await db.query(`ALTER TABLE batches ADD COLUMN IF NOT EXISTS row_number INTEGER DEFAULT 1`);
      await db.query(`ALTER TABLE batches ADD COLUMN IF NOT EXISTS column_number INTEGER DEFAULT 1`);
      await db.query(`ALTER TABLE batches ADD COLUMN IF NOT EXISTS location_code TEXT DEFAULT 'B-01-01'`);
      await db.query(`CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        activity_type TEXT NOT NULL,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        product_name TEXT NOT NULL,
        description TEXT NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
      await db.query(`CREATE TABLE IF NOT EXISTS bills (
        id SERIAL PRIMARY KEY,
        billing_id TEXT UNIQUE NOT NULL,
        subtotal NUMERIC NOT NULL DEFAULT 0.0,
        discount NUMERIC NOT NULL DEFAULT 0.0,
        tax NUMERIC NOT NULL DEFAULT 0.0,
        grand_total NUMERIC NOT NULL DEFAULT 0.0,
        payment_method TEXT NOT NULL DEFAULT 'Cash',
        status TEXT NOT NULL DEFAULT 'Completed',
        customer_name TEXT DEFAULT 'Walk-in Customer',
        customer_phone TEXT DEFAULT '',
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
      await db.query(`CREATE TABLE IF NOT EXISTS bill_items (
        id SERIAL PRIMARY KEY,
        bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        product_name TEXT NOT NULL,
        sku TEXT,
        quantity INTEGER NOT NULL,
        unit_price NUMERIC NOT NULL,
        total_price NUMERIC NOT NULL,
        returned_quantity INTEGER NOT NULL DEFAULT 0
      )`);
      await db.query(`ALTER TABLE bills ADD COLUMN IF NOT EXISTS cash_received NUMERIC DEFAULT 0.0`);
      await db.query(`ALTER TABLE bills ADD COLUMN IF NOT EXISTS change_amount NUMERIC DEFAULT 0.0`);
      await db.query(`ALTER TABLE bills ADD COLUMN IF NOT EXISTS transaction_ref TEXT DEFAULT ''`);
      await db.query(`ALTER TABLE bills ADD COLUMN IF NOT EXISTS voided_reason TEXT DEFAULT ''`);
      await db.query(`ALTER TABLE bills ADD COLUMN IF NOT EXISTS voided_by INTEGER REFERENCES users(id) ON DELETE SET NULL`);
      await db.query(`ALTER TABLE bills ADD COLUMN IF NOT EXISTS voided_at TIMESTAMP`);
      await db.query(`CREATE TABLE IF NOT EXISTS stock_movements (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        movement_type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        reference_id TEXT,
        previous_stock INTEGER NOT NULL,
        new_stock INTEGER NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
      await db.query(`ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_type TEXT DEFAULT 'General Store'`);
    } else {
      const invCols = await db.query(`PRAGMA table_info(inventory)`);
      const colNames = invCols.map(c => c.name);
      if (!colNames.includes('shelf')) {
        await db.run(`ALTER TABLE inventory ADD COLUMN shelf TEXT DEFAULT 'B'`);
      }
      if (!colNames.includes('row_number')) {
        await db.run(`ALTER TABLE inventory ADD COLUMN row_number INTEGER DEFAULT 1`);
      }
      if (!colNames.includes('column_number')) {
        await db.run(`ALTER TABLE inventory ADD COLUMN column_number INTEGER DEFAULT 1`);
      }
      if (!colNames.includes('location_code')) {
        await db.run(`ALTER TABLE inventory ADD COLUMN location_code TEXT DEFAULT 'B-01-01'`);
      }

      const batchCols = await db.query(`PRAGMA table_info(batches)`);
      const batchColNames = batchCols.map(c => c.name);
      if (!batchColNames.includes('shelf')) {
        await db.run(`ALTER TABLE batches ADD COLUMN shelf TEXT DEFAULT 'B'`);
      }
      if (!batchColNames.includes('row_number')) {
        await db.run(`ALTER TABLE batches ADD COLUMN row_number INTEGER DEFAULT 1`);
      }
      if (!batchColNames.includes('column_number')) {
        await db.run(`ALTER TABLE batches ADD COLUMN column_number INTEGER DEFAULT 1`);
      }
      if (!batchColNames.includes('location_code')) {
        await db.run(`ALTER TABLE batches ADD COLUMN location_code TEXT DEFAULT 'B-01-01'`);
      }

      await db.exec(`CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        activity_type TEXT NOT NULL,
        product_id INTEGER,
        product_name TEXT NOT NULL,
        description TEXT NOT NULL,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      await db.exec(`CREATE TABLE IF NOT EXISTS bills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        billing_id TEXT UNIQUE NOT NULL,
        subtotal REAL NOT NULL DEFAULT 0.0,
        discount REAL NOT NULL DEFAULT 0.0,
        tax REAL NOT NULL DEFAULT 0.0,
        grand_total REAL NOT NULL DEFAULT 0.0,
        payment_method TEXT NOT NULL DEFAULT 'Cash',
        status TEXT NOT NULL DEFAULT 'Completed',
        customer_name TEXT DEFAULT 'Walk-in Customer',
        customer_phone TEXT DEFAULT '',
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      await db.exec(`CREATE TABLE IF NOT EXISTS bill_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bill_id INTEGER NOT NULL,
        product_id INTEGER,
        product_name TEXT NOT NULL,
        sku TEXT,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        returned_quantity INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
      )`);

      await db.exec(`CREATE TABLE IF NOT EXISTS stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        movement_type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        reference_id TEXT,
        previous_stock INTEGER NOT NULL,
        new_stock INTEGER NOT NULL,
        user_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      const billCols = await db.query(`PRAGMA table_info(bills)`);
      const billColNames = billCols.map(c => c.name);
      if (!billColNames.includes('cash_received')) {
        await db.run(`ALTER TABLE bills ADD COLUMN cash_received REAL DEFAULT 0.0`);
      }
      if (!billColNames.includes('change_amount')) {
        await db.run(`ALTER TABLE bills ADD COLUMN change_amount REAL DEFAULT 0.0`);
      }
      if (!billColNames.includes('transaction_ref')) {
        await db.run(`ALTER TABLE bills ADD COLUMN transaction_ref TEXT DEFAULT ''`);
      }
      if (!billColNames.includes('voided_reason')) {
        await db.run(`ALTER TABLE bills ADD COLUMN voided_reason TEXT DEFAULT ''`);
      }
      if (!billColNames.includes('voided_by')) {
        await db.run(`ALTER TABLE bills ADD COLUMN voided_by INTEGER`);
      }
      if (!billColNames.includes('voided_at')) {
        await db.run(`ALTER TABLE bills ADD COLUMN voided_at DATETIME`);
      }

      const setCols = await db.query(`PRAGMA table_info(settings)`);
      const setColNames = setCols.map(c => c.name);
      if (!setColNames.includes('store_type')) {
        await db.run(`ALTER TABLE settings ADD COLUMN store_type TEXT DEFAULT 'General Store'`);
      }
    }
  } catch (err) {
    console.warn('[DB Migration Warning]:', err.message);
  }
}


export async function getDb() {
  if (config.databaseUrl && (config.databaseUrl.startsWith('postgres://') || config.databaseUrl.startsWith('postgresql://'))) {
    if (!pgPool) {
      pgPool = new Pool({
        connectionString: config.databaseUrl,
        ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false
      });
    }

    if (!pgInitialized) {
      try {
        await pgPool.query(PG_SCHEMA);
        pgInitialized = true;
      } catch (err) {
        console.error('[DB] PostgreSQL schema initialization notice:', err.message);
      }
    }

    const pgDb = {
      type: 'postgres',
      async query(sql, params = []) {
        let i = 1;
        const pgSql = sql.replace(/\?/g, () => `$${i++}`);
        const res = await pgPool.query(pgSql, params);
        return res.rows;
      },
      async get(sql, params = []) {
        let i = 1;
        const pgSql = sql.replace(/\?/g, () => `$${i++}`);
        const res = await pgPool.query(pgSql, params);
        return res.rows[0];
      },
      async run(sql, params = []) {
        let i = 1;
        let pgSql = sql.replace(/\?/g, () => `$${i++}`);
        if (!pgSql.toUpperCase().includes('RETURNING') && (pgSql.toUpperCase().startsWith('INSERT') || pgSql.toUpperCase().startsWith('UPDATE'))) {
          pgSql += ' RETURNING id';
        }
        const res = await pgPool.query(pgSql, params);
        return {
          lastID: res.rows[0]?.id || null,
          changes: res.rowCount
        };
      },
      async exec(sql) {
        await pgPool.query(sql);
      },
      async beginTransaction() {
        await pgPool.query('BEGIN');
      },
      async commit() {
        await pgPool.query('COMMIT');
      },
      async rollback() {
        try {
          await pgPool.query('ROLLBACK');
        } catch (e) {
          // Ignore rollback errors if transaction wasn't active
        }
      }
    };

    await runColumnMigrations(pgDb, true);
    return pgDb;
  }

  // Fallback to SQLite
  if (!dbInstance) {
    let dbPath = path.resolve(__dirname, 'stationai.db');
    
    // In Vercel serverless environment, use /tmp for write permissions if no cloud DB configured
    if ((process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) && !config.databaseUrl) {
      const tmpPath = path.join('/tmp', 'stationai.db');
      if (!fs.existsSync(tmpPath) && fs.existsSync(dbPath)) {
        try {
          fs.copyFileSync(dbPath, tmpPath);
        } catch (e) {
          console.warn('Could not copy initial stationai.db to /tmp:', e);
        }
      }
      dbPath = tmpPath;
    }

    dbInstance = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    await dbInstance.exec('PRAGMA foreign_keys = ON;');
    await dbInstance.exec(SQLITE_SCHEMA);
  }

  const sqliteDb = {
    type: 'sqlite',
    async query(sql, params = []) {
      return dbInstance.all(sql, params);
    },
    async get(sql, params = []) {
      return dbInstance.get(sql, params);
    },
    async run(sql, params = []) {
      const res = await dbInstance.run(sql, params);
      return {
        lastID: res.lastID,
        changes: res.changes
      };
    },
    async exec(sql) {
      await dbInstance.exec(sql);
    },
    async beginTransaction() {
      await dbInstance.exec('BEGIN TRANSACTION');
    },
    async commit() {
      await dbInstance.exec('COMMIT');
    },
    async rollback() {
      try {
        await dbInstance.exec('ROLLBACK');
      } catch (e) {
        // Ignore rollback errors if transaction was not open
      }
    }
  };

  await runColumnMigrations(sqliteDb, false);
  return sqliteDb;
}

