import { getDb } from '../database/db.js';
import { logActivity } from './activityController.js';

export function getDaysRemaining(expiryDate) {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
}

export function calculateExpiryStatus(expiryDate) {
  if (!expiryDate) return 'NO DATA';
  const diffDays = getDaysRemaining(expiryDate);
  if (diffDays === null) return 'NO DATA';
  if (diffDays < 0) return 'EXPIRED';
  if (diffDays <= 7) return 'CRITICAL';
  if (diffDays <= 30) return 'EXPIRING SOON';
  return 'SAFE';
}

export async function generateNextSku(db, category = 'General') {
  const prefixMap = {
    'Pens': 'PEN',
    'Pencils': 'PCL',
    'Notebooks': 'NOTE',
    'Paper': 'PPR',
    'Art Supplies': 'ART',
    'School Supplies': 'SCH',
    'Office Supplies': 'OFF',
    'Files & Folders': 'FIL',
    'Bags': 'BAG',
    'Markers': 'MRK',
    'Highlighters': 'HLT',
    'Erasers': 'ERS',
    'Geometry': 'GEO',
    'Other': 'GEN'
  };
  const prefix = prefixMap[category] || (category ? category.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() : 'STA') || 'STA';

  // Find existing SKUs with this prefix
  const rows = await db.query(
    `SELECT sku FROM products WHERE sku LIKE ? ORDER BY id DESC`,
    [`${prefix}-%`]
  );

  let nextNum = 1;
  if (rows && rows.length > 0) {
    const nums = rows.map(r => {
      const parts = (r.sku || '').split('-');
      return parseInt(parts[1], 10) || 0;
    }).filter(n => !isNaN(n) && n > 0);
    if (nums.length > 0) {
      nextNum = Math.max(...nums) + 1;
    }
  }

  let candidate = `${prefix}-${String(nextNum).padStart(4, '0')}`;
  const check = await db.get(`SELECT id FROM products WHERE LOWER(sku) = LOWER(?)`, [candidate]);
  if (check) {
    candidate = `${prefix}-${Date.now().toString().slice(-4)}`;
  }
  return candidate;
}

export function formatLocationCode(shelf, row, column) {
  const s = (shelf || 'B').toString().trim().toUpperCase().charAt(0) || 'B';
  const r = parseInt(row, 10) || 1;
  const c = parseInt(column, 10) || 1;
  return `${s}-${String(r).padStart(2, '0')}-${String(c).padStart(2, '0')}`;
}

export function formatLocationDisplay(shelf, row, column) {
  const s = (shelf || 'B').toString().trim().toUpperCase().charAt(0) || 'B';
  const r = parseInt(row, 10) || 1;
  const c = parseInt(column, 10) || 1;
  return `📍 Shelf ${s} • Row ${r} • Column ${String(c).padStart(2, '0')}`;
}

export function parseLocationValues(input = {}) {
  let shelf = input.shelf;
  let row = input.row_number !== undefined ? input.row_number : (input.rowNumber !== undefined ? input.rowNumber : input.row);
  let column = input.column_number !== undefined ? input.column_number : (input.columnNumber !== undefined ? input.columnNumber : input.column);
  let locCode = input.location_code || input.locationCode || input.shelf_location || input.shelfLocation;

  if (locCode && (!shelf || row === undefined || column === undefined)) {
    // Matches formats like "B-02-03", "B-2-3", "B2-03", "Shelf B Row 2 Column 3"
    const m = locCode.toString().match(/([A-Za-z])(?:-|\s*(?:Row|\s*))?\s*0*(\d+)(?:-|\s*(?:Col|Column|\s*))?\s*0*(\d+)/i);
    if (m) {
      if (!shelf) shelf = m[1].toUpperCase();
      if (row === undefined || row === null || isNaN(Number(row))) row = parseInt(m[2], 10);
      if (column === undefined || column === null || isNaN(Number(column))) column = parseInt(m[3], 10);
    }
  }

  const s = (shelf || 'B').toString().trim().toUpperCase().charAt(0) || 'B';
  const r = parseInt(row, 10) || 1;
  const c = parseInt(column, 10) || 1;
  const code = formatLocationCode(s, r, c);
  const display = formatLocationDisplay(s, r, c);

  return {
    shelf: s,
    rowNumber: r,
    columnNumber: c,
    locationCode: code,
    locationDisplay: display
  };
}

