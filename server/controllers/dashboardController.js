import { getDb } from '../database/db.js';
import { calculateExpiryStatus } from './expiryController.js';
import { parseLocationValues } from './productController.js';

export async function getDashboardStats(req, res) {
  try {
    const db = await getDb();

    // 1. Total products
    const totalProdRow = await db.get(`SELECT COUNT(*) as total FROM products`);
    const totalProducts = totalProdRow?.total || 0;

    // 2. Inventory breakdown
    const invRows = await db.query(
      `SELECT i.quantity, i.reorder_level FROM inventory i`
    );

    let availableCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    invRows.forEach(item => {
      const q = Number(item.quantity);
      const r = Number(item.reorder_level);
      if (q === 0) outOfStockCount++;
      else if (q <= r) lowStockCount++;
      else availableCount++;
    });

    // 3. Batch Expiry counts
    const batchRows = await db.query(`SELECT expiry_date FROM batches WHERE current_quantity > 0`);
    let expiredCount = 0;
    let expiringSoonCount = 0;
    let criticalCount = 0;

    batchRows.forEach(b => {
      const st = calculateExpiryStatus(b.expiry_date);
      if (st === 'EXPIRED') expiredCount++;
      if (st === 'CRITICAL') criticalCount++;
      if (st === 'EXPIRING SOON') expiringSoonCount++;
    });

    // 4. Stock Alerts (Low stock and Out of Stock)
    const alertRows = await db.query(
      `SELECT p.id, p.name, p.sku, p.category, p.brand, p.image_url,
              i.quantity, i.reorder_level, i.shelf, i.row_number, i.column_number, i.location_code,
              i.shelf_location, i.shelf_row, i.shelf_column
       FROM products p
       JOIN inventory i ON p.id = i.product_id
       WHERE i.quantity <= i.reorder_level
       ORDER BY i.quantity ASC, p.id DESC LIMIT 8`
    );

    const stockAlerts = alertRows.map(r => {
      const loc = parseLocationValues({
        shelf: r.shelf,
        row_number: r.row_number,
        column_number: r.column_number,
        location_code: r.location_code,
        shelf_location: r.shelf_location,
        row: r.shelf_row,
        column: r.shelf_column
      });
      return {
        id: r.id,
        name: r.name,
        sku: r.sku,
        category: r.category,
        brand: r.brand,
        image: r.image_url,
        stock: Number(r.quantity),
        reorderLevel: Number(r.reorder_level),
        shelf: loc.locationCode,
        shelfSlot: loc.locationCode,
        locationCode: loc.locationCode,
        locationDisplay: loc.locationDisplay,
        status: Number(r.quantity) === 0 ? 'Out of Stock' : 'Low Stock'
      };
    });

    // 5. Expiry Alerts
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expRows = await db.query(
      `SELECT b.*, p.name as product_name, p.sku, p.category, p.brand,
              i.shelf as product_shelf, i.row_number as product_row_number, i.column_number as product_col_number,
              i.location_code as product_location_code,
              i.shelf_location as legacy_shelf, i.shelf_row as legacy_row, i.shelf_column as legacy_column
       FROM batches b
       JOIN products p ON b.product_id = p.id
       LEFT JOIN inventory i ON p.id = i.product_id
       WHERE b.current_quantity > 0
       ORDER BY b.expiry_date ASC LIMIT 8`
    );

    const expiryAlerts = expRows.map(b => {
      const exp = new Date(b.expiry_date);
      exp.setHours(0, 0, 0, 0);
      const daysRemaining = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
      const expiryStatus = calculateExpiryStatus(b.expiry_date);
      const loc = parseLocationValues({
        shelf: b.shelf || b.product_shelf,
        row_number: b.row_number || b.product_row_number,
        column_number: b.column_number || b.product_col_number,
        location_code: b.location_code || b.product_location_code || b.shelf_location || b.legacy_shelf
      });

      return {
        id: b.id,
        productId: b.product_id,
        productName: b.product_name,
        sku: b.sku,
        category: b.category,
        batchNumber: b.batch_number,
        currentQuantity: b.current_quantity,
        expiryDate: b.expiry_date,
        shelf: loc.locationCode,
        locationCode: loc.locationCode,
        locationDisplay: loc.locationDisplay,
        daysRemaining,
        expiryStatus
      };
    }).filter(a => a.expiryStatus !== 'SAFE');

    // 6. Today's Sales & Billing Metrics (Calculated dynamically from bills excluding voided)
    let todaySales = 0;
    let billsToday = 0;
    let itemsSoldToday = 0;

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const salesRow = await db.get(
        `SELECT COALESCE(SUM(grand_total), 0) as total_sales, COUNT(*) as bills_count
         FROM bills
         WHERE status != 'Voided' AND (DATE(created_at) = DATE(?) OR created_at LIKE ?)`,
        [todayStr, `${todayStr}%`]
      );

      if (salesRow) {
        todaySales = Number(salesRow.total_sales || 0);
        billsToday = Number(salesRow.bills_count || 0);
      }

      const itemsRow = await db.get(
        `SELECT COALESCE(SUM(bi.quantity), 0) as total_items
         FROM bill_items bi
         JOIN bills b ON bi.bill_id = b.id
         WHERE b.status != 'Voided' AND (DATE(b.created_at) = DATE(?) OR b.created_at LIKE ?)`,
        [todayStr, `${todayStr}%`]
      );

      if (itemsRow) {
        itemsSoldToday = Number(itemsRow.total_items || 0);
      }
    } catch (e) {
      console.warn('Dashboard sales query warning:', e.message);
    }

    // 7. Recent Bills
    let recentBills = [];
    try {
      const recentBillRows = await db.query(
        `SELECT b.*, COUNT(bi.id) as items_count, COALESCE(SUM(bi.quantity), 0) as total_quantity
         FROM bills b
         LEFT JOIN bill_items bi ON b.id = bi.bill_id
         GROUP BY b.id
         ORDER BY b.id DESC LIMIT 5`
      );

      recentBills = recentBillRows.map(b => ({
        id: b.id,
        billingId: b.billing_id,
        grandTotal: Number(b.grand_total),
        subtotal: Number(b.subtotal),
        discount: Number(b.discount),
        paymentMethod: b.payment_method,
        status: b.status,
        customerName: b.customer_name || 'Walk-in Customer',
        itemsCount: Number(b.items_count),
        totalQuantity: Number(b.total_quantity),
        createdAt: b.created_at
      }));
    } catch (e) {
      console.warn('Dashboard recent bills warning:', e.message);
    }

    // 8. Recently Added Products
    const recentProdRows = await db.query(
      `SELECT p.*, i.quantity, i.reorder_level, i.shelf, i.row_number, i.column_number, i.location_code,
              i.shelf_location, i.shelf_row, i.shelf_column
       FROM products p
       LEFT JOIN inventory i ON p.id = i.product_id
       ORDER BY p.id DESC LIMIT 5`
    );

    const recentProducts = recentProdRows.map(p => {
      const loc = parseLocationValues({
        shelf: p.shelf,
        row_number: p.row_number,
        column_number: p.column_number,
        location_code: p.location_code,
        shelf_location: p.shelf_location,
        row: p.shelf_row,
        column: p.shelf_column
      });
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        brand: p.brand,
        price: Number(p.price),
        stock: Number(p.quantity || 0),
        reorderLevel: Number(p.reorder_level || 5),
        shelf: loc.locationCode,
        shelfSlot: loc.locationCode,
        locationCode: loc.locationCode,
        locationDisplay: loc.locationDisplay,
        image: p.image_url,
        createdAt: p.created_at
      };
    });

    return res.json({
      success: true,
      stats: {
        totalProducts,
        available: availableCount,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
        expiringSoon: expiringSoonCount + criticalCount,
        expired: expiredCount,
        critical: criticalCount,
        todaySales,
        billsToday,
        itemsSoldToday
      },
      stockAlerts,
      expiryAlerts,
      recentBills,
      recentProducts
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch dashboard statistics' });
  }
}

