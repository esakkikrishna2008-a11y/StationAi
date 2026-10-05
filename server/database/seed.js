import bcrypt from 'bcryptjs';
import { getDb } from './db.js';

let dbInitPromise = null;

/**
 * ensureDemoAccounts — Creates or updates demo admin/staff accounts.
 * Does NOT insert any products, inventory, batches, notifications, or search history.
 */
export async function ensureDemoAccounts() {
  const db = await getDb();
  const demoPassHash = await bcrypt.hash('Demo@123', 10);
  const adminPassHash = await bcrypt.hash('admin123', 10);
  const staffPassHash = await bcrypt.hash('staff123', 10);

  // 1. Evaluation Demo Account: demo@stationai.app / Demo@123
  const existingDemo = await db.get(`SELECT id FROM users WHERE LOWER(email) = LOWER(?)`, ['demo@stationai.app']);
  if (existingDemo) {
    await db.run(`UPDATE users SET password = ?, role = 'ADMIN', name = 'Store Manager (Demo)' WHERE id = ?`, [demoPassHash, existingDemo.id]);
  } else {
    await db.run(
      `INSERT INTO users (name, email, password, role, shop_name, phone)
       VALUES ('Store Manager (Demo)', 'demo@stationai.app', ?, 'ADMIN', 'StationAI Central Mart', '+91 98765 43210')`,
      [demoPassHash]
    );
  }

  // 2. Admin account: admin@stationai.shop / admin123
  const existingAdmin = await db.get(`SELECT id FROM users WHERE LOWER(email) = LOWER(?)`, ['admin@stationai.shop']);
  if (existingAdmin) {
    await db.run(`UPDATE users SET password = ?, role = 'ADMIN', name = 'Shopkeeper Admin' WHERE id = ?`, [adminPassHash, existingAdmin.id]);
  } else {
    await db.run(
      `INSERT INTO users (name, email, password, role, shop_name, phone)
       VALUES ('Shopkeeper Admin', 'admin@stationai.shop', ?, 'ADMIN', 'StationAI Central Mart', '+91 98765 43210')`,
      [adminPassHash]
    );
  }

  // 3. Staff account: staff@stationai.shop / staff123
  const existingStaff = await db.get(`SELECT id FROM users WHERE LOWER(email) = LOWER(?)`, ['staff@stationai.shop']);
  if (existingStaff) {
    await db.run(`UPDATE users SET password = ?, role = 'STAFF', name = 'Store Staff Assistant' WHERE id = ?`, [staffPassHash, existingStaff.id]);
  } else {
    await db.run(
      `INSERT INTO users (name, email, password, role, shop_name, phone)
       VALUES ('Store Staff Assistant', 'staff@stationai.shop', ?, 'STAFF', 'StationAI Central Mart', '+91 98765 43211')`,
      [staffPassHash]
    );
  }
}

/**
 * initializeDatabase — Called on startup or on demand.
 * Only ensures user accounts and default settings exist.
 * NEVER inserts demo/sample/seed products.
 */
export async function initializeDatabase() {
  const db = await getDb();
  console.log('🔧 Initializing StationAI database...');

  // 1. Ensure demo user accounts
  await ensureDemoAccounts();

  // 2. Ensure default settings row exists
  const existingSettings = await db.get(`SELECT id FROM settings WHERE id = 1`);
  if (!existingSettings) {
    await db.run(
      `INSERT INTO settings (id, shop_name, low_stock_threshold, currency, notify_low_stock, notify_expiry)
       VALUES (1, 'StationAI Central Mart', 10, '₹', 1, 1)`
    );
  }

  console.log('✅ Database initialization complete. Ready for requests.');
}

/**
 * ensureDbReady — Idempotent wrapper returning a single cached promise.
 */
export async function ensureDbReady() {
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      await getDb();
      await initializeDatabase();
    })().catch(err => {
      dbInitPromise = null;
      throw err;
    });
  }
  return dbInitPromise;
}

// Run directly if invoked from command line
if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  initializeDatabase().then(() => process.exit(0)).catch(err => {
    console.error('Init error:', err);
    process.exit(1);
  });
}
