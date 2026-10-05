import { calculateStatus, getShelfSlot } from '../data';
import { calculateExpiryStatus, getDaysRemaining, getExpiryText } from '../utils';
import { Timer, MapPin, Eye } from 'lucide-react';
import { getCategoryEmoji } from './Layout';

export default function ProductCard({ product, onClick, onViewShelf }) {
  const status = calculateStatus(product.stock, product.reorderLevel);
  const shelfSlot = getShelfSlot(product);

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
  const displayStatus = status === 'In Stock' ? '✓ Available' : status === 'Low Stock' ? '⚠️ Low Stock' : '❌ Out of Stock';

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
          {displayStatus}
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
          <span>•</span>
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
        {(() => {
          const loc = parseLocation({
            shelf: product.shelf,
            rowNumber: product.row ?? product.rowNumber ?? product.row_number,
            columnNumber: product.column ?? product.columnNumber ?? product.column_number,
            locationCode: product.locationCode || product.location_code || product.shelfLocation
          });
          return (
            <div className="product-location">
              <div className="loc-item">
                <span className="loc-label">Shelf</span>
                <span className="loc-value" style={{ color: 'var(--primary)', fontWeight: 700 }}>Shelf {loc.shelf}</span>
              </div>
              <div className="loc-item">
                <span className="loc-label">Row</span>
                <span className="loc-value">{String(loc.row).padStart(2, '0')}</span>
              </div>
              <div className="loc-item">
                <span className="loc-label">Col</span>
                <span className="loc-value">{String(loc.column).padStart(2, '0')}</span>
              </div>
            </div>
          );
        })()}

        <div className="product-stock-row">
          Stock: <strong style={{ color: product.stock === 0 ? 'var(--danger)' : product.stock <= product.reorderLevel ? 'var(--warning)' : 'var(--text-primary)' }}>
            {product.stock} {product.unit || 'piece'}s
          </strong>
        </div>

        <div className="card-actions" style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn-full"
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
          >
            <Eye size={14} style={{ marginRight: 4 }} /> View Details
          </button>
          {onViewShelf && (
            <button
              className="btn btn-outline btn-sm"
              style={{ padding: '6px 10px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
              onClick={(e) => {
                e.stopPropagation();
                onViewShelf(product);
              }}
              title="View on Shelf Map"
            >
              <MapPin size={14} /> Shelf {shelfSlot}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
