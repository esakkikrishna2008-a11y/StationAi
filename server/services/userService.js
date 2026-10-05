import { getDb } from '../database/db.js';

export async function getUserByEmail(email) {
  const db = await getDb();
  return db.get(`SELECT * FROM users WHERE LOWER(email) = LOWER(?)`, [email.trim()]);
}

export async function getUserById(id) {
  const db = await getDb();
  return db.get(`SELECT id, name, email, role, shop_name as shopName, phone, created_at as createdAt FROM users WHERE id = ?`, [id]);
}
