import { useState, useMemo, useEffect, useCallback } from 'react';
import { useStock } from '../context/StockContext';
import { calculateStatus, parseLocation, formatLocationCode, formatLocationDisplay, getAllCategoriesForStore, getStoreType } from '../data';
import { Search, Package, AlertTriangle, XCircle, Plus, Eye, Edit3, Trash2, RotateCcw, Minus, MapPin, History, ArrowRightLeft, ShoppingCart, RefreshCw } from 'lucide-react';
import ProductModal from '../components/ProductModal';
import AddEditProductModal from '../components/AddEditProductModal';
import { getCategoryEmoji } from '../components/Layout';
import { api } from '../services/api';

export default function Inventory() {
  const { inventory, isLoading, error, refreshInventory, updateStock, deleteProduct } = useStock();

  const [activeTab, setActiveTab] = useState('products'); // 'products' or 'movements'
  const [movements, setMovements] = useState([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementFilter, setMovementFilter] = useState('ALL');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState('name');

  // Modal states
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [addEditModalProduct, setAddEditModalProduct] = useState(undefined); // undefined = closed, null = new, object = edit
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  const loadMovements = useCallback(async () => {
    try {
      setMovementsLoading(true);
      const res = await api.getStockMovements({ movementType: movementFilter });
      if (res && res.movements) {
        setMovements(res.movements);
      }
    } catch (e) {
      console.error('Failed to load stock movements:', e);
    } finally {
      setMovementsLoading(false);
    }
  }, [movementFilter]);

  useEffect(() => {
    if (activeTab === 'movements') {
      loadMovements();
    }
  }, [activeTab, loadMovements]);


  // Summary counts
  const total = inventory.length;
  const metrics = useMemo(() => {
    const m = { available: 0, lowStock: 0, outOfStock: 0 };
    inventory.forEach(item => {
      const s = calculateStatus(item.stock, item.reorderLevel);
      if (s === 'In Stock') m.available++;
      else if (s === 'Low Stock') m.lowStock++;
      else if (s === 'Out of Stock') m.outOfStock++;
    });
    return m;
  }, [inventory]);

  const categoriesList = useMemo(() => {
    const base = getAllCategoriesForStore();
    const invCats = inventory.map(i => i.category).filter(Boolean);
    return ['All', ...Array.from(new Set([...base, ...invCats]))];
  }, [inventory]);

  // Filtering
  const filteredData = useMemo(() => {
    let list = inventory.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      let matchSearch = true;
      if (q) {
        const loc = parseLocation({
          shelf: item.shelf,
          rowNumber: item.row ?? item.rowNumber ?? item.row_number,
          columnNumber: item.column ?? item.columnNumber ?? item.column_number,
          locationCode: item.locationCode || item.location_code || item.shelfLocation
        });
        const shelfSearch = `${loc.shelf} ${loc.row} ${loc.column} ${loc.locationCode} ${item.shelfLocation || ''}`.toLowerCase();
        matchSearch =
          item.name.toLowerCase().includes(q) ||
          (item.brand || '').toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q) ||
          shelfSearch.includes(q);
      }

      const s = calculateStatus(item.stock, item.reorderLevel);
      let matchStatus = true;
      if (statusFilter === 'In Stock') matchStatus = s === 'In Stock';
      else if (statusFilter === 'Low Stock') matchStatus = s === 'Low Stock';
      else if (statusFilter === 'Out of Stock') matchStatus = s === 'Out of Stock';

      let matchCategory = categoryFilter === 'All' ? true : item.category === categoryFilter;

      return matchSearch && matchStatus && matchCategory;
    });

    if (sortBy === 'quantity') {
      list.sort((a, b) => a.stock - b.stock);
    } else if (sortBy === 'price') {
      list.sort((a, b) => a.price - b.price);
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [inventory, searchQuery, statusFilter, categoryFilter, sortBy]);

  const handleQuickAdjust = async (e, item, delta) => {
    e.stopPropagation();
    const newStock = Math.max(0, item.stock + delta);
    try {
      await updateStock(item.id, newStock);
    } catch (err) {
      console.error('Quick adjust failed:', err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCandidate) return;
    try {
      await deleteProduct(deleteCandidate.id);
      setDeleteCandidate(null);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div className="inventory-page">
      {/* Top Header */}
      <div className="page-header flex-between">
        <div>
          <h2>Store Inventory</h2>
          <p>Easily manage all store products, stock counts, units, and physical shelf locations.</p>
        </div>
        <button
          className="btn btn-primary"
          style={{ padding: '10px 22px', fontSize: '0.95rem' }}
          onClick={() => setAddEditModalProduct(null)}
        >
          <Plus size={18} /> Add Product
        </button>
      </div>

      {/* Error alert if any */}
      {error && (
        <div className="alert-banner warning mb-4 flex-between">
          <span>⚠️ {error}</span>
          <button className="btn btn-outline btn-xs" onClick={refreshInventory}>Retry</button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
        <button
          className={`btn ${activeTab === 'products' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('products')}
          style={{ padding: '8px 18px', fontSize: '0.88rem', fontWeight: 700 }}
        >
          <Package size={16} /> Products & Stock ({total})
        </button>
        <button
          className={`btn ${activeTab === 'movements' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('movements')}
          style={{ padding: '8px 18px', fontSize: '0.88rem', fontWeight: 700 }}
        >
          <ArrowRightLeft size={16} /> Stock Movements & Audit Trail
        </button>
      </div>

      {activeTab === 'movements' ? (
        /* ── STOCK MOVEMENTS & AUDIT TRAIL TAB ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Movement Type Filter Bar */}
          <div className="card" style={{ padding: '12px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: 4 }}>Filter Movement:</span>
                {['ALL', 'SALE', 'RETURN', 'STOCK_IN', 'ADJUSTMENT'].map(m => (
                  <button
                    key={m}
                    className={`btn btn-xs ${movementFilter === m ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setMovementFilter(m)}
                    style={{ borderRadius: 6, padding: '4px 10px', fontSize: '0.75rem' }}
                  >
                    {m === 'ALL' ? 'All Movements' : m}
                  </button>
                ))}
              </div>

              <button className="btn btn-outline btn-xs" onClick={loadMovements}>
                <RefreshCw size={12} /> Refresh Log
              </button>
            </div>
          </div>

          {/* Movements Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {movementsLoading ? (
              <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)' }}>
                <RefreshCw size={24} className="spin-animation" style={{ margin: '0 auto 10px' }} />
                <p>Loading stock movements...</p>
              </div>
            ) : movements.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
                <History size={36} style={{ opacity: 0.2, margin: '0 auto 10px' }} />
                <p style={{ margin: 0, fontWeight: 600 }}>No stock movements recorded yet.</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Sales, returns, and stock adjustments will appear here with previous stock, quantity, and new stock.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="inv-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Previous Stock</th>
                      <th>Movement</th>
                      <th>Quantity</th>
                      <th>New Stock</th>
                      <th>Reference ID</th>
                      <th>Date & Time</th>
                      <th>User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map(m => {
                      const isSale = m.movementType === 'SALE';
                      const isReturn = m.movementType === 'RETURN';
                      const isStockIn = m.movementType === 'STOCK_IN' || m.movementType === 'PURCHASE';

                      const dateFormatted = m.createdAt
                        ? new Date(m.createdAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })
                        : '—';

                      return (
                        <tr key={m.id}>
                          <td>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                              {m.productName}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {m.brand ? `${m.brand} · ` : ''}{m.sku}
                            </div>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                              {m.previousStock}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 4,
                              background: isSale ? 'rgba(59, 130, 246, 0.15)' : isReturn ? 'rgba(245, 158, 11, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                              color: isSale ? 'var(--primary)' : isReturn ? 'var(--warning)' : 'var(--success)'
                            }}>
                              {m.movementType}
                            </span>
                          </td>
                          <td>
                            <strong style={{
                              fontSize: '0.95rem',
                              fontFamily: 'monospace',
                              color: isSale ? 'var(--danger)' : isReturn || isStockIn ? 'var(--success)' : 'var(--text-primary)'
                            }}>
                              {isSale ? `-${m.quantity}` : `+${m.quantity}`}
                            </strong>
                          </td>
                          <td>
                            <strong style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                              {m.newStock}
                            </strong>
                          </td>
                          <td>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {m.referenceId || '—'}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {dateFormatted}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontSize: '0.8rem' }}>
                              {m.userName || 'Admin'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── PRODUCTS & STOCK TAB ── */
        <>
          {/* Summary Stats Grid */}
          <div className="stats-grid mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            <div className="card stat-card" style={{ padding: '14px', cursor: 'pointer' }} onClick={() => setStatusFilter('All')}>
              <div className="stat-icon blue" style={{ width: 36, height: 36 }}><Package size={18} /></div>
              <div className="stat-info"><h3 style={{ fontSize: '0.75rem' }}>Total Products</h3><p style={{ fontSize: '1.25rem' }}>{total}</p></div>
            </div>
            <div className="card stat-card" style={{ padding: '14px', cursor: 'pointer' }} onClick={() => setStatusFilter('In Stock')}>
              <div className="stat-icon green" style={{ width: 36, height: 36 }}><Package size={18} /></div>
              <div className="stat-info"><h3 style={{ fontSize: '0.75rem' }}>In Stock</h3><p style={{ fontSize: '1.25rem' }}>{metrics.available}</p></div>
            </div>
            <div className="card stat-card" style={{ padding: '14px', cursor: 'pointer' }} onClick={() => setStatusFilter('Low Stock')}>
              <div className="stat-icon orange" style={{ width: 36, height: 36 }}><AlertTriangle size={18} /></div>
              <div className="stat-info"><h3 style={{ fontSize: '0.75rem' }}>Low Stock</h3><p style={{ fontSize: '1.25rem' }}>{metrics.lowStock}</p></div>
            </div>
            <div className="card stat-card" style={{ padding: '14px', cursor: 'pointer' }} onClick={() => setStatusFilter('Out of Stock')}>
              <div className="stat-icon red" style={{ width: 36, height: 36 }}><XCircle size={18} /></div>
              <div className="stat-info"><h3 style={{ fontSize: '0.75rem' }}>Out of Stock</h3><p style={{ fontSize: '1.25rem' }}>{metrics.outOfStock}</p></div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="search-input-wrapper mb-4" style={{ background: 'var(--bg-secondary)', padding: '6px 16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <Search size={20} className="text-muted" />
            <input
              type="text"
              className="search-input"
              style={{ padding: '10px', fontSize: '0.95rem' }}
              placeholder="Search products by name, brand, category, shelf (e.g. 'B1-01'), or SKU..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="btn-close" onClick={() => setSearchQuery('')}>✕</button>
            )}
          </div>

          {/* Filter Controls */}
          <div className="card mb-4" style={{ padding: '14px 18px' }}>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              
              {/* Stock status pills */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: 4 }}>Status:</span>
                {['All', 'In Stock', 'Low Stock', 'Out of Stock'].map(pill => (
                  <button
                    key={pill}
                    className={`pill-btn ${statusFilter === pill ? 'active' : ''}`}
                    onClick={() => setStatusFilter(pill)}
                  >
                    {pill}
                  </button>
                ))}
              </div>

              <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Category Dropdown */}
                <div className="custom-dropdown" style={{ minWidth: 150 }}>
                  <label>Category</label>
                  <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                    {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Sort Dropdown */}
                <div className="custom-dropdown" style={{ minWidth: 140 }}>
                  <label>Sort By</label>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                    <option value="name">Name (A-Z)</option>
                    <option value="quantity">Stock (Lowest First)</option>
                    <option value="price">Price</option>
                  </select>
                </div>

                {(searchQuery || statusFilter !== 'All' || categoryFilter !== 'All') && (
                  <button
                    className="btn btn-outline btn-sm self-end"
                    style={{ height: 38 }}
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('All');
                      setCategoryFilter('All');
                    }}
                  >
                    <RotateCcw size={14} /> Reset
                  </button>
                )}
              </div>

            </div>
          </div>
        </>
      )}


      {/* Products Table */}
      {isLoading ? (
        <div className="card text-center" style={{ padding: 48 }}>
          <Package size={36} style={{ opacity: 0.3, marginBottom: 10 }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading inventory...</p>
        </div>
      ) : (
        <div className="table-responsive-wrapper card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="inventory-table">
            <thead>
              <tr>
                <th style={{ minWidth: 220 }}>PRODUCT NAME</th>
                <th style={{ minWidth: 120 }}>CATEGORY</th>
                <th style={{ minWidth: 110 }}>BRAND</th>
                <th style={{ minWidth: 90 }}>PRICE</th>
                <th style={{ minWidth: 130 }}>STOCK</th>
                <th style={{ minWidth: 110 }}>SHELF</th>
                <th style={{ minWidth: 120 }}>STATUS</th>
                <th style={{ minWidth: 150, textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map(item => {
                const s = calculateStatus(item.stock, item.reorderLevel);
                const isOut = item.stock === 0;
                const isLow = item.stock > 0 && item.stock <= item.reorderLevel;
                const shelf = item.shelfLocation || item.shelf || 'B1-01';

                return (
                  <tr key={item.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 6, background: 'var(--bg-secondary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0
                        }}>
                          {getCategoryEmoji(item.category)}
                        </div>
                        <div>
                          <strong style={{ color: 'var(--text-primary)', fontSize: '0.92rem' }}>{item.name}</strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            {item.sku}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td><span className="cat-badge">{item.category}</span></td>

                    <td><span style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>{item.brand || '—'}</span></td>

                    <td>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                        ₹{item.price}
                      </strong>
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          className="stock-btn"
                          style={{ width: 22, height: 22, minWidth: 22, padding: 0 }}
                          onClick={(e) => handleQuickAdjust(e, item, -1)}
                          disabled={item.stock === 0}
                          title="Reduce stock by 1"
                        >
                          <Minus size={12} />
                        </button>

                        <span className={`qty-indicator ${isOut ? 'empty' : isLow ? 'low' : ''}`} style={{ minWidth: 46, textAlign: 'center' }}>
                          <strong>{item.stock}</strong> {item.unit || 'units'}
                        </span>

                        <button
                          className="stock-btn"
                          style={{ width: 22, height: 22, minWidth: 22, padding: 0 }}
                          onClick={(e) => handleQuickAdjust(e, item, 1)}
                          title="Add stock by 1"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </td>

                    <td>
                      {(() => {
                        const loc = parseLocation({
                          shelf: item.shelf,
                          rowNumber: item.row ?? item.rowNumber ?? item.row_number,
                          columnNumber: item.column ?? item.columnNumber ?? item.column_number,
                          locationCode: item.locationCode || item.location_code || item.shelfLocation
                        });
                        return (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, color: 'var(--primary)', fontSize: '0.88rem' }}>
                              <MapPin size={14} /> Shelf {loc.shelf}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                              Row: {String(loc.row).padStart(2, '0')} • Col: {String(loc.column).padStart(2, '0')}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 1 }}>
                              {loc.locationCode}
                            </div>
                          </div>
                        );
                      })()}
                    </td>

                    <td>
                      <span className={`status-badge static-badge ${s === 'In Stock' ? 'status-in-stock' : s === 'Low Stock' ? 'status-low-stock' : 'status-out-stock'}`}>
                        {s === 'In Stock' ? '✓ In Stock' : s === 'Low Stock' ? '⚠️ Low Stock' : '❌ Out of Stock'}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button
                          className="btn btn-outline btn-xs"
                          onClick={() => setSelectedProduct(item)}
                          title="View product details"
                        >
                          <Eye size={13} /> View
                        </button>
                        <button
                          className="btn btn-outline btn-xs"
                          onClick={() => setAddEditModalProduct(item)}
                          title="Edit product"
                        >
                          <Edit3 size={13} /> Edit
                        </button>
                        <button
                          className="btn btn-outline btn-xs text-danger"
                          style={{ borderColor: 'rgba(239, 68, 68, 0.25)' }}
                          onClick={() => setDeleteCandidate(item)}
                          title="Delete product"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Empty inventory state */}
              {inventory.length === 0 && !isLoading && (
                <tr>
                  <td colSpan="8">
                    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                      <Package size={48} style={{ opacity: 0.25, margin: '0 auto 12px' }} />
                      <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                        No products added yet.
                      </h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: 400, margin: '8px auto 20px' }}>
                        Start by adding your stationery items to manage stock and search inventory.
                      </p>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '10px 24px', fontSize: '0.95rem' }}
                        onClick={() => setAddEditModalProduct(null)}
                      >
                        <Plus size={16} /> Add Your First Product
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* No matching filter results */}
              {inventory.length > 0 && filteredData.length === 0 && (
                <tr>
                  <td colSpan="8">
                    <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <Search size={36} style={{ opacity: 0.3, margin: '0 auto 10px' }} />
                      <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>No matching products</h4>
                      <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Try clearing search or filters.</p>
                      <button
                        className="btn btn-outline btn-sm mt-3"
                        onClick={() => {
                          setSearchQuery('');
                          setStatusFilter('All');
                          setCategoryFilter('All');
                        }}
                      >
                        Clear Filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {addEditModalProduct !== undefined && (
        <AddEditProductModal
          product={addEditModalProduct}
          onClose={() => setAddEditModalProduct(undefined)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="confirm-dialog-overlay" onClick={() => setDeleteCandidate(null)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
            <h3>Delete Product "{deleteCandidate.name}"?</h3>
            <p>This action will permanently remove the item from your store database.</p>
            <div className="confirm-dialog-actions">
              <button className="btn btn-outline" onClick={() => setDeleteCandidate(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDeleteConfirm}>
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
