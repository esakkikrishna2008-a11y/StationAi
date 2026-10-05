import { getDb } from '../database/db.js';
import { logActivity } from './activityController.js';
import { parseLocationValues } from './productController.js';

/**
 * Generate unique Billing ID in format: BILL-YYYY-000001
 * Guaranteed unique generated on backend.
 */
export async function generateBillingId(db) {
  const currentYear = new Date().getFullYear();
  const prefix = `BILL-${currentYear}-`;

  const lastBill = await db.get(
    `SELECT billing_id FROM bills WHERE billing_id LIKE ? ORDER BY id DESC LIMIT 1`,
    [`${prefix}%`]
  );

  let nextSeq = 1;
  if (lastBill && lastBill.billing_id) {
    const parts = lastBill.billing_id.split('-');
    if (parts.length >= 3) {
      const parsedSeq = parseInt(parts[2], 10);
      if (!isNaN(parsedSeq) && parsedSeq >= 1) {
        nextSeq = parsedSeq + 1;
      }
    }
  }

  return `${prefix}${String(nextSeq).padStart(6, '0')}`;
}

/**
 * Complete Bill - Atomic Database Transaction
 * 1. Validate real DB stock for each cart item
 * 2. Validate FEFO / Expired batch constraints
 * 3. Validate cash amounts & payment references
 * 4. Create billing record
 * 5. Create billing item records
 * 6. Reduce product stock & batches (FEFO)
 * 7. Create stock movement records (movement_type = 'SALE', reference_id = billing_id)
 * 8. Update notifications & activity logs
 * 9. Commit or Rollback
 */
