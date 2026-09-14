import { X, Minus, Plus, PackageSearch, MapPin, Timer, Package } from 'lucide-react';
import { calculateStatus } from '../data';
import { useStock } from '../context/StockContext';
import { calculateExpiryStatus, getDaysRemaining, getExpiryText } from '../utils';

export default function ProductModal({ product, onClose, onLoadStock }) {
    const { updateStock, computeActiveStock } = useStock();

    if (!product) return null;

    const status = calculateStatus(product.stock, product.reorderLevel);

    const handleIncrease = () => {
        updateStock(product.id, product.stock + 1);
    };

    const handleDecrease = () => {
        if (product.stock > 0) {
            updateStock(product.id, product.stock - 1);
        }
    };

    const formatDate = (d) => {
        if (!d) return 'N/A';
        return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const renderColumns = () => {
        const cols = ['01', '02', '03', '04', '05'];
        return cols.map(c => (
            <div key={c} className={`shelf-col-box ${product.column === c ? 'target-box' : ''}`}>
                {c}
            </div>
        ));
    };

    // Batch table for expiry-tracked items
    const sortedBatches = product.batches
        ? [...product.batches].sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))
        : [];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>{product.category}</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>•</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>{product.brand}</span>
                            {product.expiryTracking && (
                                <>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>•</span>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--warning)', background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: 4 }}>⏱ EXPIRY TRACKED</span>
                                </>
                            )}
                        </div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{product.name}</h2>
                        <div className="product-sku" style={{ marginTop: 8, marginBottom: 0 }}>SKU: {product.sku}</div>
                    </div>
                    <button onClick={onClose} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    {/* Left Column */}
                    <div>
                        <div className="modal-img-container">
                            {product.image ? (
                                <img
                                    src={product.image}
                                    alt={product.name}
                                    className="modal-img"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                    }}
                                />
                            ) : null}
                            <div className="fallback-img" style={{ display: product.image ? 'none' : 'flex', aspectRatio: '4/3' }}>
                                <PackageSearch size={64} opacity={0.5} />
                            </div>
                        </div>

                        <p style={{ marginTop: 16, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            {product.description}
                        </p>

                        <div style={{ marginTop: 24 }}>
                            <span style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--success)' }}>₹{product.price}</span>
                            <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>per {product.unit}</span>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div>
                        <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, marginBottom: 24 }}>
                            <div className="flex-between" style={{ marginBottom: 16 }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Stock Management</h3>
                                {onLoadStock && (
                                    <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem' }} onClick={onLoadStock}>
                                        <Plus size={14} /> Load Stock
                                    </button>
                                )}
                            </div>

                            <div className="flex-between" style={{ marginBottom: 16 }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Current Status</span>
                                <span className={`status-badge ${status === 'In Stock' ? 'status-in-stock' : status === 'Low Stock' ? 'status-low-stock' : 'status-out-stock'}`} style={{ position: 'static', padding: '6px 16px', fontSize: '0.85rem' }}>
                                    {status}
                                </span>
                            </div>

                            <div className="flex-between">
                                <span style={{ color: 'var(--text-secondary)' }}>Quantity Available</span>
                                <div className="stock-control">
                                    <button className="stock-btn" onClick={handleDecrease} disabled={product.stock === 0}>
                                        <Minus size={16} />
                                    </button>
                                    <span className="stock-value">{product.stock}</span>
                                    <button className="stock-btn" onClick={handleIncrease}>
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', marginTop: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Reorder level triggers at {product.reorderLevel} units
                            </div>
                        </div>

                        {/* BATCH TABLE (Expiry Tracked Items Only) */}
                        {product.expiryTracking && sortedBatches.length > 0 && (
                            <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, marginBottom: 24 }}>
                                <h3 style={{ marginBottom: 16, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Timer size={20} color="var(--warning)" /> Batch & Expiry Tracking
                                </h3>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px', fontSize: '0.8rem' }}>
                                        <thead>
                                            <tr style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.5px' }}>
                                                <th style={{ padding: '4px 8px', textAlign: 'left' }}>Batch</th>
                                                <th style={{ padding: '4px 8px', textAlign: 'center' }}>Qty</th>
                                                <th style={{ padding: '4px 8px', textAlign: 'left' }}>Loaded</th>
                                                <th style={{ padding: '4px 8px', textAlign: 'left' }}>Expiry</th>
                                                <th style={{ padding: '4px 8px', textAlign: 'left' }}>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedBatches.map((b, idx) => {
                                                const es = calculateExpiryStatus(b.expiryDate, true);
                                                const days = getDaysRemaining(b.expiryDate);
                                                return (
                                                    <tr key={idx} style={{
                                                        background: es === 'EXPIRED' ? 'rgba(239,68,68,0.08)' : es === 'CRITICAL' ? 'rgba(239,68,68,0.05)' : es === 'EXPIRING SOON' ? 'rgba(245,158,11,0.05)' : 'rgba(34,197,94,0.05)',
                                                        borderRadius: 8
                                                    }}>
                                                        <td style={{ padding: '8px', fontWeight: 600, fontFamily: 'monospace' }}>{b.batchId}</td>
                                                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: 600 }}>{b.currentQuantity}/{b.quantityLoaded}</td>
                                                        <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{formatDate(b.loadedDate)}</td>
                                                        <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{formatDate(b.expiryDate)}</td>
                                                        <td style={{ padding: '8px' }}>
                                                            <span className={`expiry-badge ${es === 'EXPIRED' ? 'expired' : es === 'CRITICAL' ? 'critical' : es === 'EXPIRING SOON' ? 'warning' : 'safe'}`}>
                                                                {es === 'EXPIRED' ? '⛔' : es === 'CRITICAL' ? '🔴' : es === 'EXPIRING SOON' ? '🟠' : '🟢'} {getExpiryText(days)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                {sortedBatches.some(b => b.supplier) && (
                                    <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        Suppliers: {[...new Set(sortedBatches.filter(b => b.supplier).map(b => b.supplier))].join(', ')}
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ border: '1px solid var(--border)', padding: 24, borderRadius: 12 }}>
                            <h3 style={{ marginBottom: 16, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <MapPin size={20} color="var(--primary)" /> Shelf Location System
                            </h3>

                            <div className="flex-between" style={{ marginBottom: 16 }}>
                                <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>Shelf {product.shelf}</span>
                                <span style={{ color: 'var(--text-secondary)' }}>Row {product.row} → Col {product.column}</span>
                            </div>

                            <div className="advanced-shelf-map">
                                <div className="shelf-structure">
                                    {['1', '2', '3'].map(rNum => {
                                        const rowName = `${product.shelf}${rNum}`;
                                        return (
                                            <div key={rowName} className="shelf-row-container">
                                                <div className="shelf-row-label">
                                                    Row {rowName}
                                                </div>
                                                <div className="shelf-cols" style={{ opacity: product.row === rowName ? 1 : 0.3 }}>
                                                    {renderColumns()}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            <p style={{ marginTop: 16, textAlign: 'center', fontWeight: '500', color: 'var(--primary)' }}>
                                Locate this item at: Shelf {product.shelf} → Row {product.row} → Column {product.column}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