export async function formatProductRow(db, p) {
  const batches = p.expiry_tracking
    ? await db.query(
        `SELECT id, id as batchId, batch_number as batchNumber, quantity_loaded as quantityLoaded,
                current_quantity as currentQuantity, loaded_date as loadedDate, expiry_date as expiryDate,
                supplier, shelf, row_number as rowNumber, column_number as columnNumber, location_code as locationCode,
                shelf_location as shelfLocation, shelf_row as row, shelf_column as column
         FROM batches WHERE product_id = ? ORDER BY expiry_date ASC`,
        [p.id]
      )
    : [];

  const earliestBatch = batches.length > 0 ? batches[0] : null;
  const expiryDate = earliestBatch ? earliestBatch.expiryDate : null;
  const expiryStatus = p.expiry_tracking && expiryDate ? calculateExpiryStatus(expiryDate) : null;
  const daysRemaining = p.expiry_tracking && expiryDate ? getDaysRemaining(expiryDate) : null;

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
    sku: p.sku,
    name: p.name,
    description: p.description || '',
    category: p.category,
    brand: p.brand || '',
    price: Number(p.price),
    stock: Number(p.quantity !== undefined ? p.quantity : 0),
    quantity: Number(p.quantity !== undefined ? p.quantity : 0),
    reorderLevel: Number(p.reorder_level !== undefined ? p.reorder_level : 5),
    unit: p.unit || 'piece',
    shelf: loc.shelf,
    row: loc.rowNumber,
    rowNumber: loc.rowNumber,
    column: loc.columnNumber,
    columnNumber: loc.columnNumber,
    locationCode: loc.locationCode,
    locationDisplay: loc.locationDisplay,
    shelfLocation: loc.locationCode,
    shelfSlot: loc.locationCode,
    supplier: p.supplier || 'General Supplier',
    image: p.image_url || '',
    image_url: p.image_url || '',
    expiryTracking: Boolean(p.expiry_tracking),
    hasExpiry: Boolean(p.expiry_tracking),
    expiryDate,
    expiryStatus,
    daysRemaining,
    batches
  };
}

