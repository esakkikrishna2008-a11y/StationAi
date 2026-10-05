import { getDb } from '../database/db.js';
import { syncNotifications } from '../services/notificationService.js';

export async function getNotifications(req, res) {
  try {
    const db = await getDb();

    // 1. Run deduplicating sync routine
    await syncNotifications(db);

    // 2. Fetch stored notifications from DB table
    const rows = await db.query(
      `SELECT n.*, p.name as product_name
       FROM notifications n
       LEFT JOIN products p ON n.related_product_id = p.id
       ORDER BY n.created_at DESC LIMIT 50`
    );

    const notifications = rows.map(n => ({
      id: String(n.id),
      title: n.title,
      message: n.message,
      type: n.type,
      relatedProductId: n.related_product_id,
      read: Boolean(n.is_read),
      date: n.created_at
    }));

    return res.json({ notifications });
  } catch (err) {
    console.error('Fetch notifications error:', err);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

export async function markAsRead(req, res) {
  try {
    const { id } = req.params;
    const db = await getDb();
    await db.run(`UPDATE notifications SET is_read = 1 WHERE id = ?`, [id]);
    return res.json({ message: 'Notification marked as read', id });
  } catch (err) {
    console.error('Mark read error:', err);
    return res.status(500).json({ error: 'Failed to mark notification read' });
  }
}

export async function markAllAsRead(req, res) {
  try {
    const db = await getDb();
    await db.run(`UPDATE notifications SET is_read = 1`);
    return res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Mark all read error:', err);
    return res.status(500).json({ error: 'Failed to mark all notifications read' });
  }
}
