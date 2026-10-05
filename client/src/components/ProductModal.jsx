import { useState } from 'react';
import { X, Minus, Plus, MapPin, Timer, AlertCircle, Edit3, Trash2 } from 'lucide-react';
import { calculateStatus, getShelfSlot, getSuggestedAlternatives, parseLocation, formatLocationCode, formatLocationDisplay } from '../data';
import { useStock } from '../context/StockContext';
import { calculateExpiryStatus, getDaysRemaining, getExpiryText } from '../utils';
import { getCategoryEmoji } from './Layout';
import AddEditProductModal from './AddEditProductModal';

export default function ProductModal({ product: initialProduct, onClose, onViewShelf, onSelectProduct }) {
  const { updateStock, stockIn, stockOut, deleteProduct, inventory } = useStock();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [stockAdjustment, setStockAdjustment] = useState({ mode: null, amount: '' });
  const [isAdjusting, setIsAdjusting] = useState(false);

  if (!initialProduct) return null;

  const product = inventory?.find(i => i.id === initialProduct.id) || initialProduct;
  const status = calculateStatus(product.stock, product.reorderLevel);
  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock <= product.reorderLevel;
  const loc = parseLocation({
    shelf: product.shelf,
    rowNumber: product.row ?? product.rowNumber ?? product.row_number,
    columnNumber: product.column ?? product.columnNumber ?? product.column_number,
    locationCode: product.locationCode || product.location_code || product.shelfLocation
  });

  const alternatives = isOutOfStock ? getSuggestedAlternatives(product, inventory) : [];

  const handleQuickStep = async (delta) => {
    try {
      const newStock = Math.max(0, product.stock + delta);
      await updateStock(product.id, newStock);
    } catch (err) {
      console.error('Error adjusting stock:', err);
    }
  };

  const handleStockActionSubmit = async (e) => {
    e.preventDefault();
    const qty = parseInt(stockAdjustment.amount, 10);
    if (isNaN(qty) || qty <= 0) return;

    try {
      setIsAdjusting(true);
      if (stockAdjustment.mode === 'add') {
        await stockIn(product.id, qty, 'Manual stock in');
      } else if (stockAdjustment.mode === 'remove') {
        await stockOut(product.id, qty, 'Manual stock out');
      }
      setStockAdjustment({ mode: null, amount: '' });
    } catch (err) {
      console.error('Stock adjustment failed:', err);
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProduct(product.id);
      onClose();
    } catch (err) {
      console.error('Delete product failed:', err);
    }
  };

  const expiryStatus = product.expiryDate ? calculateExpiryStatus(product.expiryDate, true) : null;
  const daysRemaining = product.expiryDate ? getDaysRemaining(product.expiryDate) : null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
          
          {/* Header */}
          <div className="modal-header">
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <span className="cat-badge">{product.category}</span>
                {product.brand && <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>• {product.brand}</span>}
                <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--primary)', background: 'rgba(59,130,246,0.1)', padding: '2px 6px', borderRadius: 4 }}>
                  {product.sku}
                </span>
              </div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>{product.name}</h2>
            </div>
            <button className="btn-close" onClick={onClose} aria-label="Close modal">
              <X size={20} />
            </button>
          </div>

          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Price & Shelf Highlight Card */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 12,
              background: 'var(--bg-secondary)',
              padding: 16,
              borderRadius: 12,
              border: '1px solid var(--border)'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Selling Price</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)', marginTop: 2 }}>
                  ₹{product.price}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Shelf Location</span>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <MapPin size={16} /> Shelf {loc.shelf} ({loc.locationCode})
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Row {String(loc.row).padStart(2, '0')} • Col {String(loc.column).padStart(2, '0')}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Status</span>
                <div style={{ marginTop: 4 }}>
                  <span className={`status-badge static-badge ${status === 'In Stock' ? 'status-in-stock' : status === 'Low Stock' ? 'status-low-stock' : 'status-out-stock'}`}>
                    {status === 'In Stock' ? '✓ In Stock' : status === 'Low Stock' ? '⚠️ Low Stock' : '❌ Out of Stock'}
                  </span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Reorder Level</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>
                  {product.reorderLevel} pcs
                </div>
              </div>
            </div>

            {/* Stock Management Box */}
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 16
            }}>
              <div className="flex-between mb-3">
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Current Stock</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    className="stock-btn"
                    onClick={() => handleQuickStep(-1)}
                    disabled={product.stock === 0}
                    title="Decrease by 1"
                  >
                    <Minus size={16} />
                  </button>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, minWidth: 40, textAlign: 'center' }}>
                    {product.stock}
                  </span>
                  <button
                    className="stock-btn"
                    onClick={() => handleQuickStep(1)}
                    title="Increase by 1"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Add / Remove Stock Action Buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${stockAdjustment.mode === 'add' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: 1 }}
                  onClick={() => setStockAdjustment(prev => ({ mode: prev.mode === 'add' ? null : 'add', amount: '' }))}
                >
                  <Plus size={14} /> Add Stock
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${stockAdjustment.mode === 'remove' ? 'btn-danger' : 'btn-outline'}`}
                  style={{ flex: 1 }}
                  onClick={() => setStockAdjustment(prev => ({ mode: prev.mode === 'remove' ? null : 'remove', amount: '' }))}
                  disabled={product.stock === 0}
                >
                  <Minus size={14} /> Remove Stock
                </button>
              </div>

              {/* Stock Input Form */}
              {stockAdjustment.mode && (
                <form onSubmit={handleStockActionSubmit} style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    placeholder={`Quantity to ${stockAdjustment.mode}...`}
                    value={stockAdjustment.amount}
                    onChange={e => setStockAdjustment({ ...stockAdjustment, amount: e.target.value })}
                    autoFocus
                    required
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className={`btn btn-sm ${stockAdjustment.mode === 'add' ? 'btn-primary' : 'btn-danger'}`} disabled={isAdjusting}>
                    Confirm
                  </button>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setStockAdjustment({ mode: null, amount: '' })}>
                    Cancel
                  </button>
                </form>
              )}
            </div>

            {/* Expiry Details if product has expiry */}
            {(product.expiryTracking || product.hasExpiry || product.expiryDate) && (
              <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: 12,
                padding: 14,
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Timer size={18} color="var(--warning)" />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Expiry Tracking Enabled</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Date: <strong>{product.expiryDate ? new Date(product.expiryDate).toLocaleDateString('en-IN') : 'Not specified'}</strong>
                    </div>
                  </div>
                </div>

                {expiryStatus && (
                  <span className={`expiry-badge ${expiryStatus === 'EXPIRED' ? 'expired' : expiryStatus === 'CRITICAL' ? 'critical' : expiryStatus === 'EXPIRING SOON' ? 'warning' : 'safe'}`}>
                    {expiryStatus === 'EXPIRED' ? '❌ Expired' : `⏱ ${getExpiryText(daysRemaining)}`}
                  </span>
                )}
              </div>
            )}

            {/* Out of Stock Alternatives */}
            {isOutOfStock && alternatives.length > 0 && (
              <div style={{
                background: 'rgba(239,68,68,0.05)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 12,
                padding: 14
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--danger)', fontWeight: 700, fontSize: '0.88rem', marginBottom: 8 }}>
                  <AlertCircle size={16} />
                  <span>Available in Same Category:</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {alternatives.map(alt => (
                    <div
                      key={alt.id}
                      className="alt-recommend-item"
                      onClick={() => {
                        if (onSelectProduct) onSelectProduct(alt);
                      }}
                      style={{ cursor: 'pointer', padding: 8 }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{alt.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{alt.brand} • Shelf {alt.shelfLocation || alt.shelf}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 700, color: 'var(--success)' }}>₹{alt.price}</span>
                        <div style={{ fontSize: '0.72rem', color: 'var(--primary)' }}>{alt.stock} in stock</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex-between pt-2" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm text-danger"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 size={14} /> Delete
              </button>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setShowEditModal(true)}
                >
                  <Edit3 size={14} /> Edit Product
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={onClose}
                >
                  Done
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <AddEditProductModal
          product={product}
          onClose={() => setShowEditModal(false)}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="confirm-dialog-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <h3>Delete Product "{product.name}"?</h3>
            <p>This action will permanently delete the product from your store inventory.</p>
            <div className="confirm-dialog-actions">
              <button className="btn btn-outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
