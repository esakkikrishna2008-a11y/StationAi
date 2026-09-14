import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStock } from '../context/StockContext';
import { calculateStatus } from '../data';
import { calculateExpiryStatus } from '../utils';
import ProductCard from '../components/ProductCard';
import ProductModal from '../components/ProductModal';
import LoadStockModal from '../components/LoadStockModal';
import { Search, Filter, PackageX, Timer } from 'lucide-react';

export default function FindItem() {
    const { inventory } = useStock();
    const [searchParams] = useSearchParams();

    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [stockFilter, setStockFilter] = useState('All');
    const [expiryFilter, setExpiryFilter] = useState('All');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [loadStockProduct, setLoadStockProduct] = useState(null);

    // Read URL params
    useEffect(() => {
        const q = searchParams.get('q');
        if (q) setSearchQuery(q);
    }, [searchParams]);

    // Save recent searches
    useEffect(() => {
        if (searchQuery.trim().length > 2) {
            const timer = setTimeout(() => {
                const saved = JSON.parse(localStorage.getItem('stationAI_recent') || '[]');
                const entry = { query: searchQuery.trim(), timestamp: Date.now() };
                const filtered = saved.filter(s => s.query.toLowerCase() !== searchQuery.trim().toLowerCase());
                const updated = [entry, ...filtered].slice(0, 5);
                localStorage.setItem('stationAI_recent', JSON.stringify(updated));
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [searchQuery]);

    const categories = useMemo(() => {
        const cats = new Set(inventory.map(item => item.category));
        return ['All', ...Array.from(cats)];
    }, [inventory]);

    const getEarliestBatch = (item) => {
        if (!item.expiryTracking || !item.batches || item.batches.length === 0) return null;
        const valid = item.batches.filter(b => b.expiryDate);
        if (valid.length === 0) return null;
        return valid.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))[0];
    };

    const filteredProducts = useMemo(() => {
        return inventory.filter(item => {
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

            let matchesCategory = true;
            if (categoryFilter !== 'All') {
                matchesCategory = item.category === categoryFilter;
            }

            let matchesStock = true;
            if (stockFilter !== 'All') {
                const currentStatus = calculateStatus(item.stock, item.reorderLevel);
                matchesStock = currentStatus === stockFilter;
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
                        else if (expiryFilter === 'Expired') matchesExpiry = es === 'EXPIRED';
                    }
                }
            }

            return matchesSearch && matchesCategory && matchesStock && matchesExpiry;
        });
    }, [inventory, searchQuery, categoryFilter, stockFilter, expiryFilter]);

    return (
        <div>
            <div className="page-header flex-between">
                <div>
                    <h2>Find Items & Location</h2>
                    <p>Search via attributes to locate physical products on the store shelves.</p>
                </div>
            </div>

            <div className="filter-panel mb-4">
                <div style={{ flex: 2, minWidth: 280 }} className="filter-group">
                    <label>Global Search</label>
                    <div className="search-input-wrapper" style={{ background: 'var(--bg-card)', padding: '4px 12px', border: '1px solid var(--border)', borderRadius: 8 }}>
                        <Search size={18} className="text-muted" />
                        <input
                            type="text"
                            className="search-input"
                            style={{ padding: '8px', fontSize: '1rem' }}
                            placeholder="Search Name, SKU, Shelf, Batch, Supplier..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="filter-group">
                    <label>Category</label>
                    <select
                        className="filter-select"
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                    >
                        {categories.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label>Stock Status</label>
                    <select
                        className="filter-select"
                        value={stockFilter}
                        onChange={e => setStockFilter(e.target.value)}
                    >
                        <option value="All">All Statuses</option>
                        <option value="In Stock">In Stock</option>
                        <option value="Low Stock">Low Stock</option>
                        <option value="Out of Stock">Out of Stock</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label>Expiry Status</label>
                    <select
                        className="filter-select"
                        value={expiryFilter}
                        onChange={e => setExpiryFilter(e.target.value)}
                    >
                        <option value="All">All</option>
                        <option value="Safe">Safe</option>
                        <option value="Expiring Soon">Expiring Soon</option>
                        <option value="Expired">Expired</option>
                        <option value="No Expiry">No Expiry</option>
                    </select>
                </div>
            </div>

            <div className="mb-4 flex-between" style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Filter size={18} />
                    Showing {filteredProducts.length} Results
                </div>
            </div>

            {filteredProducts.length > 0 ? (
                <div className="product-grid">
                    {filteredProducts.map(product => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            onClick={() => setSelectedProduct(product)}
                        />
                    ))}
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border)' }}>
                    <PackageX size={64} style={{ margin: '0 auto 16px', color: 'var(--text-muted)', opacity: 0.5 }} />
                    <h3 style={{ fontSize: '1.5rem', marginBottom: 8 }}>No products found</h3>
                    <p className="text-secondary" style={{ maxWidth: 400, margin: '0 auto' }}>
                        We couldn't find any items matching your current filters and search query "{searchQuery}".
                    </p>
                    <button
                        className="btn btn-primary mt-4"
                        onClick={() => {
                            setSearchQuery('');
                            setCategoryFilter('All');
                            setStockFilter('All');
                            setExpiryFilter('All');
                        }}
                    >
                        Clear Filters
                    </button>
                </div>
            )}

            {selectedProduct && (
                <ProductModal
                    product={selectedProduct}
                    onClose={() => setSelectedProduct(null)}
                    onLoadStock={() => { setLoadStockProduct(selectedProduct); setSelectedProduct(null); }}
                />
            )}

            {loadStockProduct && (
                <LoadStockModal product={loadStockProduct} onClose={() => setLoadStockProduct(null)} />
            )}
        </div>
    );
}
