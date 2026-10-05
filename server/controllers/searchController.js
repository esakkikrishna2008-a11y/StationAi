import { getDb } from '../database/db.js';
import { formatProductRow } from './productController.js';

export async function searchProducts(req, res) {
  try {
    const q = req.query.q ? req.query.q.trim() : '';
    const db = await getDb();

    let sql = `SELECT p.*, i.quantity, i.reorder_level, i.shelf, i.row_number, i.column_number, i.location_code,
                      i.shelf_location, i.shelf_row, i.shelf_column, i.supplier
               FROM products p
               LEFT JOIN inventory i ON p.id = i.product_id`;
    let params = [];

    if (q) {
      const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
      // Construct WHERE clause matching name, brand, category, sku, shelf, location_code, description
      const conditions = terms.map(() =>
        `(LOWER(p.name) LIKE ? OR LOWER(p.brand) LIKE ? OR LOWER(p.category) LIKE ? OR LOWER(p.sku) LIKE ? OR LOWER(i.location_code) LIKE ? OR LOWER(i.shelf) LIKE ? OR LOWER(i.shelf_location) LIKE ? OR LOWER(p.description) LIKE ?)`
      ).join(' AND ');

      sql += ` WHERE ${conditions}`;
      terms.forEach(t => {
        const pattern = `%${t}%`;
        params.push(pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern);
      });
    }

    sql += ` ORDER BY p.name ASC`;
    const rows = await db.query(sql, params);
    const products = await Promise.all(rows.map(r => formatProductRow(db, r)));

    // Record in search history if query provided
    if (q) {
      const matchedProduct = products[0] || null;
      const status = matchedProduct
        ? (matchedProduct.stock === 0 ? 'Out of Stock' : matchedProduct.stock <= matchedProduct.reorderLevel ? 'Low Stock' : 'Available')
        : 'No Matches';
      const shelf = matchedProduct ? (matchedProduct.locationCode || matchedProduct.shelfSlot || '—') : '—';

      await db.run(
        `INSERT INTO search_history (user_id, search_query, product_id, result_count, result_status, shelf_location)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [req.user?.id || null, q, matchedProduct?.id || null, products.length, status, shelf]
      );
    }

    return res.json({ query: q, count: products.length, products });
  } catch (err) {
    console.error('Search error:', err);
    return res.status(500).json({ error: 'Search failed' });
  }
}

export async function getSearchHistory(req, res) {
  try {
    const db = await getDb();
    const rows = await db.query(
      `SELECT sh.*, p.name as product_name, p.sku
       FROM search_history sh
       LEFT JOIN products p ON sh.product_id = p.id
       ORDER BY sh.created_at DESC LIMIT 20`
    );

    const history = rows.map(r => ({
      id: r.id,
      query: r.search_query,
      productName: r.product_name || r.search_query,
      productId: r.product_id,
      sku: r.sku,
      count: r.result_count,
      status: r.result_status || 'Available',
      shelf: r.shelf_location || '—',
      createdAt: r.created_at,
      time: new Date(r.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    }));

    return res.json({ history });
  } catch (err) {
    console.error('Fetch history error:', err);
    return res.status(500).json({ error: 'Failed to fetch search history' });
  }
}

export async function clearSearchHistory(req, res) {
  try {
    const db = await getDb();
    await db.run(`DELETE FROM search_history`);
    return res.json({ message: 'Search history cleared' });
  } catch (err) {
    console.error('Clear history error:', err);
    return res.status(500).json({ error: 'Failed to clear search history' });
  }
}
