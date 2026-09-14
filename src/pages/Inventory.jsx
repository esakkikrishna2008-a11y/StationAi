import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useStock } from '../context/StockContext';
import { calculateStatus } from '../data';
import { calculateExpiryStatus, getDaysRemaining, getExpiryText } from '../utils';
import { Filter, Search, Package, AlertTriangle, XCircle, PackageSearch, Plus, Timer, Ban, ArrowUpDown } from 'lucide-react';
import ProductModal from '../components/ProductModal';
import LoadStockModal from '../components/LoadStockModal';
import { getCategoryEmoji } from '../components/Layout';

export default function Inventory() {
    const { inventory, computeActiveStock } = useStock();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [brandFilter, setBrandFilter] = useState('All');
    const [shelfFilter, setShelfFilter] = useState('All');
    const [expiryFilter, setExpiryFilter] = useState('All');
    const [sortBy, setSortBy] = useState('name');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [loadStockProduct, setLoadStockProduct] = useState(null);

    // Read URL params for pre-filtering
    useEffect(() => {
        const ep = searchParams.get('expiry');
        if (ep) setExpiryFilter(ep);
    }, [searchParams]);

    const categories = useMemo(() => ['All', ...new Set(inventory.map(i => i.category))], [inventory]);
    const brands = useMemo(() => ['All', ...new Set(inventory.map(i => i.brand))], [inventory]);
    const shelves = useMemo(() => ['All', ...new Set(inventory.map(i => i.shelf))], [inventory]);

    // Statistics
    const total = inventory.length;
    const metricsData = useMemo(() => {
        const m = { available: 0, lowStock: 0, outOfStock: 0, expiringSoon: 0, expired: 0 };
        inventory.forEach(item => {
            const status = calculateStatus(item.stock, item.reorderLevel);
            if (status === 'In Stock') m.available++;
            else if (status === 'Low Stock') m.lowStock++;
            else if (status === 'Out of Stock') m.outOfStock++;
            if (item.expiryTracking && item.batches) {
                item.batches.forEach(b => {
                    const es = calculateExpiryStatus(b.expiryDate, true);
                    if (es === 'EXPIRED') m.expired++;
                    else if (es === 'EXPIRING SOON' || es === 'CRITICAL') m.expiringSoon++;
                });
            }
        });
        return m;
    }, [inventory]);

    // Helper: Get the earliest-expiring batch for an item
    const getEarliestBatch = (item) => {
        if (!item.expiryTracking || !item.batches || item.batches.length === 0) return null;
        const validBatches = item.batches.filter(b => b.expiryDate);
        if (validBatches.length === 0) return null;
        return validBatches.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))[0];
    };

    // Filtering Logic
    const filteredData = useMemo(() => {
        let data = inventory.filter(item => {
            const q = searchQuery.toLowerCase().trim();
            let matchesSearch = true;
            if (q) {
                const batchMatch = item.batches?.some(b =>
                    b.batchId?.toLowerCase().includes(q) ||
                    b.supplier?.toLowerCase().includes(q)
                );
                matchesSearch =
                    item.name.toLowerCase().includes(q) ||
                    item.sku.toLowerCase().includes(q) ||
                    item.brand.toLowerCase().includes(q) ||
                    item.category.toLowerCase().includes(q) ||
                    item.shelf.toLowerCase().includes(q) ||
                    item.row.toLowerCase().includes(q) ||
                    item.column.toLowerCase().includes(q) ||
                    batchMatch;
            }

            const currentStatus = calculateStatus(item.stock, item.reorderLevel);
            let matchesStatus = true;
            if (statusFilter === 'Expiring Soon') {
                matchesStatus = item.batches?.some(b => { const es = calculateExpiryStatus(b.expiryDate, item.expiryTracking); return es === 'EXPIRING SOON' || es === 'CRITICAL'; });
            } else if (statusFilter === 'Expired') {
                matchesStatus = item.batches?.some(b => calculateExpiryStatus(b.expiryDate, item.expiryTracking) === 'EXPIRED');
            } else if (statusFilter !== 'All') {
                matchesStatus = currentStatus === statusFilter;
            }

            let matchesExpiry = true;
            if (expiryFilter !== 'All') {
                if (expiryFilter === 'No Expiry') {
                    matchesExpiry = !item.expiryTracking;
                } else {
                    const eb = getEarliestBatch(item);
                    if (!eb) { matchesExpiry = false; }
                    else {
                        const es = calculateExpiryStatus(eb.expiryDate, true);
                        if (expiryFilter === 'Safe') matchesExpiry = es === 'SAFE';
                        else if (expiryFilter === 'Expiring Soon') matchesExpiry = es === 'EXPIRING SOON' || es === 'CRITICAL';
                        else if (expiryFilter === 'Critical') matchesExpiry = es === 'CRITICAL';
                        else if (expiryFilter === 'Expired') matchesExpiry = es === 'EXPIRED';
                    }
                }
            }

            let matchesCategory = categoryFilter === 'All' ? true : item.category === categoryFilter;
            let matchesBrand = brandFilter === 'All' ? true : item.brand === brandFilter;
            let matchesShelf = shelfFilter === 'All' ? true : item.shelf === shelfFilter;

            return matchesSearch && matchesStatus && matchesExpiry && matchesCategory && matchesBrand && matchesShelf;
        });

        // Sorting
        if (sortBy === 'expiry') {
            data.sort((a, b) => {
                const ea = getEarliestBatch(a);
                const eb = getEarliestBatch(b);
                if (!ea && !eb) return 0;
                if (!ea) return 1;
                if (!eb) return -1;
                return new Date(ea.expiryDate) - new Date(eb.expiryDate);
            });
        } else if (sortBy === 'quantity') {
            data.sort((a, b) => a.stock - b.stock);
        } else if (sortBy === 'price') {
            data.sort((a, b) => a.price - b.price);
        } else {
            data.sort((a, b) => a.name.localeCompare(b.name));
        }

        return data;
    }, [inventory, searchQuery, statusFilter, expiryFilter, categoryFilter, brandFilter, shelfFilter, sortBy]);

    const formatDate = (d) => {
        if (!d) return 'N/A';
        return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
        <div className="inventory-page">
            <div className="page-header flex-between">
                <div>
                    <h2>Store Inventory</h2>
                    <p>Manage and view all stationery items in the product catalog.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setLoadStockProduct('select')}>
                    <Plus size={18} /> Load Stock
                </button>
            </div>

            {/* STATS */}
            <div className="stats-grid mb-4">
                <div className="card stat-card">
                    <div className="stat-icon blue"><Package size={20} /></div>
                    <div className="stat-info"><h3>Total</h3><p>{total}</p></div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon green"><Package size={20} /></div>
                    <div className="stat-info"><h3>In Stock</h3><p>{metricsData.available}</p></div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon orange"><AlertTriangle size={20} /></div>
                    <div className="stat-info"><h3>Low Stock</h3><p>{metricsData.lowStock}</p></div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon red"><XCircle size={20} /></div>
                    <div className="stat-info"><h3>Out of Stock</h3><p>{metricsData.outOfStock}</p></div>
                </div>
            </div>

            {/* SEARCH */}
            <div className="search-input-wrapper mb-4" style={{ background: 'var(--bg-secondary)', padding: '8px 24px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <Search size={22} className="text-muted" />
                <input type="text" className="search-input" style={{ padding: '12px', fontSize: '1.1rem' }}
                    placeholder="Search products, SKU, brand, batch number, supplier, shelf..."
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>

            {/* FILTERS */}
            <div className="card mb-4" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['All', 'In Stock', 'Low Stock', 'Out of Stock', 'Expiring Soon', 'Expired'].map(pill => (
                        <button key={pill} className={`pill-btn ${statusFilter === pill ? 'active' : ''}`}
                            onClick={() => { setStatusFilter(pill); if (pill === 'Expiring Soon' || pill === 'Expired') setExpiryFilter('All'); }}>
                            {pill === 'All' ? 'All Items' : pill}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <div className="custom-dropdown">
                        <label>Category</label>
                        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="custom-dropdown">
                        <label>Brand</label>
                        <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
                            {brands.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                    <div className="custom-dropdown">
                        <label>Shelf</label>
                        <select value={shelfFilter} onChange={e => setShelfFilter(e.target.value)}>
                            {shelves.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="custom-dropdown">
                        <label>Expiry</label>
                        <select value={expiryFilter} onChange={e => setExpiryFilter(e.target.value)}>
                            <option value="All">All</option>
                            <option value="Safe">Safe</option>
                            <option value="Expiring Soon">Expiring Soon</option>
                            <option value="Critical">Critical</option>
                            <option value="Expired">Expired</option>
                            <option value="No Expiry">No Expiry</option>
                        </select>
                    </div>
                    <div className="custom-dropdown">
                        <label>Sort By</label>
                        <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                            <option value="name">Product Name</option>
                            <option value="expiry">Expiry Date</option>
                            <option value="quantity">Quantity</option>
                            <option value="price">Price</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* TABLE */}
            <div className="table-responsive-wrapper">
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th style={{ minWidth: '60px' }}>IMAGE</th>
                            <th style={{ minWidth: '200px' }}>PRODUCT</th>
                            <th style={{ minWidth: '100px' }}>CATEGORY</th>
                            <th style={{ minWidth: '110px' }}>BRAND</th>
                            <th style={{ minWidth: '90px' }}>SKU</th>
                            <th style={{ minWidth: '80px' }}>QTY</th>
                            <th style={{ minWidth: '110px' }}>BATCH</th>
                            <th style={{ minWidth: '100px' }}>LOADED</th>
                            <th style={{ minWidth: '140px' }}>EXPIRY</th>
                            <th style={{ minWidth: '140px' }}>LOCATION</th>
                            <th style={{ minWidth: '70px' }}>PRICE</th>
                            <th style={{ minWidth: '110px' }}>STATUS</th>
                            <th style={{ minWidth: '90px' }}>ACTION</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.map(item => {
                            const status = calculateStatus(item.stock, item.reorderLevel);
                            const eb = getEarliestBatch(item);
                            const days = eb ? getDaysRemaining(eb.expiryDate) : null;
                            const expiryStatus = eb ? calculateExpiryStatus(eb.expiryDate, true) : (item.expiryTracking ? 'NO DATA' : 'NOT APPLICABLE');

                            return (
                                <tr key={item.id}>
                                    <td>
                                        <div className="tbl-img">
                                            {item.image ? (
                                                <img src={item.image} alt={item.name}
                                                    onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }} />
                                            ) : null}
                                            <span style={{ display: item.image ? 'none' : 'block', fontSize: '1.6rem' }}>
                                                {getCategoryEmoji(item.category)}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="tbl-product">
                                            <strong>{item.name}</strong>
                                            <span className="sku">SKU: {item.sku}</span>
                                        </div>
                                    </td>
                                    <td><span className="cat-badge">{item.category}</span></td>
                                    <td><span className="tbl-brand">{item.brand}</span></td>
                                    <td><span className="sku-badge">{item.sku}</span></td>
                                    <td>
                                        <div className={`qty-indicator ${item.stock === 0 ? 'empty' : item.stock <= item.reorderLevel ? 'low' : ''}`}>
                                            <strong>{item.stock}</strong> units
                                        </div>
                                    </td>
                                    <td>
                                        {eb ? (
                                            <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-primary)' }}>{eb.batchId}</span>
                                        ) : (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
                                        )}
                                    </td>
                                    <td>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                            {eb ? formatDate(eb.loadedDate) : '—'}
                                        </span>
                                    </td>
                                    <td>
                                        {!item.expiryTracking ? (
                                            <span className="expiry-badge safe" style={{ background: 'var(--bg-card)', color: 'var(--text-muted)' }}>N/A</span>
                                        ) : eb ? (
                                            <div>
                                                <div style={{ fontSize: '0.8rem', marginBottom: 2 }}>{formatDate(eb.expiryDate)}</div>
                                                <span className={`expiry-badge ${expiryStatus === 'EXPIRED' ? 'expired' : expiryStatus === 'CRITICAL' ? 'critical' : expiryStatus === 'EXPIRING SOON' ? 'warning' : 'safe'}`}>
                                                    {expiryStatus === 'EXPIRED' ? '⛔' : expiryStatus === 'CRITICAL' ? '🔴' : expiryStatus === 'EXPIRING SOON' ? '🟠' : '🟢'} {getExpiryText(days)}
                                                </span>
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No batches</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="loc-card">
                                            <div className="loc-main">📍 Shelf {item.shelf}</div>
                                            <div>Row {item.row}</div>
                                            <div>Col {item.column}</div>
                                        </div>
                                    </td>
                                    <td><div className="tbl-price">₹{item.price}</div></td>
                                    <td>
                                        <span className={`status-badge static-badge ${status === 'In Stock' ? 'status-in-stock' : status === 'Low Stock' ? 'status-low-stock' : 'status-out-stock'}`}>
                                            {status === 'In Stock' ? '● In Stock' : status === 'Low Stock' ? '● Low Stock' : '● Out of Stock'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 4, flexDirection: 'column' }}>
                                            <button className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => setSelectedProduct(item)}>View</button>
                                            <button className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => setLoadStockProduct(item)}>+ Load</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}

                        {filteredData.length === 0 && (
                            <tr>
                                <td colSpan="13">
                                    <div className="empty-search">
                                        <Search size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
                                        <h3>No products found</h3>
                                        <p>Try different filters or search criteria.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {selectedProduct && (
                <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onLoadStock={() => { setLoadStockProduct(selectedProduct); setSelectedProduct(null); }} />
            )}

            {loadStockProduct === 'select' && (
                <div className="modal-overlay" onClick={() => setLoadStockProduct(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <div className="modal-header">
                            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Select Product to Load</h2>
                            <button className="btn-close" onClick={() => setLoadStockProduct(null)}>✕</button>
                        </div>
                        <div style={{ padding: 24, maxHeight: 400, overflowY: 'auto' }}>
                            {inventory.map(p => (
                                <div key={p.id} className="alert-row" style={{ cursor: 'pointer', marginBottom: 8 }}
                                    onClick={() => setLoadStockProduct(p)}>
                                    <div style={{ flex: 1 }}>
                                        <strong>{p.name}</strong>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.sku} • {p.brand}</div>
                                    </div>
                                    {p.expiryTracking && <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', borderRadius: 4, fontWeight: 600 }}>EXPIRY</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {loadStockProduct && loadStockProduct !== 'select' && (
                <LoadStockModal product={loadStockProduct} onClose={() => setLoadStockProduct(null)} />
            )}
        </div>
    );
}
