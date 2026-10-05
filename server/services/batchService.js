import { getDb } from '../database/db.js';

export async function getBatchesByProductId(productId) {
  const db = await getDb();
  return db.query(`SELECT * FROM batches WHERE product_id = ? ORDER BY expiry_date ASC`, [productId]);
}

export async function insertBatch(batchData) {
  const db = await getDb();
  return db.run(
    `INSERT INTO batches (product_id, batch_number, quantity_loaded, current_quantity, loaded_date, expiry_date, supplier, shelf_location, shelf_row, shelf_column)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      batchData.productId,
      batchData.batchNumber,
      batchData.quantityLoaded,
      batchData.currentQuantity,
      batchData.loadedDate,
      batchData.expiryDate,
      batchData.supplier,
      batchData.shelf,
      batchData.row,
      batchData.column
    ]
  );
}
