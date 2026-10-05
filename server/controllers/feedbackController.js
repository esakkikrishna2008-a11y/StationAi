import { getDb } from '../database/db.js';

export async function submitFeedback(req, res) {
  try {
    const { productId, searchQuery, helpful, issueType, comment, customNote } = req.body;
    if (helpful === undefined) {
      return res.status(400).json({ error: 'Helpful status (true/false) is required' });
    }

    const db = await getDb();
    await db.run(
      `INSERT INTO feedback (user_id, product_id, search_query, helpful, issue_type, comment)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user?.id || null, productId || null, searchQuery || null, helpful ? 1 : 0, issueType || null, comment || customNote || null]
    );

    return res.status(201).json({ message: 'Thank you! Your feedback has been saved.' });
  } catch (err) {
    console.error('Submit feedback error:', err);
    return res.status(500).json({ error: 'Failed to submit feedback' });
  }
}

export async function getFeedbackStats(req, res) {
  try {
    const db = await getDb();
    const totalRow = await db.get(`SELECT COUNT(*) as total FROM feedback`);
    const helpfulRow = await db.get(`SELECT COUNT(*) as helpfulCount FROM feedback WHERE helpful = 1`);

    const total = totalRow.total || 0;
    const helpful = helpfulRow.helpfulCount || 0;
    const accuracyPercentage = total > 0 ? Math.round((helpful / total) * 100) : 100;

    const recent = await db.query(
      `SELECT f.*, p.name as product_name
       FROM feedback f
       LEFT JOIN products p ON f.product_id = p.id
       ORDER BY f.created_at DESC LIMIT 10`
    );

    return res.json({
      totalFeedback: total,
      helpfulCount: helpful,
      accuracyPercentage,
      recentFeedback: recent
    });
  } catch (err) {
    console.error('Feedback stats error:', err);
    return res.status(500).json({ error: 'Failed to fetch feedback statistics' });
  }
}
