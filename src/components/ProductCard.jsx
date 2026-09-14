import { calculateStatus } from '../data';
import { calculateExpiryStatus, getDaysRemaining, getExpiryText } from '../utils';
import { PackageSearch, Timer } from 'lucide-react';

export default function ProductCard({ product, onClick }) {
    const status = calculateStatus(product.stock, product.reorderLevel);

    // Get earliest batch for expiry display
    const getEarliestBatch = () => {
        if (!product.expiryTracking || !product.batches || product.batches.length === 0) return null;
        const valid = product.batches.filter(b => b.expiryDate);
        if (valid.length === 0) return null;
        return valid.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))[0];
    };

    const eb = getEarliestBatch();
    const expiryStatus = eb ? calculateExpiryStatus(eb.expiryDate, true) : null;
    const days = eb ? getDaysRemaining(eb.expiryDate) : null;

    return (
        <div className="product-card" onClick={onClick} style={{ cursor: 'pointer' }}>
            <div className="product-img-wrapper">
                <span className={`status-badge ${status === 'In Stock' ? 'status-in-stock' : status === 'Low Stock' ? 'status-low-stock' : 'status-out-stock'}`}>
                    {status}
                </span>
                {product.image ? (
                    <img
                        src={product.image}
                        alt={product.name}
                        className="product-img"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                        }}
                    />
                ) : null}

                <div className="fallback-img" style={{ display: product.image ? 'none' : 'flex' }}>
                    <PackageSearch size={48} opacity={0.5} />
                </div>
            </div>

            <div className="product-card-body">
                <div className="product-meta">
                    <span>{product.category}</span>
                    <span>{product.brand}</span>
                </div>

                <div className="product-sku">SKU: {product.sku}</div>
                <h3 className="product-title">{product.name}</h3>

                <div className="product-price">₹{product.price}</div>

                {/* Expiry mini-badge */}
                {eb && (
                    <div style={{ margin: '8px 0', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem' }}>
                        <Timer size={14} color={expiryStatus === 'EXPIRED' ? 'var(--danger)' : expiryStatus === 'CRITICAL' ? 'var(--danger)' : expiryStatus === 'EXPIRING SOON' ? 'var(--warning)' : 'var(--success)'} />
                        <span className={`expiry-badge ${expiryStatus === 'EXPIRED' ? 'expired' : expiryStatus === 'CRITICAL' ? 'critical' : expiryStatus === 'EXPIRING SOON' ? 'warning' : 'safe'}`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                            {getExpiryText(days)}
                        </span>
                    </div>
                )}

                <div className="product-location">
                    <div className="loc-item">
                        <span className="loc-label">Shelf</span>
                        <span className="loc-value">{product.shelf}</span>
                    </div>
                    <div className="loc-item">
                        <span className="loc-label">Row</span>
                        <span className="loc-value">{product.row}</span>
                    </div>
                    <div className="loc-item" style={{ borderLeft: '1px solid var(--border)', paddingLeft: '8px' }}>
                        <span className="loc-label">Col</span>
                        <span className="loc-value">{product.column}</span>
                    </div>
                </div>

                <div className="flex-between" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
                    <span>Stock: <strong>{product.stock} {product.unit}s</strong></span>
                </div>

                <div className="card-actions">
                    <button className="btn-full">View Details</button>
                </div>
            </div>
        </div>
    );
}