export async function createBill(req, res) {
  const db = await getDb();
  let transactionActive = false;

  try {
    const {
      items,
      discount = 0,
      discountType = 'flat', // 'flat' or 'percent'
      tax = 0,
      paymentMethod = 'Cash',
      cashReceived = 0,
      amountReceived = 0,
      transactionRef = '',
      customerName = 'Walk-in Customer',
      customerPhone = ''
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty. Please add at least one product.' });
    }

    // Validate payment method
    const validPaymentMethods = ['Cash', 'UPI', 'Card'];
    const finalPaymentMethod = validPaymentMethods.includes(paymentMethod) ? paymentMethod : 'Cash';

    // Start Atomic Transaction
    await db.beginTransaction();
    transactionActive = true;

    // Generate unique Billing ID
    const billingId = await generateBillingId(db);

    let subtotal = 0;
    const processedItems = [];
    const notificationsToCreate = [];
    const activitiesToLog = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Phase 1: Stock & Expiry Validation & Real-time Decrements
    for (const item of items) {
      const productId = Number(item.productId || item.id);
      const requestedQty = parseInt(item.quantity, 10);

      if (!productId || isNaN(requestedQty) || requestedQty <= 0) {
        throw new Error('Invalid product or quantity in cart.');
      }

      // Fetch actual database stock
      const prodRecord = await db.get(
        `SELECT p.*, i.quantity as stock_quantity, i.reorder_level, i.shelf, i.row_number, i.column_number, i.location_code
         FROM products p
         JOIN inventory i ON p.id = i.product_id
         WHERE p.id = ?`,
        [productId]
      );

      if (!prodRecord) {
        throw new Error(`Product #${productId} not found in inventory.`);
      }

      const availableStock = Number(prodRecord.stock_quantity || 0);

      if (availableStock <= 0) {
        throw new Error(`"${prodRecord.name}" is OUT OF STOCK (0 units available).`);
      }

      if (requestedQty > availableStock) {
        throw new Error(`Only ${availableStock} units available for "${prodRecord.name}".`);
      }

      // Check Expiry / Batches if expiry tracking is enabled
      if (prodRecord.expiry_tracking) {
        const availableBatches = await db.query(
          `SELECT id, batch_number, current_quantity, expiry_date FROM batches
           WHERE product_id = ? AND current_quantity > 0
           ORDER BY expiry_date ASC`,
          [productId]
        );

        if (availableBatches.length > 0) {
          // Check if all batches are expired
          const validBatches = availableBatches.filter(b => {
            const exp = new Date(b.expiry_date);
            exp.setHours(0, 0, 0, 0);
            return exp >= today;
          });

          if (validBatches.length === 0) {
            throw new Error(`This product ("${prodRecord.name}") has expired stock and cannot be billed.`);
          }
        }
      }

      const unitPrice = Number(item.unitPrice !== undefined ? item.unitPrice : (item.price !== undefined ? item.price : prodRecord.price));
      const itemTotal = unitPrice * requestedQty;
      subtotal += itemTotal;

      const previousStock = availableStock;
      const newStock = previousStock - requestedQty;

      // 1. Decrease Inventory Stock
      await db.run(
        `UPDATE inventory SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`,
        [newStock, productId]
      );

      // 2. FEFO Batch deduction if expiry tracking enabled
      if (prodRecord.expiry_tracking) {
        let qtyToDeduct = requestedQty;
        const batches = await db.query(
          `SELECT id, current_quantity FROM batches
           WHERE product_id = ? AND current_quantity > 0
           ORDER BY expiry_date ASC`,
          [productId]
        );

        for (const batch of batches) {
          if (qtyToDeduct <= 0) break;
          const currentBatchQty = Number(batch.current_quantity);
          if (currentBatchQty >= qtyToDeduct) {
            await db.run(
              `UPDATE batches SET current_quantity = current_quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
              [qtyToDeduct, batch.id]
            );
            qtyToDeduct = 0;
          } else {
            qtyToDeduct -= currentBatchQty;
            await db.run(
              `UPDATE batches SET current_quantity = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
              [batch.id]
            );
          }
        }
      }

      // 3. Record Stock Movement (SALE)
      await db.run(
        `INSERT INTO stock_movements (product_id, movement_type, quantity, reference_id, previous_stock, new_stock, user_id)
         VALUES (?, 'SALE', ?, ?, ?, ?, ?)`,
        [productId, requestedQty, billingId, previousStock, newStock, req.user?.id || null]
      );

      // 4. Record Stock Transaction (for backwards compatibility)
      await db.run(
        `INSERT INTO stock_transactions (product_id, transaction_type, quantity, previous_quantity, new_quantity, reason, user_id)
         VALUES (?, 'STOCK_OUT', ?, ?, ?, ?, ?)`,
        [productId, requestedQty, previousStock, newStock, `Billed in ${billingId}`, req.user?.id || null]
      );

      // 5. Activity log item
      activitiesToLog.push({
        userId: req.user?.id || null,
        activityType: 'STOCK_OUT',
        productId,
        productName: prodRecord.name,
        description: `Billed ${requestedQty} units of "${prodRecord.name}" (${billingId})`
      });

      // 6. Stock Alerts Check
      const reorderLevel = Number(prodRecord.reorder_level || 5);
      if (newStock === 0) {
        notificationsToCreate.push({
          userId: req.user?.id || 1,
          type: 'error',
          title: `🔴 ${prodRecord.name}`,
          message: `${prodRecord.name} is out of stock.`,
          relatedProductId: productId
        });
      } else if (newStock <= reorderLevel && previousStock > reorderLevel) {
        notificationsToCreate.push({
          userId: req.user?.id || 1,
          type: 'warning',
          title: `🟠 ${prodRecord.name}`,
          message: `${prodRecord.name} is low in stock — ${newStock} units remaining.`,
          relatedProductId: productId
        });
      }

      processedItems.push({
        productId,
        productName: prodRecord.name,
        sku: prodRecord.sku,
        quantity: requestedQty,
        unitPrice,
        totalPrice: itemTotal,
        locationCode: prodRecord.location_code,
        previousStock,
        newStock
      });
    }

    // Phase 2: Totals & Discount Calculation
    let discountAmount = 0;
    const rawDiscount = Number(discount) || 0;
    if (discountType === 'percent') {
      discountAmount = (subtotal * Math.min(Math.max(rawDiscount, 0), 100)) / 100;
    } else {
      discountAmount = Math.min(Math.max(rawDiscount, 0), subtotal);
    }

    const discountedSubtotal = Math.max(0, subtotal - discountAmount);
    const taxAmount = Number(tax) || 0;
    const grandTotal = Math.round((discountedSubtotal + taxAmount) * 100) / 100;

    // Phase 3: Payment Validation (Cash change or Ref ID)
    let finalCashReceived = Number(cashReceived || amountReceived || 0);
    let finalChangeAmount = 0;
    let finalTransactionRef = String(transactionRef || '').trim();

    if (finalPaymentMethod === 'Cash') {
      if (finalCashReceived > 0) {
        if (finalCashReceived < grandTotal) {
          throw new Error(`Amount received (₹${finalCashReceived}) is insufficient. Total bill is ₹${grandTotal}.`);
        }
        finalChangeAmount = Math.max(0, Math.round((finalCashReceived - grandTotal) * 100) / 100);
      } else {
        finalCashReceived = grandTotal;
        finalChangeAmount = 0;
      }
    }

    // Phase 4: Create Bill Record
    const billInsertRes = await db.run(
      `INSERT INTO bills (billing_id, subtotal, discount, tax, grand_total, payment_method, status, customer_name, customer_phone, user_id, cash_received, change_amount, transaction_ref)
       VALUES (?, ?, ?, ?, ?, ?, 'Completed', ?, ?, ?, ?, ?, ?)`,
      [
        billingId,
        subtotal,
        discountAmount,
        taxAmount,
        grandTotal,
        finalPaymentMethod,
        customerName || 'Walk-in Customer',
        customerPhone || '',
        req.user?.id || null,
        finalCashReceived,
        finalChangeAmount,
        finalTransactionRef
      ]
    );

    const billId = billInsertRes.lastID;

    // Phase 5: Create Bill Items Records
    for (const pItem of processedItems) {
      await db.run(
        `INSERT INTO bill_items (bill_id, product_id, product_name, sku, quantity, unit_price, total_price, returned_quantity)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          billId,
          pItem.productId,
          pItem.productName,
          pItem.sku,
          pItem.quantity,
          pItem.unitPrice,
          pItem.totalPrice
        ]
      );
    }

    // Phase 6: Notifications & Activity Logs
    for (const notif of notificationsToCreate) {
      await db.run(
        `INSERT INTO notifications (user_id, type, title, message, related_product_id)
         VALUES (?, ?, ?, ?, ?)`,
        [notif.userId, notif.type, notif.title, notif.message, notif.relatedProductId]
      );
    }

    for (const act of activitiesToLog) {
      await logActivity(db, act);
    }

    // Commit the entire atomic transaction
    await db.commit();
    transactionActive = false;

    // Fetch Shop Settings for invoice formatting
    const settings = await db.get(`SELECT * FROM settings WHERE id = 1`) || {
      shop_name: 'StationAI Central Mart',
      currency: '₹'
    };

    const completedBill = {
      id: billId,
      billingId,
      subtotal,
      discount: discountAmount,
      tax: taxAmount,
      grandTotal,
      paymentMethod: finalPaymentMethod,
      cashReceived: finalCashReceived,
      changeAmount: finalChangeAmount,
      transactionRef: finalTransactionRef,
      status: 'Completed',
      customerName: customerName || 'Walk-in Customer',
      customerPhone: customerPhone || '',
      cashierName: req.user?.name || 'Staff Cashier',
      createdAt: new Date().toISOString(),
      items: processedItems,
      shop: {
        name: settings.shop_name || 'StationAI Central Mart',
        currency: settings.currency || '₹'
      }
    };

    return res.status(201).json({
      success: true,
      message: 'Bill completed successfully',
      bill: completedBill
    });
  } catch (err) {
    if (transactionActive) {
      await db.rollback();
    }
    console.error('Create Bill Transaction Error:', err);
    return res.status(400).json({
      success: false,
      error: err.message || 'Failed to complete billing transaction. Stock remains unchanged.'
    });
  }
}

/**
 * Get All Bills (Billing History) with advanced search and date range filters
 */
export async function getBills(req, res) {
  try {
    const db = await getDb();
    const {
      search,
      paymentMethod,
      status,
      dateFilter, // 'today', 'yesterday', 'week', 'month', 'custom'
      startDate,
      endDate,
      limit = 100,
      offset = 0
    } = req.query;

    let sql = `
      SELECT b.*,
             COUNT(DISTINCT bi.id) as items_count,
             COALESCE(SUM(bi.quantity), 0) as total_quantity,
             COALESCE(SUM(bi.returned_quantity), 0) as total_returned_quantity,
             u.name as cashier_name
      FROM bills b
      LEFT JOIN bill_items bi ON b.id = bi.bill_id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      sql += ` AND (
        b.billing_id LIKE ? OR
        b.customer_name LIKE ? OR
        b.customer_phone LIKE ? OR
        b.transaction_ref LIKE ? OR
        b.id IN (SELECT bill_id FROM bill_items WHERE product_name LIKE ? OR sku LIKE ?)
      )`;
      params.push(term, term, term, term, term, term);
    }

    if (paymentMethod && paymentMethod !== 'ALL') {
      sql += ` AND b.payment_method = ?`;
      params.push(paymentMethod);
    }

    if (status && status !== 'ALL') {
      sql += ` AND b.status = ?`;
      params.push(status);
    }

    // Date range filters
    const now = new Date();
    if (dateFilter === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      sql += ` AND (DATE(b.created_at) = DATE(?) OR b.created_at LIKE ?)`;
      params.push(todayStr, `${todayStr}%`);
    } else if (dateFilter === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = yest.toISOString().split('T')[0];
      sql += ` AND (DATE(b.created_at) = DATE(?) OR b.created_at LIKE ?)`;
      params.push(yestStr, `${yestStr}%`);
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekStr = weekAgo.toISOString().split('T')[0];
      sql += ` AND DATE(b.created_at) >= DATE(?)`;
      params.push(weekStr);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now);
      monthAgo.setDate(monthAgo.getDate() - 30);
      const monthStr = monthAgo.toISOString().split('T')[0];
      sql += ` AND DATE(b.created_at) >= DATE(?)`;
      params.push(monthStr);
    } else if (dateFilter === 'custom' && startDate && endDate) {
      sql += ` AND DATE(b.created_at) >= DATE(?) AND DATE(b.created_at) <= DATE(?)`;
      params.push(startDate, endDate);
    }

    sql += ` GROUP BY b.id ORDER BY b.id DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const rows = await db.query(sql, params);

    const bills = rows.map(r => ({
      id: r.id,
      billingId: r.billing_id,
      subtotal: Number(r.subtotal),
      discount: Number(r.discount),
      tax: Number(r.tax),
      grandTotal: Number(r.grand_total),
      paymentMethod: r.payment_method,
      cashReceived: Number(r.cash_received || 0),
      changeAmount: Number(r.change_amount || 0),
      transactionRef: r.transaction_ref || '',
      status: r.status,
      voidedReason: r.voided_reason || '',
      voidedAt: r.voided_at || null,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      itemsCount: Number(r.items_count),
      totalQuantity: Number(r.total_quantity),
      totalReturnedQuantity: Number(r.total_returned_quantity),
      cashierName: r.cashier_name || 'Admin',
      createdAt: r.created_at
    }));

    return res.json({ bills });
  } catch (err) {
    console.error('Error fetching bills:', err);
    return res.status(500).json({ error: 'Failed to fetch billing history' });
  }
}

/**
 * Get Bill By ID (with complete items, inventory impact and shop details for invoice)
 */
export async function getBillById(req, res) {
  try {
    const { id } = req.params;
    const db = await getDb();

    let billRow;
    if (isNaN(Number(id))) {
      billRow = await db.get(
        `SELECT b.*, u.name as cashier_name, vu.name as voided_by_name
         FROM bills b
         LEFT JOIN users u ON b.user_id = u.id
         LEFT JOIN users vu ON b.voided_by = vu.id
         WHERE b.billing_id = ?`,
        [id]
      );
    } else {
      billRow = await db.get(
        `SELECT b.*, u.name as cashier_name, vu.name as voided_by_name
         FROM bills b
         LEFT JOIN users u ON b.user_id = u.id
         LEFT JOIN users vu ON b.voided_by = vu.id
         WHERE b.id = ?`,
        [Number(id)]
      );
    }

    if (!billRow) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const itemRows = await db.query(
      `SELECT bi.*, i.shelf, i.row_number, i.column_number, i.location_code
       FROM bill_items bi
       LEFT JOIN inventory i ON bi.product_id = i.product_id
       WHERE bi.bill_id = ?
       ORDER BY bi.id ASC`,
      [billRow.id]
    );

    // Fetch stock movements associated with this bill for exact inventory impact
    const movements = await db.query(
      `SELECT * FROM stock_movements WHERE reference_id = ?`,
      [billRow.billing_id]
    );

    const items = itemRows.map(it => {
      const loc = parseLocationValues({
        shelf: it.shelf,
        row_number: it.row_number,
        column_number: it.column_number,
        location_code: it.location_code
      });

      const movement = movements.find(m => m.product_id === it.product_id && m.movement_type === 'SALE');

      return {
        id: it.id,
        billId: it.bill_id,
        productId: it.product_id,
        productName: it.product_name,
        sku: it.sku,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unit_price),
        totalPrice: Number(it.total_price),
        returnedQuantity: Number(it.returned_quantity || 0),
        availableForReturn: Math.max(0, Number(it.quantity) - Number(it.returned_quantity || 0)),
        locationCode: loc.locationCode,
        locationDisplay: loc.locationDisplay,
        inventoryImpact: movement ? {
          previousStock: Number(movement.previous_stock),
          newStock: Number(movement.new_stock),
          difference: -(Number(it.quantity))
        } : null
      };
    });

    const settings = await db.get(`SELECT * FROM settings WHERE id = 1`) || {
      shop_name: 'StationAI Central Mart',
      currency: '₹'
    };

    const bill = {
      id: billRow.id,
      billingId: billRow.billing_id,
      subtotal: Number(billRow.subtotal),
      discount: Number(billRow.discount),
      tax: Number(billRow.tax),
      grandTotal: Number(billRow.grand_total),
      paymentMethod: billRow.payment_method,
      cashReceived: Number(billRow.cash_received || 0),
      changeAmount: Number(billRow.change_amount || 0),
      transactionRef: billRow.transaction_ref || '',
      status: billRow.status,
      voidedReason: billRow.voided_reason || '',
      voidedBy: billRow.voided_by || null,
      voidedByName: billRow.voided_by_name || 'Admin',
      voidedAt: billRow.voided_at || null,
      customerName: billRow.customer_name || 'Walk-in Customer',
      customerPhone: billRow.customer_phone || '',
      cashierName: billRow.cashier_name || 'Admin',
      createdAt: billRow.created_at,
      items,
      shop: {
        name: settings.shop_name || 'StationAI Central Mart',
        currency: settings.currency || '₹'
      }
    };

    return res.json({ bill });
  } catch (err) {
    console.error('Error fetching bill details:', err);
    return res.status(500).json({ error: 'Failed to fetch bill details' });
  }
}

/**
 * Cancel / Void Bill (Admin authorization required)
 * Restores product stock to inventory in an atomic transaction.
 */
export async function voidBill(req, res) {
  const db = await getDb();
  let transactionActive = false;

  try {
    const { id } = req.params;
    const { reason = 'Order cancelled / Billing error' } = req.body;

    // Check authorization: Admin role required
    if (req.user && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Permission denied. Only Administrator accounts can void bills.' });
    }

    let billRow;
    if (isNaN(Number(id))) {
      billRow = await db.get(`SELECT * FROM bills WHERE billing_id = ?`, [id]);
    } else {
      billRow = await db.get(`SELECT * FROM bills WHERE id = ?`, [Number(id)]);
    }

    if (!billRow) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    if (billRow.status === 'Voided') {
      return res.status(400).json({ error: `Bill ${billRow.billing_id} is already voided.` });
    }

    await db.beginTransaction();
    transactionActive = true;

    // Fetch all items from this bill
    const items = await db.query(`SELECT * FROM bill_items WHERE bill_id = ?`, [billRow.id]);

    for (const item of items) {
      const netQtyToRestore = Number(item.quantity) - Number(item.returned_quantity || 0);
      if (netQtyToRestore > 0 && item.product_id) {
        // Fetch current stock
        const inv = await db.get(
          `SELECT i.quantity, p.name, p.expiry_tracking FROM inventory i JOIN products p ON i.product_id = p.id WHERE i.product_id = ?`,
          [item.product_id]
        );

        if (inv) {
          const previousStock = Number(inv.quantity);
          const newStock = previousStock + netQtyToRestore;

          // 1. Restore inventory quantity
          await db.run(
            `UPDATE inventory SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`,
            [newStock, item.product_id]
          );

          // 2. Restore batch if expiry tracking enabled
          if (inv.expiry_tracking) {
            const batch = await db.get(
              `SELECT id FROM batches WHERE product_id = ? ORDER BY expiry_date DESC LIMIT 1`,
              [item.product_id]
            );
            if (batch) {
              await db.run(
                `UPDATE batches SET current_quantity = current_quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [netQtyToRestore, batch.id]
              );
            }
          }

          // 3. Record stock movement (RETURN / VOID_RESTORE)
          await db.run(
            `INSERT INTO stock_movements (product_id, movement_type, quantity, reference_id, previous_stock, new_stock, user_id)
             VALUES (?, 'RETURN', ?, ?, ?, ?, ?)`,
            [item.product_id, netQtyToRestore, billRow.billing_id, previousStock, newStock, req.user?.id || null]
          );

          // 4. Record stock transaction
          await db.run(
            `INSERT INTO stock_transactions (product_id, transaction_type, quantity, previous_quantity, new_quantity, reason, user_id)
             VALUES (?, 'RETURN', ?, ?, ?, ?, ?)`,
            [item.product_id, netQtyToRestore, previousStock, newStock, `Voided bill ${billRow.billing_id}: ${reason}`, req.user?.id || null]
          );
        }
      }
    }

    // Update bill status to Voided
    await db.run(
      `UPDATE bills SET status = 'Voided', voided_reason = ?, voided_by = ?, voided_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [reason || 'Voided by Admin', req.user?.id || null, billRow.id]
    );

    // Activity log
    await logActivity(db, {
      userId: req.user?.id || null,
      activityType: 'STOCK_ADJUSTMENT',
      productId: null,
      productName: billRow.billing_id,
      description: `Voided bill ${billRow.billing_id}. Restored items back to stock. Reason: ${reason}`
    });

    await db.commit();
    transactionActive = false;

    return res.json({
      success: true,
      message: `Bill ${billRow.billing_id} has been voided. All sold quantities have been restored to inventory.`,
      billingId: billRow.billing_id,
      status: 'Voided'
    });
  } catch (err) {
    if (transactionActive) {
      await db.rollback();
    }
    console.error('Void bill error:', err);
    return res.status(400).json({ error: err.message || 'Failed to void bill.' });
  }
}

/**
 * Return Billed Item(s)
 * Stock increases again, creates 'RETURN' stock_movement, updates bill item returned_quantity.
 */
export async function returnBillItem(req, res) {
  const db = await getDb();
  let transactionActive = false;

  try {
    const { id } = req.params; // bill_id or bill_item_id
    const { billItemId, returnQuantity, reason } = req.body;

    const qtyToReturn = parseInt(returnQuantity, 10);
    if (!billItemId || isNaN(qtyToReturn) || qtyToReturn <= 0) {
      return res.status(400).json({ error: 'Valid item and positive return quantity are required.' });
    }

    await db.beginTransaction();
    transactionActive = true;

    // Fetch Bill Item
    const billItem = await db.get(
      `SELECT bi.*, b.billing_id, b.status as bill_status
       FROM bill_items bi
       JOIN bills b ON bi.bill_id = b.id
       WHERE bi.id = ?`,
      [billItemId]
    );

    if (!billItem) {
      throw new Error('Bill item record not found.');
    }

    if (billItem.bill_status === 'Voided') {
      throw new Error('Cannot process returns on a voided bill.');
    }

    const billedQty = Number(billItem.quantity);
    const alreadyReturned = Number(billItem.returned_quantity || 0);
    const availableToReturn = billedQty - alreadyReturned;

    if (qtyToReturn > availableToReturn) {
      throw new Error(`Cannot return ${qtyToReturn} units. Only ${availableToReturn} units eligible for return.`);
    }

    const productId = billItem.product_id;
    if (!productId) {
      throw new Error('Associated product no longer exists in system.');
    }

    // Fetch current inventory stock
    const inv = await db.get(
      `SELECT i.*, p.name, p.expiry_tracking FROM inventory i JOIN products p ON i.product_id = p.id WHERE i.product_id = ?`,
      [productId]
    );

    if (!inv) {
      throw new Error('Product inventory record not found.');
    }

    const previousStock = Number(inv.quantity);
    const newStock = previousStock + qtyToReturn;

    // 1. Increase inventory stock
    await db.run(
      `UPDATE inventory SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`,
      [newStock, productId]
    );

    // 2. If expiry tracking, increment the newest batch
    if (inv.expiry_tracking) {
      const batch = await db.get(
        `SELECT id FROM batches WHERE product_id = ? ORDER BY expiry_date DESC LIMIT 1`,
        [productId]
      );
      if (batch) {
        await db.run(
          `UPDATE batches SET current_quantity = current_quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          [qtyToReturn, batch.id]
        );
      }
    }

    // 3. Record Stock Movement (RETURN)
    await db.run(
      `INSERT INTO stock_movements (product_id, movement_type, quantity, reference_id, previous_stock, new_stock, user_id)
       VALUES (?, 'RETURN', ?, ?, ?, ?, ?)`,
      [productId, qtyToReturn, billItem.billing_id, previousStock, newStock, req.user?.id || null]
    );

    // 4. Record Stock Transaction (for backwards compatibility)
    await db.run(
      `INSERT INTO stock_transactions (product_id, transaction_type, quantity, previous_quantity, new_quantity, reason, user_id)
       VALUES (?, 'RETURN', ?, ?, ?, ?, ?)`,
      [productId, qtyToReturn, previousStock, newStock, `Return for ${billItem.billing_id}: ${reason || 'Customer Return'}`, req.user?.id || null]
    );

    // 5. Update Bill Item returned_quantity
    const updatedReturnedQty = alreadyReturned + qtyToReturn;
    await db.run(
      `UPDATE bill_items SET returned_quantity = ? WHERE id = ?`,
      [updatedReturnedQty, billItemId]
    );

    // 6. Check total bill status
    const allItems = await db.query(`SELECT quantity, returned_quantity FROM bill_items WHERE bill_id = ?`, [billItem.bill_id]);
    const totalBilled = allItems.reduce((acc, curr) => acc + Number(curr.quantity), 0);
    const totalReturned = allItems.reduce((acc, curr) => acc + Number(curr.returned_quantity || 0), 0);

    let newBillStatus = 'Completed';
    if (totalReturned >= totalBilled) {
      newBillStatus = 'Returned';
    } else if (totalReturned > 0) {
      newBillStatus = 'Partially Returned';
    }

    await db.run(`UPDATE bills SET status = ? WHERE id = ?`, [newBillStatus, billItem.bill_id]);

    // 7. Activity Log
    await logActivity(db, {
      userId: req.user?.id || null,
      activityType: 'RETURN',
      productId,
      productName: inv.name,
      description: `Returned ${qtyToReturn} units of "${inv.name}" (Bill: ${billItem.billing_id})`
    });

    await db.commit();
    transactionActive = false;

    return res.json({
      success: true,
      message: `Successfully processed return of ${qtyToReturn} units. Stock is now ${newStock}.`,
      productId,
      newStock,
      billStatus: newBillStatus
    });
  } catch (err) {
    if (transactionActive) {
      await db.rollback();
    }
    console.error('Return item error:', err);
    return res.status(400).json({ error: err.message || 'Failed to process item return.' });
  }
}

