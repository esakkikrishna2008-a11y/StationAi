import React, { useState, useMemo } from 'react';
import {
  AlertTriangle, XCircle, PackageCheck, Plus, RefreshCw,
  Search, ArrowRight, Store, MapPin
} from 'lucide-react';
import { useStock } from '../context/StockContext';
import { getCategoryEmoji } from '../components/Layout';
import AddEditProductModal from '../components/AddEditProductModal';

export default function StockAlerts() {
  const { inventory, stockIn, isLoading, refreshInventory, addToast } = useStock();
  const [filterType, setFilterType] = useState('ALL'); // 'ALL', 'LOW', 'OUT'
  const [searchQuery, setSearchQuery] = useState('');
  const [quickRestockProduct, setQuickRestockProduct] = useState(null);
  const [restockQty, setRestockQty] = useState(10);
  const [isRestocking, setIsRestocking] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Classify products into Low Stock / Out of Stock
  const { lowStockItems, outOfStockItems, allAlertItems } = useMemo(() => {
    if (!inventory || !Array.isArray(inventory)) {
      return { lowStockItems: [], outOfStockItems: [], allAlertItems: [] };
    }

    const low = [];
    const out = [];

    inventory.forEach(item => {
      const stock = Number(item.stock || item.quantity || 0);
      const reorder = Number(item.reorderLevel || 5);

      if (stock === 0) {
        out.push({ ...item, alertType: 'OUT_OF_STOCK', alertMessage: `${item.name} is out of stock.` });
      } else if (stock <= reorder) {
        low.push({ ...item, alertType: 'LOW_STOCK', alertMessage: `${item.name} is low in stock — ${stock} units remaining.` });
      }
    });

    return {
      lowStockItems: low,
      outOfStockItems: out,
      allAlertItems: [...out, ...low]
    };
  }, [inventory]);

  const filteredItems = useMemo(() => {
    let list = allAlertItems;
    if (filterType === 'LOW') list = lowStockItems;
    if (filterType === 'OUT') list = outOfStockItems;

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(item =>
      item.name?.toLowerCase().includes(q) ||
      item.sku?.toLowerCase().includes(q) ||
      item.brand?.toLowerCase().includes(q) ||
      item.category?.toLowerCase().includes(q) ||
      (item.locationCode || '')?.toLowerCase().includes(q)
    );
  }, [allAlertItems, lowStockItems, outOfStockItems, filterType, searchQuery]);

  const handleQuickRestockSubmit = async (e) => {
    e.preventDefault();
    if (!quickRestockProduct) return;

    try {
      setIsRestocking(true);
      await stockIn(quickRestockProduct.id, parseInt(restockQty, 10), 'Restock from Alert');
      setQuickRestockProduct(null);
    } catch (err) {
      addToast(err.message || 'Restock failed', 'error');
    } finally {
      setIsRestocking(false);
    }
  };

  return (
    <div className="stock-alerts-page" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="dash-hero" style={{ padding: '20px 24px', marginBottom: 0 }}>
        <div className="dash-hero-text">
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={24} color="var(--warning)" /> Stock Alerts
          </h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Real-time stock level monitoring. Restock products before they run out.
          </p>
        </div>
        <div className="dash-hero-actions">
          <button className="btn btn-outline btn-sm" onClick={() => refreshInventory && refreshInventory()}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="kpi-grid">
        <div
          className="card kpi-card"
          onClick={() => setFilterType('ALL')}
          style={{ cursor: 'pointer', borderColor: filterType === 'ALL' ? 'var(--primary)' : 'var(--border)' }}
        >
          <div className="kpi-icon orange"><AlertTriangle size={22} /></div>
          <div className="kpi-content">
            <p className="kpi-label">TOTAL STOCK ALERTS</p>
            <h3 className="kpi-value">{allAlertItems.length}</h3>
            <p className="kpi-subtext">Needs attention</p>
          </div>
        </div>

        <div
          className="card kpi-card"
          onClick={() => setFilterType('OUT')}
          style={{ cursor: 'pointer', borderColor: filterType === 'OUT' ? 'var(--danger)' : 'var(--border)' }}
        >
          <div className="kpi-icon red"><XCircle size={22} /></div>
          <div className="kpi-content">
            <p className="kpi-label">OUT OF STOCK</p>
            <h3 className="kpi-value">{outOfStockItems.length}</h3>
            <p className="kpi-subtext">0 units remaining</p>
          </div>
        </div>

        <div
          className="card kpi-card"
          onClick={() => setFilterType('LOW')}
          style={{ cursor: 'pointer', borderColor: filterType === 'LOW' ? 'var(--warning)' : 'var(--border)' }}
        >
          <div className="kpi-icon orange"><AlertTriangle size={22} /></div>
          <div className="kpi-content">
            <p className="kpi-label">LOW STOCK</p>
            <h3 className="kpi-value">{lowStockItems.length}</h3>
            <p className="kpi-subtext">Below reorder level</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Search alerts by product name, SKU, brand or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 36, height: 38, fontSize: '0.88rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { id: 'ALL', label: `All Alerts (${allAlertItems.length})` },
              { id: 'OUT', label: `Out of Stock (${outOfStockItems.length})` },
              { id: 'LOW', label: `Low Stock (${lowStockItems.length})` },
            ].map(f => (
              <button
                key={f.id}
                className={`btn btn-xs ${filterType === f.id ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFilterType(f.id)}
                style={{ borderRadius: 6, padding: '4px 10px', fontSize: '0.75rem' }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts List / Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <RefreshCw size={24} className="spin-animation" style={{ margin: '0 auto 10px' }} />
            <p>Checking stock alerts...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <PackageCheck size={44} color="var(--success)" style={{ margin: '0 auto 12px', opacity: 0.8 }} />
            <h4 style={{ margin: '0 0 6px', color: 'var(--text-primary)' }}>All products are adequately stocked</h4>
            <p style={{ fontSize: '0.82rem', margin: 0 }}>No products currently require immediate reordering.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="inv-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Current Stock</th>
                  <th>Reorder Level</th>
                  <th>Location</th>
                  <th>Status & Alert</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => {
                  const stock = Number(item.stock || item.quantity || 0);
                  const isOut = stock === 0;
                  const loc = item.locationDisplay || `Shelf ${item.shelf || 'B'} → Row ${String(item.row || 1).padStart(2,'0')} → Column ${String(item.column || 1).padStart(2,'0')}`;

                  return (
                    <tr key={item.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: '1.2rem' }}>{getCategoryEmoji(item.category)}</span>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{item.name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.brand ? `${item.brand} · ` : ''}{item.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="inv-category">{item.category}</span>
                      </td>
                      <td>
                        <strong style={{ fontSize: '1rem', color: isOut ? 'var(--danger)' : 'var(--warning)' }}>
                          {stock}
                        </strong>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{item.reorderLevel || 5}</span>
                      </td>
                      <td>
                        <span className="inv-location" style={{ fontSize: '0.75rem' }}>{loc}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span className={`status-badge ${isOut ? 'out' : 'low'}`} style={{ alignSelf: 'flex-start', fontSize: '0.7rem' }}>
                            {isOut ? 'Out of Stock' : 'Low Stock'}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: isOut ? 'var(--danger)' : 'var(--warning)', fontWeight: 500 }}>
                            {item.alertMessage}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-xs"
                            onClick={() => {
                              setQuickRestockProduct(item);
                              setRestockQty(10);
                            }}
                            style={{ gap: 4 }}
                          >
                            <Plus size={12} /> Restock
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-xs"
                            onClick={() => setEditingProduct(item)}
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Restock Modal */}
      {quickRestockProduct && (
        <div className="confirm-dialog-overlay" onClick={() => setQuickRestockProduct(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()} role="dialog">
            <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem' }}>Restock {quickRestockProduct.name}</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 14 }}>
              Current stock: <strong>{quickRestockProduct.stock || 0}</strong> (Reorder level: {quickRestockProduct.reorderLevel || 5})
            </p>

            <form onSubmit={handleQuickRestockSubmit}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Units to Add:
                </label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  required
                />
              </div>

              <div className="confirm-dialog-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setQuickRestockProduct(null)}
                  disabled={isRestocking}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isRestocking}
                >
                  {isRestocking ? 'Updating...' : `Add ${restockQty} Units`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <AddEditProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSuccess={() => {
            setEditingProduct(null);
            if (refreshInventory) refreshInventory();
          }}
        />
      )}
    </div>
  );
}
