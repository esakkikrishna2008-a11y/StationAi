import { getDb } from '../database/db.js';
import { formatProductRow } from './productController.js';

/**
 * GET /api/reports/summary
 */
export async function getInventorySummaryReport(req, res) {
  try {
    const db = await getDb();
    const { category, shelf } = req.query;

    let sql = `SELECT p.*, i.quantity, i.reorder_level, i.shelf, i.row_number, i.column_number, i.location_code
               FROM products p
               LEFT JOIN inventory i ON p.id = i.product_id WHERE 1=1`;
    const params = [];

    if (category && category !== 'All') {
      sql += ` AND p.category = ?`;
      params.push(category);
    }
    if (shelf && shelf !== 'All') {
      sql += ` AND i.shelf = ?`;
      params.push(shelf);
    }

    sql += ` ORDER BY p.category ASC, p.name ASC`;
    const rows = await db.query(sql, params);
    const products = await Promise.all(rows.map(r => formatProductRow(db, r)));

    let totalValue = 0;
    let totalItems = 0;
    let availableCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach(p => {
      const val = (p.stock || 0) * (p.price || 0);
      totalValue += val;
      totalItems += p.stock || 0;
      if (p.stock === 0) outOfStockCount++;
      else if (p.stock <= p.reorderLevel) lowStockCount++;
      else availableCount++;
    });

    return res.json({
      success: true,
      reportType: 'Inventory Summary',
      generatedAt: new Date().toISOString(),
      summary: {
        totalProducts: products.length,
        totalUnits: totalItems,
        totalValuation: Math.round(totalValue * 100) / 100,
        availableCount,
        lowStockCount,
        outOfStockCount
      },
      products
    });
  } catch (err) {
    console.error('Report error:', err);
    return res.status(500).json({ error: 'Failed to generate inventory summary report' });
  }
}

/**
 * GET /api/reports/low-stock
 */
export async function getLowStockReport(req, res) {
  try {
    const db = await getDb();
    const rows = await db.query(
      `SELECT p.*, i.quantity, i.reorder_level, i.shelf, i.row_number, i.column_number, i.location_code
       FROM products p
       JOIN inventory i ON p.id = i.product_id
       WHERE i.quantity > 0 AND i.quantity <= i.reorder_level
       ORDER BY i.quantity ASC`
    );
    const products = await Promise.all(rows.map(r => formatProductRow(db, r)));

    return res.json({
      success: true,
      reportType: 'Low Stock Report',
      generatedAt: new Date().toISOString(),
      count: products.length,
      products
    });
  } catch (err) {
    console.error('Low stock report error:', err);
    return res.status(500).json({ error: 'Failed to generate low stock report' });
  }
}

/**
 * GET /api/reports/out-of-stock
 */
export async function getOutOfStockReport(req, res) {
  try {
    const db = await getDb();
    const rows = await db.query(
      `SELECT p.*, i.quantity, i.reorder_level, i.shelf, i.row_number, i.column_number, i.location_code
       FROM products p
       JOIN inventory i ON p.id = i.product_id
       WHERE i.quantity = 0
       ORDER BY p.name ASC`
    );
    const products = await Promise.all(rows.map(r => formatProductRow(db, r)));

    return res.json({
      success: true,
      reportType: 'Out of Stock Report',
      generatedAt: new Date().toISOString(),
      count: products.length,
      products
    });
  } catch (err) {
    console.error('Out of stock report error:', err);
    return res.status(500).json({ error: 'Failed to generate out of stock report' });
  }
}

/**
 * GET /api/reports/expiry
 */