/**
 * Get Stock Movements Audit Trail
 */
export async function getStockMovements(req, res) {
  try {
    const db = await getDb();
    const { productId, movementType, limit = 150, offset = 0 } = req.query;

    let sql = `
      SELECT sm.*, p.name as product_name, p.sku, p.category, p.brand, u.name as user_name
      FROM stock_movements sm
      JOIN products p ON sm.product_id = p.id
      LEFT JOIN users u ON sm.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (productId) {
      sql += ` AND sm.product_id = ?`;
      params.push(Number(productId));
    }

    if (movementType && movementType !== 'ALL') {
      sql += ` AND sm.movement_type = ?`;
      params.push(movementType);
    }

    sql += ` ORDER BY sm.created_at DESC, sm.id DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const rows = await db.query(sql, params);

    const movements = rows.map(m => ({
      id: m.id,
      productId: m.product_id,
      productName: m.product_name,
      sku: m.sku,
      category: m.category,
      brand: m.brand,
      movementType: m.movement_type,
      quantity: Number(m.quantity),
      referenceId: m.reference_id || '—',
      previousStock: Number(m.previous_stock),
      newStock: Number(m.new_stock),
      userName: m.user_name || 'Admin',
      createdAt: m.created_at
    }));

    return res.json({ movements });
  } catch (err) {
    console.error('Error fetching stock movements:', err);
    return res.status(500).json({ error: 'Failed to fetch stock movements audit trail' });
  }
}

