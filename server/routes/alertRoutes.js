import express from 'express';
import { getDb } from '../database/db.js';
import { calculateExpiryStatus, getDaysRemaining } from '../controllers/expiryController.js';
import { formatProductRow } from '../controllers/productController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/alerts/stock
 * Returns all products that are currently LOW STOCK or OUT OF STOCK
 */
router.get('/stock', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.query(
      `SELECT p.*, i.quantity, i.reorder_level, i.shelf_location, i.shelf_row, i.shelf_column, i.supplier
       FROM products p
       JOIN inventory i ON p.id = i.product_id
       WHERE i.quantity <= i.reorder_level
       ORDER BY i.quantity ASC, p.name ASC`
    );

    const alerts = await Promise.all(rows.map(p => formatProductRow(db, p)));
    return res.json({
      success: true,
      count: alerts.length,
      alerts
    });
  } catch (err) {
    console.error('Error fetching stock alerts:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch stock alerts' });
  }
});

/**
 * GET /api/alerts/expiry
 * Returns all batches that are EXPIRED, CRITICAL (<=7 days), or EXPIRING SOON (<=30 days)
 */
router.get('/expiry', authenticateToken, async (req, res) => {
  try {
    const db = await getDb();
    const rows = await db.query(
      `SELECT b.*, p.name as product_name, p.sku, p.category, p.brand, p.image_url,
              i.shelf_location as product_shelf, i.shelf_row as product_row, i.shelf_column as product_column
       FROM batches b
       JOIN products p ON b.product_id = p.id
       LEFT JOIN inventory i ON p.id = i.product_id
       WHERE b.current_quantity > 0
       ORDER BY b.expiry_date ASC`
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const alerts = rows.map(b => {
      const exp = new Date(b.expiry_date);
      exp.setHours(0, 0, 0, 0);
      const daysRemaining = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
      const expiryStatus = calculateExpiryStatus(b.expiry_date);

      return {
        id: b.id,
        productId: b.product_id,
        productName: b.product_name,
        sku: b.sku,
        category: b.category,
        brand: b.brand,
        batchNumber: b.batch_number,
        quantityLoaded: b.quantity_loaded,
        currentQuantity: b.current_quantity,
        loadedDate: b.loaded_date,
        expiryDate: b.expiry_date,
        supplier: b.supplier,
        shelf: b.shelf_location || b.product_shelf || 'B',
        row: b.shelf_row || b.product_row || 'B1',
        column: b.shelf_column || b.product_column || '01',
        daysRemaining,
        expiryStatus
      };
    });

    const activeAlerts = alerts.filter(a => a.expiryStatus !== 'SAFE');

    return res.json({
      success: true,
      count: activeAlerts.length,
      alerts: activeAlerts,
      allTrackedBatches: alerts
    });
  } catch (err) {
    console.error('Error fetching expiry alerts:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch expiry alerts' });
  }
});

export default router;