export async function getExpiryReport(req, res) {
  try {
    const db = await getDb();
    const rows = await db.query(
      `SELECT b.*, p.name as product_name, p.sku, p.category, p.brand, p.price,
              i.shelf, i.row_number, i.column_number, i.location_code
       FROM batches b
       JOIN products p ON b.product_id = p.id
       LEFT JOIN inventory i ON p.id = i.product_id
       WHERE p.expiry_tracking = 1 AND b.current_quantity > 0
       ORDER BY b.expiry_date ASC`
    );

    const now = new Date();
    const batches = rows.map(r => {
      const exp = new Date(r.expiry_date);
      const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
      let status = 'SAFE';
      if (diffDays < 0) status = 'EXPIRED';
      else if (diffDays <= 7) status = 'CRITICAL';
      else if (diffDays <= 30) status = 'WARNING';

      return {
        id: r.id,
        productId: r.product_id,
        productName: r.product_name,
        sku: r.sku,
        category: r.category,
        brand: r.brand,
        price: r.price,
        batchNumber: r.batch_number,
        quantity: r.current_quantity,
        expiryDate: r.expiry_date,
        daysRemaining: diffDays,
        status,
        shelf: r.shelf || 'B',
        row: r.row_number || 1,
        column: r.column_number || 1,
        locationCode: r.location_code || 'B-01-01'
      };
    });

    return res.json({
      success: true,
      reportType: 'Expiry Tracking Report',
      generatedAt: new Date().toISOString(),
      count: batches.length,
      batches
    });
  } catch (err) {
    console.error('Expiry report error:', err);
    return res.status(500).json({ error: 'Failed to generate expiry report' });
  }
}

/**
 * GET /api/reports/movements
 */
export async function getStockMovementsReport(req, res) {
  try {
    const db = await getDb();
    const rows = await db.query(
      `SELECT st.*, p.name as product_name, p.sku, u.name as user_name
       FROM stock_transactions st
       JOIN products p ON st.product_id = p.id
       LEFT JOIN users u ON st.user_id = u.id
       ORDER BY st.created_at DESC LIMIT 100`
    );

    return res.json({
      success: true,
      reportType: 'Stock Movement Report',
      generatedAt: new Date().toISOString(),
      count: rows.length,
      movements: rows.map(r => ({
        id: r.id,
        productName: r.product_name,
        sku: r.sku,
        type: r.transaction_type,
        quantity: r.quantity,
        previousQuantity: r.previous_quantity,
        newQuantity: r.new_quantity,
        reason: r.reason || 'Inventory update',
        userName: r.user_name || 'Shopkeeper',
        date: r.created_at
      }))
    });
  } catch (err) {
    console.error('Movement report error:', err);
    return res.status(500).json({ error: 'Failed to generate movements report' });
  }
}

/**
 * GET /api/reports/export-csv
 */
export async function exportInventoryCSV(req, res) {
  try {
    const db = await getDb();
    const rows = await db.query(
      `SELECT p.name, p.sku, p.category, p.brand, p.price, i.quantity, i.reorder_level,
              i.shelf, i.row_number, i.column_number, i.location_code
       FROM products p
       LEFT JOIN inventory i ON p.id = i.product_id
       ORDER BY p.category ASC, p.name ASC`
    );

    let csv = 'Product Name,SKU,Category,Brand,Selling Price (INR),Stock Quantity,Reorder Level,Shelf,Row,Column,Location Code,Stock Status\n';
    rows.forEach(r => {
      const stock = r.quantity || 0;
      const reorder = r.reorder_level || 5;
      const status = stock === 0 ? 'Out of Stock' : stock <= reorder ? 'Low Stock' : 'In Stock';
      const cleanName = (r.name || '').replace(/"/g, '""');
      const cleanBrand = (r.brand || '').replace(/"/g, '""');
      const cleanCat = (r.category || '').replace(/"/g, '""');

      csv += `"${cleanName}","${r.sku}","${cleanCat}","${cleanBrand}",${r.price || 0},${stock},${reorder},"${r.shelf || 'B'}",${r.row_number || 1},${r.column_number || 1},"${r.location_code || 'B-01-01'}","${status}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="StationAI_Inventory_Report.csv"');
    return res.send(csv);
  } catch (err) {
    console.error('CSV export error:', err);
    return res.status(500).json({ error: 'Failed to export inventory CSV' });
  }
}
