import { getDb } from '../database/db.js';

/**
 * Log an activity to activity_logs table
 */
export async function logActivity(db, { userId = null, activityType, productId = null, productName, description, details = null }) {
  try {
    const detailsStr = typeof details === 'object' ? JSON.stringify(details) : details;
    await db.run(
      `INSERT INTO activity_logs (user_id, activity_type, product_id, product_name, description, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [userId, activityType, productId, productName || 'Product', description, detailsStr]
    );
  } catch (err) {
    console.warn('[Activity Log Warning]:', err.message);
  }
}

/**
 * GET /api/activity
 * Fetch all activity logs sorted by newest first with pagination and optional type filter
 */
export async function getActivityLogs(req, res) {
  try {
    const db = await getDb();
    const { type, limit = 50, offset = 0 } = req.query;

    let sql = `SELECT a.*, u.name as user_name, p.sku as product_sku
               FROM activity_logs a
               LEFT JOIN users u ON a.user_id = u.id
               LEFT JOIN products p ON a.product_id = p.id`;
    const params = [];

    if (type && type !== 'ALL') {
      sql += ` WHERE a.activity_type = ?`;
      params.push(type);
    }

    sql += ` ORDER BY a.created_at DESC, a.id DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit) || 50, Number(offset) || 0);

    const rows = await db.query(sql, params);

    const activities = rows.map(r => {
      let parsedDetails = null;
      try {
        if (r.details) parsedDetails = JSON.parse(r.details);
      } catch {
        parsedDetails = r.details;
      }

      return {
        id: r.id,
        userId: r.user_id,
        userName: r.user_name || 'Shopkeeper',
        activityType: r.activity_type,
        productId: r.product_id,
        productName: r.product_name,
        sku: r.product_sku,
        description: r.description,
        details: parsedDetails,
        createdAt: r.created_at,
        time: new Date(r.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        date: new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      };
    });

    const countRow = await db.get(`SELECT COUNT(*) as total FROM activity_logs`);
    const total = countRow?.total || countRow?.['COUNT(*)'] || activities.length;

    return res.json({
      success: true,
      total,
      activities
    });
  } catch (err) {
    console.error('Error fetching activity logs:', err);
    return res.status(500).json({ error: 'Failed to fetch activity history' });
  }
}

/**
 * DELETE /api/activity
 */
export async function clearActivityLogs(req, res) {
  try {
    const db = await getDb();
    await db.run(`DELETE FROM activity_logs`);
    return res.json({ success: true, message: 'Activity logs cleared' });
  } catch (err) {
    console.error('Error clearing activity logs:', err);
    return res.status(500).json({ error: 'Failed to clear activity history' });
  }
}
