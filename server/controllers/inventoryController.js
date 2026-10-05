import { getDb } from '../database/db.js';
import { formatProductRow } from './productController.js';
import { logActivity } from './activityController.js';

export async function updateStock(req, res) {
  try {
    const { productId } = req.params;
    const { newStockValue, reason } = req.body;

    if (newStockValue === undefined || newStockValue < 0) {
      return res.status(400).json({ error: 'Valid non-negative stock value is required' });
    }

    const db = await getDb();
    const inv = await db.get(
      `SELECT i.*, p.name, p.expiry_tracking
       FROM inventory i
       JOIN products p ON i.product_id = p.id
       WHERE i.product_id = ?`,
      [productId]
    );

    if (!inv) {
      return res.status(404).json({ error: 'Inventory record not found' });
    }

    const prevQty = Number(inv.quantity);
    const newQty = Number(newStockValue);
    const diff = newQty - prevQty;

    let transactionType = 'ADJUSTMENT';
    if (diff > 0) transactionType = 'STOCK_IN';
    if (diff < 0) transactionType = 'STOCK_OUT';

    // Update inventory quantity
    await db.run(
      `UPDATE inventory SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`,
      [newQty, productId]
    );

    // FEFO Batch deduction if decreasing stock on an expiry tracked item
    if (inv.expiry_tracking && diff < 0) {
      let amountToDrop = Math.abs(diff);
      const batches = await db.query(
        `SELECT id, current_quantity, expiry_date FROM batches
         WHERE product_id = ? AND current_quantity > 0 AND expiry_date >= CURRENT_DATE
         ORDER BY expiry_date ASC`,
        [productId]
      );

      for (const b of batches) {
        if (amountToDrop <= 0) break;
        if (b.current_quantity >= amountToDrop) {
          await db.run(`UPDATE batches SET current_quantity = current_quantity - ? WHERE id = ?`, [amountToDrop, b.id]);
          amountToDrop = 0;
        } else {
          amountToDrop -= b.current_quantity;
          await db.run(`UPDATE batches SET current_quantity = 0 WHERE id = ?`, [b.id]);
        }
      }
    }

    // Log transaction
    await db.run(
      `INSERT INTO stock_transactions (product_id, transaction_type, quantity, previous_quantity, new_quantity, reason, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [productId, transactionType, Math.abs(diff), prevQty, newQty, reason || 'Stock Update', req.user?.id || null]
    );

    // Activity log entry
    await logActivity(db, {
      userId: req.user?.id || null,
      activityType: transactionType,
      productId,
      productName: inv.name,
      description: `Stock adjusted for "${inv.name}": ${prevQty} → ${newQty} units (${transactionType.replace('_', ' ')})`
    });

    // Auto notification check
    const reorderLevel = Number(inv.reorder_level);
    if (newQty === 0 && prevQty > 0) {
      await db.run(
        `INSERT INTO notifications (user_id, type, title, message, related_product_id)
         VALUES (?, 'error', ?, ?, ?)`,
        [req.user?.id || 1, `🔴 ${inv.name}`, `${inv.name} is now out of stock (0 units).`, productId]
      );
    } else if (newQty > 0 && newQty <= reorderLevel && prevQty > reorderLevel) {
      await db.run(
        `INSERT INTO notifications (user_id, type, title, message, related_product_id)
         VALUES (?, 'warning', ?, ?, ?)`,
        [req.user?.id || 1, `🟠 ${inv.name}`, `Low stock alert: Only ${newQty} units remaining.`, productId]
      );
    }

    const updatedProd = await db.get(
      `SELECT p.*, i.quantity, i.reorder_level, i.shelf, i.row_number, i.column_number, i.location_code,
              i.shelf_location, i.shelf_row, i.shelf_column, i.supplier
       FROM products p
       LEFT JOIN inventory i ON p.id = i.product_id
       WHERE p.id = ?`,
      [productId]
    );

    const product = await formatProductRow(db, updatedProd);
    return res.json({ message: 'Stock updated successfully', product });
  } catch (err) {
    console.error('Error updating stock:', err);
    return res.status(500).json({ error: 'Failed to update stock' });
  }
}

export async function stockIn(req, res) {
  try {
    const { productId, amount, reason } = req.body;
    const qtyToAdd = Number(amount);
    if (!productId || isNaN(qtyToAdd) || qtyToAdd <= 0) {
      return res.status(400).json({ error: 'Valid product ID and positive amount are required' });
    }

    const db = await getDb();
    const inv = await db.get(
      `SELECT i.*, p.name FROM inventory i JOIN products p ON i.product_id = p.id WHERE i.product_id = ?`,
      [productId]
    );
    if (!inv) return res.status(404).json({ error: 'Product inventory not found' });

    const prevQty = Number(inv.quantity);
    const newQty = prevQty + qtyToAdd;

    await db.run(`UPDATE inventory SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`, [newQty, productId]);
    await db.run(
      `INSERT INTO stock_transactions (product_id, transaction_type, quantity, previous_quantity, new_quantity, reason, user_id)
       VALUES (?, 'STOCK_IN', ?, ?, ?, ?, ?)`,
      [productId, qtyToAdd, prevQty, newQty, reason || 'Stock Received', req.user?.id || null]
    );

    // Activity log entry
    await logActivity(db, {
      userId: req.user?.id || null,
      activityType: 'STOCK_IN',
      productId,
      productName: inv.name,
      description: `Stock in for "${inv.name}": +${qtyToAdd} units (Total: ${newQty})`
    });

    const updatedProd = await db.get(
      `SELECT p.*, i.quantity, i.reorder_level, i.shelf, i.row_number, i.column_number, i.location_code,
              i.shelf_location, i.shelf_row, i.shelf_column, i.supplier
       FROM products p LEFT JOIN inventory i ON p.id = i.product_id WHERE p.id = ?`,
      [productId]
    );

    const product = await formatProductRow(db, updatedProd);
    return res.json({ message: `Successfully added ${qtyToAdd} units`, product });
  } catch (err) {
    console.error('Stock in error:', err);
    return res.status(500).json({ error: 'Failed to process stock in' });
  }
}

export async function stockOut(req, res) {
  try {
    const { productId, amount, reason } = req.body;
    const qtyToDeduct = Number(amount);
    if (!productId || isNaN(qtyToDeduct) || qtyToDeduct <= 0) {
      return res.status(400).json({ error: 'Valid product ID and positive amount are required' });
    }

    const db = await getDb();
    const inv = await db.get(
      `SELECT i.*, p.name FROM inventory i JOIN products p ON i.product_id = p.id WHERE i.product_id = ?`,
      [productId]
    );
    if (!inv) return res.status(404).json({ error: 'Product inventory not found' });

    const prevQty = Number(inv.quantity);
    if (prevQty < qtyToDeduct) {
      return res.status(400).json({ error: `Cannot deduct ${qtyToDeduct} units. Only ${prevQty} units available in stock.` });
    }

    const newQty = prevQty - qtyToDeduct;
    await db.run(`UPDATE inventory SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`, [newQty, productId]);
    await db.run(
      `INSERT INTO stock_transactions (product_id, transaction_type, quantity, previous_quantity, new_quantity, reason, user_id)
       VALUES (?, 'STOCK_OUT', ?, ?, ?, ?, ?)`,
      [productId, qtyToDeduct, prevQty, newQty, reason || 'Stock Sold / Issued', req.user?.id || null]
    );

    // Activity log entry
    await logActivity(db, {
      userId: req.user?.id || null,
      activityType: 'STOCK_OUT',
      productId,
      productName: inv.name,
      description: `Stock out for "${inv.name}": -${qtyToDeduct} units (Remaining: ${newQty})`
    });

    if (newQty === 0) {
      await db.run(
        `INSERT INTO notifications (user_id, type, title, message, related_product_id)
         VALUES (?, 'error', ?, ?, ?)`,
        [req.user?.id || 1, `🔴 ${inv.name}`, `${inv.name} is now out of stock.`, productId]
      );
    }

    const updatedProd = await db.get(
      `SELECT p.*, i.quantity, i.reorder_level, i.shelf, i.row_number, i.column_number, i.location_code,
              i.shelf_location, i.shelf_row, i.shelf_column, i.supplier
       FROM products p LEFT JOIN inventory i ON p.id = i.product_id WHERE p.id = ?`,
      [productId]
    );

    const product = await formatProductRow(db, updatedProd);
    return res.json({ message: `Deducted ${qtyToDeduct} units`, product });
  } catch (err) {
    console.error('Stock out error:', err);
    return res.status(500).json({ error: 'Failed to process stock out' });
  }
}

export async function getTransactions(req, res) {
  try {
    const db = await getDb();
    const rows = await db.query(
      `SELECT st.*, p.name as product_name, p.sku, u.name as user_name
       FROM stock_transactions st
       JOIN products p ON st.product_id = p.id
       LEFT JOIN users u ON st.user_id = u.id
       ORDER BY st.created_at DESC LIMIT 100`
    );

    const transactions = rows.map(t => ({
      id: t.id,
      productId: t.product_id,
      productName: t.product_name,
      sku: t.sku,
      transactionType: t.transaction_type,
      quantity: t.quantity,
      previousQuantity: t.previous_quantity,
      newQuantity: t.new_quantity,
      reason: t.reason || 'N/A',
      userName: t.user_name || 'System / Admin',
      createdAt: t.created_at
    }));

    return res.json({ transactions });
  } catch (err) {
    console.error('Error fetching transactions:', err);
    return res.status(500).json({ error: 'Failed to fetch stock transactions' });
  }
}