export async function getProducts(req, res) {
  try {
    const db = await getDb();
    const rows = await db.query(
      `SELECT p.*, i.quantity, i.reorder_level, i.shelf, i.row_number, i.column_number, i.location_code,
              i.shelf_location, i.shelf_row, i.shelf_column, i.supplier
       FROM products p
       LEFT JOIN inventory i ON p.id = i.product_id
       ORDER BY p.id DESC`
    );

    const products = await Promise.all(rows.map(p => formatProductRow(db, p)));
    return res.json({ products });
  } catch (err) {
    console.error('Error fetching products:', err);
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
}

export async function getProductById(req, res) {
  try {
    const { id } = req.params;
    const db = await getDb();
    const p = await db.get(
      `SELECT p.*, i.quantity, i.reorder_level, i.shelf, i.row_number, i.column_number, i.location_code,
              i.shelf_location, i.shelf_row, i.shelf_column, i.supplier
       FROM products p
       LEFT JOIN inventory i ON p.id = i.product_id
       WHERE p.id = ?`,
      [id]
    );

    if (!p) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = await formatProductRow(db, p);
    return res.json({ product });
  } catch (err) {
    console.error('Error fetching product:', err);
    return res.status(500).json({ error: 'Failed to fetch product details' });
  }
}

export async function createProduct(req, res) {
  try {
    const {
      name,
      category,
      brand,
      price,
      stock,
      quantity,
      initialQuantity,
      reorderLevel,
      shelfLocation,
      shelf,
      row,
      rowNumber,
      row_number,
      column,
      columnNumber,
      column_number,
      expiryTracking,
      hasExpiry,
      expiryDate,
      sku,
      unit,
      description,
      imageUrl,
      image,
      supplier,
      batchNumber,
      manufacturingDate
    } = req.body;

    // Field Validations
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Please enter the product name.' });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ error: 'Please select a product category.' });
    }
    if (price === undefined || price === null || isNaN(Number(price))) {
      return res.status(400).json({ error: 'Selling price is required.' });
    }
    const finalPrice = Number(price);
    if (finalPrice < 0) {
      return res.status(400).json({ error: 'Price cannot be negative.' });
    }

    const finalStock = Number(stock !== undefined ? stock : (quantity !== undefined ? quantity : (initialQuantity !== undefined ? initialQuantity : 0)));
    if (isNaN(finalStock) || finalStock < 0) {
      return res.status(400).json({ error: 'Stock quantity cannot be negative.' });
    }

    const finalReorder = Number(reorderLevel !== undefined ? reorderLevel : 5);
    if (isNaN(finalReorder) || finalReorder < 0) {
      return res.status(400).json({ error: 'Reorder level cannot be negative.' });
    }

    const isExpiryTracked = Boolean(expiryTracking || hasExpiry || expiryDate);
    if (isExpiryTracked && (!expiryDate || !expiryDate.trim())) {
      return res.status(400).json({ error: 'Please select an expiry date.' });
    }

    // Location validation: Shelf, Row, and Column are mandatory
    const rawShelf = shelf || (shelfLocation ? shelfLocation.charAt(0) : '');
    const rawRow = row_number !== undefined ? row_number : (rowNumber !== undefined ? rowNumber : row);
    const rawCol = column_number !== undefined ? column_number : (columnNumber !== undefined ? columnNumber : column);

    if (!rawShelf || rawRow === undefined || rawRow === null || isNaN(Number(rawRow)) || rawCol === undefined || rawCol === null || isNaN(Number(rawCol))) {
      return res.status(400).json({ error: 'Please select a shelf, row and column.' });
    }

    const loc = parseLocationValues({
      shelf: rawShelf,
      row_number: rawRow,
      column_number: rawCol,
      shelfLocation
    });

    const db = await getDb();

    // Prevent duplicate location check across database
    const occupied = await db.get(
      `SELECT p.id, p.name, p.sku, i.shelf, i.row_number, i.column_number, i.location_code
       FROM inventory i
       JOIN products p ON i.product_id = p.id
       WHERE i.location_code = ? OR (i.shelf = ? AND i.row_number = ? AND i.column_number = ?)`,
      [loc.locationCode, loc.shelf, loc.rowNumber, loc.columnNumber]
    );

    if (occupied) {
      const occupiedLocationDisplay = `Shelf ${occupied.shelf} • Row ${String(occupied.row_number).padStart(2, '0')} • Column ${String(occupied.column_number).padStart(2, '0')}`;
      return res.status(400).json({
        error: 'Location already occupied',
        message: 'Location already occupied',
        occupiedProduct: {
          id: occupied.id,
          name: occupied.name,
          sku: occupied.sku,
          shelf: occupied.shelf,
          row: occupied.row_number,
          column: occupied.column_number,
          locationCode: occupied.location_code,
          locationDisplay: occupiedLocationDisplay
        }
      });
    }

    // Auto-generate unique SKU if not provided manually
    let finalSku = sku && sku.trim() ? sku.trim().toUpperCase() : await generateNextSku(db, category.trim());

    // Check SKU uniqueness
    const existingSku = await db.get(`SELECT id FROM products WHERE LOWER(sku) = LOWER(?)`, [finalSku]);
    if (existingSku) {
      finalSku = await generateNextSku(db, category.trim());
    }

    const prodRes = await db.run(
      `INSERT INTO products (sku, name, description, category, brand, price, image_url, unit, expiry_tracking)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        finalSku,
        name.trim(),
        description || '',
        category.trim(),
        brand ? brand.trim() : '',
        finalPrice,
        imageUrl || image || '',
        unit || 'piece',
        isExpiryTracked ? 1 : 0
      ]
    );

    const productId = prodRes.lastID;
    const shelfColFormatted = String(loc.columnNumber).padStart(2, '0');

    await db.run(
      `INSERT INTO inventory (product_id, quantity, reorder_level, shelf, row_number, column_number, location_code, shelf_location, shelf_row, shelf_column, supplier)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        productId,
        finalStock,
        finalReorder,
        loc.shelf,
        loc.rowNumber,
        loc.columnNumber,
        loc.locationCode,
        loc.locationCode,
        `Row ${loc.rowNumber}`,
        shelfColFormatted,
        supplier || 'General Supplier'
      ]
    );

    // If expiry tracked, create the initial batch
    if (isExpiryTracked && expiryDate) {
      const bNum = (batchNumber || `BAT-${Date.now().toString().slice(-6)}`).trim();
      const lDate = manufacturingDate || new Date().toISOString().split('T')[0];
      await db.run(
        `INSERT INTO batches (product_id, batch_number, quantity_loaded, current_quantity, loaded_date, expiry_date, supplier, shelf, row_number, column_number, location_code, shelf_location, shelf_row, shelf_column)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          productId,
          bNum,
          finalStock,
          finalStock,
          lDate,
          expiryDate,
          supplier || 'General Supplier',
          loc.shelf,
          loc.rowNumber,
          loc.columnNumber,
          loc.locationCode,
          loc.locationCode,
          `Row ${loc.rowNumber}`,
          shelfColFormatted
        ]
      );
    }

    // Initial stock transaction record
    await db.run(
      `INSERT INTO stock_transactions (product_id, transaction_type, quantity, previous_quantity, new_quantity, reason, user_id)
       VALUES (?, 'STOCK_IN', ?, 0, ?, 'Product Added', ?)`,
      [productId, finalStock, finalStock, req.user?.id || null]
    );

    // Notification trigger if needed
    if (finalStock === 0) {
      await db.run(
        `INSERT INTO notifications (user_id, type, title, message, related_product_id)
         VALUES (?, 'error', ?, ?, ?)`,
        [req.user?.id || 1, `🔴 ${name.trim()}`, `${name.trim()} is out of stock (0 pieces).`, productId]
      );
    } else if (finalStock <= finalReorder) {
      await db.run(
        `INSERT INTO notifications (user_id, type, title, message, related_product_id)
         VALUES (?, 'warning', ?, ?, ?)`,
        [req.user?.id || 1, `🟠 ${name.trim()}`, `Low stock: ${name.trim()} has only ${finalStock} pieces remaining.`, productId]
      );
    }

    const newRow = await db.get(
      `SELECT p.*, i.quantity, i.reorder_level, i.shelf, i.row_number, i.column_number, i.location_code,
              i.shelf_location, i.shelf_row, i.shelf_column, i.supplier
       FROM products p
       LEFT JOIN inventory i ON p.id = i.product_id
       WHERE p.id = ?`,
      [productId]
    );

    // Activity log entry
    await logActivity(db, {
      userId: req.user?.id || null,
      activityType: 'PRODUCT_ADDED',
      productId,
      productName: name.trim(),
      description: `Added "${name.trim()}" (Stock: ${finalStock}, ₹${finalPrice}) at ${loc.locationCode}`
    });

    const product = await formatProductRow(db, newRow);
    return res.status(201).json({
      success: true,
      message: 'Product added successfully',
      product
    });
  } catch (err) {
    console.error('Error creating product:', err);
    return res.status(500).json({ error: err.message || 'Failed to create product' });
  }
}

export async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      category,
      brand,
      price,
      stock,
      quantity,
      reorderLevel,
      shelfLocation,
      shelf,
      row,
      rowNumber,
      row_number,
      column,
      columnNumber,
      column_number,
      expiryTracking,
      hasExpiry,
      expiryDate,
      sku,
      unit,
      description,
      imageUrl,
      image,
      supplier
    } = req.body;

    const db = await getDb();
    const existing = await db.get(`SELECT * FROM products WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (name && !name.trim()) {
      return res.status(400).json({ error: 'Please enter the product name.' });
    }

    if (price !== undefined && (isNaN(Number(price)) || Number(price) < 0)) {
      return res.status(400).json({ error: 'Price cannot be negative.' });
    }

    if (stock !== undefined && (isNaN(Number(stock)) || Number(stock) < 0)) {
      return res.status(400).json({ error: 'Stock quantity cannot be negative.' });
    }

    if (reorderLevel !== undefined && (isNaN(Number(reorderLevel)) || Number(reorderLevel) < 0)) {
      return res.status(400).json({ error: 'Reorder level cannot be negative.' });
    }

    const isExpiryTracked = expiryTracking !== undefined ? Boolean(expiryTracking) : (hasExpiry !== undefined ? Boolean(hasExpiry) : Boolean(existing.expiry_tracking));

    if (isExpiryTracked && expiryDate && !expiryDate.trim()) {
      return res.status(400).json({ error: 'Please select an expiry date.' });
    }

    if (sku && sku.trim()) {
      const skuCheck = await db.get(`SELECT id FROM products WHERE LOWER(sku) = LOWER(?) AND id != ?`, [sku.trim(), id]);
      if (skuCheck) {
        return res.status(400).json({ error: `SKU "${sku}" is already in use by another product.` });
      }
    }

    // Determine updated location if supplied
    const currentInv = await db.get(`SELECT * FROM inventory WHERE product_id = ?`, [id]);
    const rawShelf = shelf || (shelfLocation ? shelfLocation.charAt(0) : (currentInv?.shelf || 'B'));
    const rawRow = row_number !== undefined ? row_number : (rowNumber !== undefined ? rowNumber : (row !== undefined ? row : (currentInv?.row_number || 1)));
    const rawCol = column_number !== undefined ? column_number : (columnNumber !== undefined ? columnNumber : (column !== undefined ? column : (currentInv?.column_number || 1)));

    const loc = parseLocationValues({
      shelf: rawShelf,
      row_number: rawRow,
      column_number: rawCol,
      shelfLocation
    });

    // Check duplicate location on edit (excluding current product ID)
    const occupied = await db.get(
      `SELECT p.id, p.name, p.sku, i.shelf, i.row_number, i.column_number, i.location_code
       FROM inventory i
       JOIN products p ON i.product_id = p.id
       WHERE (i.location_code = ? OR (i.shelf = ? AND i.row_number = ? AND i.column_number = ?))
         AND p.id != ?`,
      [loc.locationCode, loc.shelf, loc.rowNumber, loc.columnNumber, id]
    );

    if (occupied) {
      const occupiedLocationDisplay = `Shelf ${occupied.shelf} • Row ${String(occupied.row_number).padStart(2, '0')} • Column ${String(occupied.column_number).padStart(2, '0')}`;
      return res.status(400).json({
        error: 'This location is already occupied.',
        message: 'This location is already occupied.',
        occupiedProduct: {
          id: occupied.id,
          name: occupied.name,
          sku: occupied.sku,
          shelf: occupied.shelf,
          row: occupied.row_number,
          column: occupied.column_number,
          locationCode: occupied.location_code,
          locationDisplay: occupiedLocationDisplay
        }
      });
    }

    await db.run(
      `UPDATE products
       SET name = COALESCE(?, name),
           sku = COALESCE(?, sku),
           category = COALESCE(?, category),
           brand = COALESCE(?, brand),
           description = COALESCE(?, description),
           price = COALESCE(?, price),
           unit = COALESCE(?, unit),
           image_url = COALESCE(?, image_url),
           expiry_tracking = COALESCE(?, expiry_tracking),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name ? name.trim() : null,
        sku ? sku.trim().toUpperCase() : null,
        category ? category.trim() : null,
        brand !== undefined ? brand.trim() : null,
        description !== undefined ? description : null,
        price !== undefined ? Number(price) : null,
        unit,
        imageUrl || image,
        isExpiryTracked ? 1 : 0,
        id
      ]
    );

    const prevStock = currentInv ? Number(currentInv.quantity) : 0;
    const newStock = stock !== undefined ? Number(stock) : (quantity !== undefined ? Number(quantity) : prevStock);
    const shelfColFormatted = String(loc.columnNumber).padStart(2, '0');

    await db.run(
      `UPDATE inventory
       SET quantity = COALESCE(?, quantity),
           reorder_level = COALESCE(?, reorder_level),
           shelf = ?,
           row_number = ?,
           column_number = ?,
           location_code = ?,
           shelf_location = ?,
           shelf_row = ?,
           shelf_column = ?,
           supplier = COALESCE(?, supplier),
           updated_at = CURRENT_TIMESTAMP
       WHERE product_id = ?`,
      [
        stock !== undefined || quantity !== undefined ? newStock : null,
        reorderLevel !== undefined ? Number(reorderLevel) : null,
        loc.shelf,
        loc.rowNumber,
        loc.columnNumber,
        loc.locationCode,
        loc.locationCode,
        `Row ${loc.rowNumber}`,
        shelfColFormatted,
        supplier,
        id
      ]
    );

    // If stock changed directly in edit, record transaction
    if ((stock !== undefined || quantity !== undefined) && newStock !== prevStock) {
      const diff = newStock - prevStock;
      await db.run(
        `INSERT INTO stock_transactions (product_id, transaction_type, quantity, previous_quantity, new_quantity, reason, user_id)
         VALUES (?, ?, ?, ?, ?, 'Stock Updated in Edit', ?)`,
        [id, diff > 0 ? 'STOCK_IN' : 'STOCK_OUT', Math.abs(diff), prevStock, newStock, req.user?.id || null]
      );
    }

    // If expiry date updated, update or insert batch
    if (isExpiryTracked && expiryDate) {
      const existingBatch = await db.get(`SELECT id FROM batches WHERE product_id = ? ORDER BY id ASC`, [id]);
      if (existingBatch) {
        await db.run(
          `UPDATE batches
           SET expiry_date = ?, current_quantity = ?,
               shelf = ?, row_number = ?, column_number = ?, location_code = ?,
               shelf_location = ?, shelf_row = ?, shelf_column = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            expiryDate,
            newStock,
            loc.shelf,
            loc.rowNumber,
            loc.columnNumber,
            loc.locationCode,
            loc.locationCode,
            `Row ${loc.rowNumber}`,
            shelfColFormatted,
            existingBatch.id
          ]
        );
      } else {
        const bNum = `BAT-${Date.now().toString().slice(-6)}`;
        const lDate = new Date().toISOString().split('T')[0];
        await db.run(
          `INSERT INTO batches (product_id, batch_number, quantity_loaded, current_quantity, loaded_date, expiry_date, supplier, shelf, row_number, column_number, location_code, shelf_location, shelf_row, shelf_column)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            bNum,
            newStock,
            newStock,
            lDate,
            expiryDate,
            supplier || 'General Supplier',
            loc.shelf,
            loc.rowNumber,
            loc.columnNumber,
            loc.locationCode,
            loc.locationCode,
            `Row ${loc.rowNumber}`,
            shelfColFormatted
          ]
        );
      }
    }

    const updatedRow = await db.get(
      `SELECT p.*, i.quantity, i.reorder_level, i.shelf, i.row_number, i.column_number, i.location_code,
              i.shelf_location, i.shelf_row, i.shelf_column, i.supplier
       FROM products p
       LEFT JOIN inventory i ON p.id = i.product_id
       WHERE p.id = ?`,
      [id]
    );

    // Activity log entry
    await logActivity(db, {
      userId: req.user?.id || null,
      activityType: 'PRODUCT_UPDATED',
      productId: id,
      productName: (name || updatedRow?.name || 'Product').trim(),
      description: `Updated details for "${(name || updatedRow?.name || 'Product').trim()}"`
    });

    const product = await formatProductRow(db, updatedRow);
    return res.json({ success: true, message: 'Product updated successfully', product });
  } catch (err) {
    console.error('Error updating product:', err);
    return res.status(500).json({ error: err.message || 'Failed to update product' });
  }
}

export async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    const db = await getDb();
    const existing = await db.get(`SELECT id, name FROM products WHERE id = ?`, [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await db.run(`DELETE FROM products WHERE id = ?`, [id]);

    // Activity log entry
    await logActivity(db, {
      userId: req.user?.id || null,
      activityType: 'PRODUCT_DELETED',
      productId: id,
      productName: existing.name,
      description: `Deleted product "${existing.name}"`
    });

    return res.json({ success: true, message: `Product "${existing.name}" deleted successfully` });
  } catch (err) {
    console.error('Error deleting product:', err);
    return res.status(500).json({ error: 'Failed to delete product' });
  }
}

export async function updateProductStockRoute(req, res) {
  try {
    const { id } = req.params;
    const { amount, action, newStockValue, reason } = req.body;
    const db = await getDb();

    const inv = await db.get(
      `SELECT i.*, p.name, p.expiry_tracking FROM inventory i JOIN products p ON i.product_id = p.id WHERE i.product_id = ?`,
      [id]
    );
    if (!inv) return res.status(404).json({ error: 'Product inventory not found' });

    const prevQty = Number(inv.quantity);
    let newQty = prevQty;
    let txType = 'ADJUSTMENT';
    let delta = 0;

    if (action === 'add') {
      const addAmount = Number(amount);
      if (isNaN(addAmount) || addAmount <= 0) {
        return res.status(400).json({ error: 'Amount to add must be greater than 0' });
      }
      delta = addAmount;
      newQty = prevQty + addAmount;
      txType = 'STOCK_IN';
    } else if (action === 'remove') {
      const removeAmount = Number(amount);
      if (isNaN(removeAmount) || removeAmount <= 0) {
        return res.status(400).json({ error: 'Amount to remove must be greater than 0' });
      }
      if (prevQty < removeAmount) {
        return res.status(400).json({ error: `Cannot deduct ${removeAmount} units. Only ${prevQty} units available in stock.` });
      }
      delta = removeAmount;
      newQty = prevQty - removeAmount;
      txType = 'STOCK_OUT';
    } else {
      const targetVal = Number(newStockValue !== undefined ? newStockValue : amount);
      if (isNaN(targetVal) || targetVal < 0) {
        return res.status(400).json({ error: 'Valid non-negative stock quantity required' });
      }
      delta = Math.abs(targetVal - prevQty);
      newQty = targetVal;
      txType = targetVal > prevQty ? 'STOCK_IN' : targetVal < prevQty ? 'STOCK_OUT' : 'ADJUSTMENT';
    }

    await db.run(`UPDATE inventory SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`, [newQty, id]);

    // Record stock transaction
    await db.run(
      `INSERT INTO stock_transactions (product_id, transaction_type, quantity, previous_quantity, new_quantity, reason, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, txType, delta, prevQty, newQty, reason || `Stock ${txType.toLowerCase()}`, req.user?.id || null]
    );

    // Activity log entry
    await logActivity(db, {
      userId: req.user?.id || null,
      activityType: txType,
      productId: id,
      productName: inv.name,
      description: `Stock adjusted for "${inv.name}": ${prevQty} → ${newQty} units (${txType.replace('_', ' ')})`
    });

    // Notifications for threshold breaches
    const reorderLevel = Number(inv.reorder_level);
    if (newQty === 0 && prevQty > 0) {
      await db.run(
        `INSERT INTO notifications (user_id, type, title, message, related_product_id)
         VALUES (?, 'error', ?, ?, ?)`,
        [req.user?.id || 1, `🔴 ${inv.name}`, `${inv.name} is out of stock (0 pieces).`, id]
      );
    } else if (newQty > 0 && newQty <= reorderLevel) {
      await db.run(
        `INSERT INTO notifications (user_id, type, title, message, related_product_id)
         VALUES (?, 'warning', ?, ?, ?)`,
        [req.user?.id || 1, `🟠 ${inv.name}`, `Low stock alert: ${inv.name} has only ${newQty} pieces remaining.`, id]
      );
    }

    const updatedRow = await db.get(
      `SELECT p.*, i.quantity, i.reorder_level, i.shelf_location, i.shelf_row, i.shelf_column, i.supplier
       FROM products p LEFT JOIN inventory i ON p.id = i.product_id WHERE p.id = ?`,
      [id]
    );
    const product = await formatProductRow(db, updatedRow);

    return res.json({
      success: true,
      message: `Stock updated successfully (${newQty} units)`,
      product
    });
  } catch (err) {
    console.error('Error in updateProductStockRoute:', err);
    return res.status(500).json({ error: err.message || 'Failed to update stock' });
  }
}
