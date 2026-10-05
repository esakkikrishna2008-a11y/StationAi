import { getDb } from '../database/db.js';

export function getDaysRemaining(expiryDate) {
  if (!expiryDate) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
}

export function calculateExpiryStatus(expiryDate) {
  if (!expiryDate) return 'NO DATA';
  const diffDays = getDaysRemaining(expiryDate);
  if (diffDays < 0) return 'EXPIRED';
  if (diffDays <= 7) return 'CRITICAL';
  if (diffDays <= 30) return 'EXPIRING SOON';
  return 'SAFE';
}

export async function getExpiryAlerts(req, res) {
  try {
    const db = await getDb();
    const rows = await db.query(
      `SELECT b.*, p.name as product_name, p.sku, p.category, p.brand, p.image_url,
              i.shelf_location as product_shelf, i.shelf_row as product_row, i.shelf_column as product_column
       FROM batches b
       JOIN products p ON b.product_id = p.id
       LEFT JOIN inventory i ON p.id = i.product_id
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
        batchId: b.batch_number,
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

    const stats = {
      totalBatches: alerts.length,
      expired: alerts.filter(a => a.expiryStatus === 'EXPIRED').length,
      critical: alerts.filter(a => a.expiryStatus === 'CRITICAL').length,
      expiringSoon: alerts.filter(a => a.expiryStatus === 'EXPIRING SOON').length,
      safe: alerts.filter(a => a.expiryStatus === 'SAFE').length
    };

    return res.json({ stats, alerts });
  } catch (err) {
    console.error('Error fetching expiry alerts:', err);
    return res.status(500).json({ error: 'Failed to fetch expiry alerts' });
  }
}

export async function loadStockBatch(req, res) {
  try {
    const { productId } = req.params;
    const { batchId, quantityLoaded, expiryDate, supplier, shelf, row, column } = req.body;

    if (!batchId || !quantityLoaded || !expiryDate) {
      return res.status(400).json({ error: 'Batch ID, quantity, and valid expiry date are required' });
    }

    const qty = Number(quantityLoaded);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Batch quantity must be a positive number' });
    }

    const db = await getDb();
    const prod = await db.get(`SELECT id, name FROM products WHERE id = ?`, [productId]);
    if (!prod) return res.status(404).json({ error: 'Product not found' });

    // Enable expiry tracking on product if not already set
    await db.run(`UPDATE products SET expiry_tracking = 1 WHERE id = ?`, [productId]);

    // Insert batch
    const loadedDate = new Date().toISOString().split('T')[0];
    await db.run(
      `INSERT INTO batches (product_id, batch_number, quantity_loaded, current_quantity, loaded_date, expiry_date, supplier, shelf_location, shelf_row, shelf_column)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [productId, batchId.trim(), qty, qty, loadedDate, expiryDate, supplier || 'General Supplier', shelf || 'B', row || 'B1', column || '01']
    );

    // Increase product total quantity in inventory
    const inv = await db.get(`SELECT quantity FROM inventory WHERE product_id = ?`, [productId]);
    const prevQty = Number(inv ? inv.quantity : 0);
    const newQty = prevQty + qty;

    await db.run(
      `INSERT INTO inventory (product_id, quantity, reorder_level, shelf_location, shelf_row, shelf_column, supplier)
       VALUES (?, ?, 5, ?, ?, ?, ?)
       ON CONFLICT(product_id) DO UPDATE SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP`,
      [productId, qty, shelf || 'B', row || 'B1', column || '01', supplier || 'General Supplier', qty]
    );

    // Record stock transaction
    await db.run(
      `INSERT INTO stock_transactions (product_id, transaction_type, quantity, previous_quantity, new_quantity, reason, user_id)
       VALUES (?, 'STOCK_IN', ?, ?, ?, ?, ?)`,
      [productId, qty, prevQty, newQty, `Batch ${batchId} loaded`, req.user?.id || null]
    );

    return res.status(201).json({ message: `Successfully loaded batch ${batchId} (${qty} units)` });
  } catch (err) {
    console.error('Error loading stock batch:', err);
    return res.status(500).json({ error: 'Failed to load stock batch' });
  }
}
