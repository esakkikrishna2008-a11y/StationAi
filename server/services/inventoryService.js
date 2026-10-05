import { getDb } from '../database/db.js';

export async function getInventoryByProductId(productId) {
  const db = await getDb();
  return db.get(`SELECT * FROM inventory WHERE product_id = ?`, [productId]);
}

export async function updateInventoryQuantity(productId, quantity) {
  const db = await getDb();
  return db.run(
    `UPDATE inventory SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`,
    [quantity, productId]
  );
}

export async function recordStockTransaction(productId, type, qty, prevQty, newQty, reason, userId) {
  const db = await getDb();
  return db.run(
    `INSERT INTO stock_transactions (product_id, transaction_type, quantity, previous_quantity, new_quantity, reason, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [productId, type, qty, prevQty, newQty, reason, userId || null]
  );
}
