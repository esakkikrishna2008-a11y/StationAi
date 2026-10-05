import { getDb } from '../database/db.js';

export async function getAllProductsFromDb() {
  const db = await getDb();
  return db.query(
    `SELECT p.*, i.quantity, i.reorder_level, i.shelf_location, i.shelf_row, i.shelf_column, i.supplier
     FROM products p
     LEFT JOIN inventory i ON p.id = i.product_id
     ORDER BY p.id ASC`
  );
}

export async function getProductByIdFromDb(id) {
  const db = await getDb();
  return db.get(
    `SELECT p.*, i.quantity, i.reorder_level, i.shelf_location, i.shelf_row, i.shelf_column, i.supplier
     FROM products p
     LEFT JOIN inventory i ON p.id = i.product_id
     WHERE p.id = ?`,
    [id]
  );
}

export async function createProductInDb(productData) {
  const db = await getDb();
  const prodRes = await db.run(
    `INSERT INTO products (sku, name, description, category, brand, price, image_url, unit, expiry_tracking)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      productData.sku,
      productData.name,
      productData.description || '',
      productData.category,
      productData.brand,
      productData.price,
      productData.imageUrl || '',
      productData.unit || 'piece',
      productData.expiryTracking ? 1 : 0
    ]
  );
  return prodRes.lastID;
}
