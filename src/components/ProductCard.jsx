import { calculateStatus } from '../data';
import { calculateExpiryStatus, getDaysRemaining, getExpiryText } from '../utils';
import { Timer } from 'lucide-react';
import { getCategoryEmoji } from './Layout';

export default function ProductCard({ product, onClick }) {
  const status = calculateStatus(product.stock, product.reorderLevel);

  const getEarliestBatch = () => {
    if (!product.expiryTracking || !product.batches || product.batches.length === 0) return null;
    const valid = product.batches.filter(b => b.expiryDate);
    if (valid.length === 0) return null;
    return valid.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))[0];
  };

  const eb = getEarliestBatch();
  const expiryStatus = eb ? calculateExpiryStatus(eb.expiryDate, true) : null;
  const days = eb ? getDaysRemaining(eb.expiryDate) : null;

  const statusClass = status === 'In Stock' ? 'status-in-stock' : status === 'Low Stock' ? 'status-low-stock' : 'status-out-stock';

  return (
    <div
      className="product-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick?.()}
      aria-label={`View details for ${product.name}`}
    >
      {/* Image area */}
      <div className="product-img-wrapper">
        <span className={`status-badge ${statusClass}`}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
          {status}
        </span>

        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="product-img"
            onError={e => {
              e.target.style.display = 'none';
              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}

        <div
          className="fallback-img"
          style={{ display: product.image ? 'none' : 'flex' }}
          aria-hidden="true"
        >
          {getCategoryEmoji(product.category)}
        </div>
      </div>

      {/* Card body */}
      <div className="product-card-body">
        <div className="product-meta">
          <span>{product.category}</span>
          <span>{product.brand}</span>
        </div>

        <div className="product-sku">SKU: {product.sku}</div>

        <h3 className="product-title">{product.name}</h3>

        <div className="product-price">₹{product.price.toLocaleString('en-IN')}</div>

        {/* Expiry mini-badge */}
        {eb && (
          <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem' }}>
            <Timer
              size={12}
              color={expiryStatus === 'EXPIRED' || expiryStatus === 'CRITICAL' ? 'var(--danger)' : expiryStatus === 'EXPIRING SOON' ? 'var(--warning)' : 'var(--success)'}
            />
            <span className={`expiry-badge ${expiryStatus === 'EXPIRED' ? 'expired' : expiryStatus === 'CRITICAL' ? 'critical' : expiryStatus === 'EXPIRING SOON' ? 'warning' : 'safe'}`}>
              {getExpiryText(days)}
            </span>
          </div>
        )}

        {/* Location */}
        <div className="product-location">
          <div className="loc-item">
            <span className="loc-label">Shelf</span>
            <span className="loc-value">{product.shelf}</span>
          </div>
          <div className="loc-item">
            <span className="loc-label">Row</span>
            <span className="loc-value">{product.row}</span>
          </div>
          <div className="loc-item">
            <span className="loc-label">Col</span>
            <span className="loc-value">{product.column}</span>
          </div>
        </div>

        <div className="product-stock-row">
          Stock: <strong style={{ color: product.stock === 0 ? 'var(--danger)' : product.stock <= product.reorderLevel ? 'var(--warning)' : 'var(--text-primary)' }}>
            {product.stock} {product.unit}s
          </strong>
        </div>

        <div className="card-actions">
          <button className="btn-full">View Details</button>
        </div>
      </div>
    </div>
  );
}
