import { getDb } from '../database/db.js';

export async function getSettings(req, res) {
  try {
    const db = await getDb();
    let settings = await db.get(`SELECT * FROM settings WHERE id = 1`);

    if (!settings) {
      await db.run(
        `INSERT INTO settings (id, shop_name, store_type, low_stock_threshold, currency, notify_low_stock, notify_expiry)
         VALUES (1, 'StationAI Central Mart', 'General Store', 10, '₹', 1, 1)`
      );
      settings = await db.get(`SELECT * FROM settings WHERE id = 1`);
    }

    return res.json({
      settings: {
        shopName: settings.shop_name,
        storeType: settings.store_type || 'General Store',
        lowStockThreshold: settings.low_stock_threshold,
        currency: settings.currency,
        notifyLowStock: Boolean(settings.notify_low_stock),
        notifyExpiry: Boolean(settings.notify_expiry),
        expiryWarningDays: settings.expiry_warning_days
      }
    });
  } catch (err) {
    console.error('Fetch settings error:', err);
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
}

export async function updateSettings(req, res) {
  try {
    const { shopName, storeType, lowStockThreshold, currency, notifyLowStock, notifyExpiry, expiryWarningDays } = req.body;
    const db = await getDb();

    await db.run(
      `UPDATE settings
       SET shop_name = COALESCE(?, shop_name),
           store_type = COALESCE(?, store_type),
           low_stock_threshold = COALESCE(?, low_stock_threshold),
           currency = COALESCE(?, currency),
           notify_low_stock = COALESCE(?, notify_low_stock),
           notify_expiry = COALESCE(?, notify_expiry),
           expiry_warning_days = COALESCE(?, expiry_warning_days),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = 1`,
      [
        shopName,
        storeType,
        lowStockThreshold !== undefined ? Number(lowStockThreshold) : null,
        currency,
        notifyLowStock !== undefined ? (notifyLowStock ? 1 : 0) : null,
        notifyExpiry !== undefined ? (notifyExpiry ? 1 : 0) : null,
        expiryWarningDays !== undefined ? Number(expiryWarningDays) : null
      ]
    );

    const updated = await db.get(`SELECT * FROM settings WHERE id = 1`);
    return res.json({
      message: 'Settings updated successfully',
      settings: {
        shopName: updated.shop_name,
        storeType: updated.store_type || 'General Store',
        lowStockThreshold: updated.low_stock_threshold,
        currency: updated.currency,
        notifyLowStock: Boolean(updated.notify_low_stock),
        notifyExpiry: Boolean(updated.notify_expiry),
        expiryWarningDays: updated.expiry_warning_days
      }
    });
  } catch (err) {
    console.error('Update settings error:', err);
    return res.status(500).json({ error: 'Failed to update settings' });
  }
}
