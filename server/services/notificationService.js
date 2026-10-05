import { calculateExpiryStatus, getDaysRemaining } from '../controllers/expiryController.js';

/**
 * Synchronizes low stock, out of stock, and expiry notifications into the `notifications` table.
 * Deduplicates automatically so duplicate rows are NOT created on every call.
 */
export async function syncNotifications(db) {
  try {
    // 1. LOW STOCK & OUT OF STOCK SCAN
    const stockItems = await db.query(
      `SELECT p.id as product_id, p.name, i.quantity, i.reorder_level
       FROM products p
       JOIN inventory i ON p.id = i.product_id
       WHERE i.quantity <= i.reorder_level`
    );

    for (const item of stockItems) {
      const isOut = item.quantity === 0;
      const type = isOut ? 'error' : 'warning';
      const title = isOut ? `🔴 ${item.name} Out of Stock` : `🟠 ${item.name} Low Stock`;
      const message = isOut
        ? `${item.name} is out of stock (0 remaining).`
        : `${item.name} is running low. Only ${item.quantity} remain.`;

      // Deduplication check: look for any notification for this product & type (read or unread)
      const existing = await db.get(
        `SELECT id, message FROM notifications
         WHERE related_product_id = ? AND type = ?
         ORDER BY id DESC LIMIT 1`,
        [item.product_id, type]
      );

      if (!existing) {
        // Insert new notification
        await db.run(
          `INSERT INTO notifications (type, title, message, related_product_id, is_read)
           VALUES (?, ?, ?, ?, 0)`,
          [type, title, message, item.product_id]
        );
      } else if (existing.message !== message) {
        // Update existing notification message if quantity changed
        await db.run(
          `UPDATE notifications SET message = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [message, existing.id]
        );
      }
    }

    // 2. EXPIRY SCAN
    const batches = await db.query(
      `SELECT b.*, p.name as product_name
       FROM batches b
       JOIN products p ON b.product_id = p.id
       WHERE b.current_quantity > 0`
    );

    for (const b of batches) {
      const status = calculateExpiryStatus(b.expiry_date);
      if (status === 'SAFE') continue;

      const days = getDaysRemaining(b.expiry_date);
      let type = 'warning';
      let title = '';
      let message = '';

      if (status === 'EXPIRED') {
        type = 'error';
        title = `🔴 ${b.product_name} Expired`;
        message = `Batch ${b.batch_number}: Product expired on ${b.expiry_date}.`;
      } else if (status === 'CRITICAL') {
        type = 'error';
        title = `🔴 ${b.product_name} Critical Expiry`;
        message = `Batch ${b.batch_number}: Expires in ${days} day(s) (${b.expiry_date}).`;
      } else if (status === 'EXPIRING SOON') {
        type = 'warning';
        title = `🟠 ${b.product_name} Expiring Soon`;
        message = `Batch ${b.batch_number}: Expires in ${days} day(s) (${b.expiry_date}).`;
      }

      // Deduplication check: look for any notification for this product & batch (read or unread)
      const existingExp = await db.get(
        `SELECT id FROM notifications
         WHERE related_product_id = ? AND type = ? AND message LIKE ?`,
        [b.product_id, type, `%Batch ${b.batch_number}%`]
      );

      if (!existingExp) {
        await db.run(
          `INSERT INTO notifications (type, title, message, related_product_id, is_read)
           VALUES (?, ?, ?, ?, 0)`,
          [type, title, message, b.product_id]
        );
      }
    }
  } catch (err) {
    console.error('Error syncing notifications:', err);
  }
}
