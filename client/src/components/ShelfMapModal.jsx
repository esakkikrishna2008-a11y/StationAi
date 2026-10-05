import { useState, useMemo, useEffect } from 'react';
import { X, MapPin, Package, CheckCircle, Sparkles, Layers } from 'lucide-react';
import { getGridConfig, formatLocationCode, formatLocationDisplay, parseLocation } from '../data';
import { useStock } from '../context/StockContext';
import { getCategoryEmoji } from './Layout';

export default function ShelfMapModal({ product, targetSlot: initialTargetSlot, onClose, onSelectProduct }) {
  const { inventory } = useStock();
  const gridConfig = useMemo(() => getGridConfig(), []);
  const shelvesList = gridConfig.shelves || ['A', 'B', 'C', 'D'];
  const totalRows = gridConfig.rows || 5;
  const totalCols = gridConfig.columns || 5;

  const targetLoc = useMemo(() => {
    if (product) {
      return parseLocation({
        shelf: product.shelf,
        rowNumber: product.row ?? product.rowNumber ?? product.row_number,
        columnNumber: product.column ?? product.columnNumber ?? product.column_number,
        locationCode: product.locationCode || product.location_code || product.shelfLocation
      });
    }
    if (initialTargetSlot) {
      return parseLocation(initialTargetSlot);
    }
    return { shelf: 'B', row: 2, column: 3, locationCode: 'B-02-03', locationDisplay: '📍 Shelf B • Row 2 • Column 03' };
  }, [product, initialTargetSlot]);

  const [activeShelf, setActiveShelf] = useState(targetLoc.shelf);
  const [selectedCell, setSelectedCell] = useState({ row: targetLoc.row, col: targetLoc.column });

  useEffect(() => {
    setActiveShelf(targetLoc.shelf);
    setSelectedCell({ row: targetLoc.row, col: targetLoc.column });
  }, [targetLoc]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Map real database products by location key (e.g. 'B-2-3')
  const occupiedMap = useMemo(() => {
    const map = {};
    if (Array.isArray(inventory)) {
      inventory.forEach(item => {
        const loc = parseLocation({
          shelf: item.shelf,
          rowNumber: item.row ?? item.rowNumber ?? item.row_number,
          columnNumber: item.column ?? item.columnNumber ?? item.column_number,
          locationCode: item.locationCode || item.location_code || item.shelfLocation
        });
        const key = `${loc.shelf}-${loc.row}-${loc.column}`;
        map[key] = {
          ...item,
          shelf: loc.shelf,
          row: loc.row,
          column: loc.column,
          locationCode: loc.locationCode,
          locationDisplay: loc.locationDisplay
        };
      });
    }
    return map;
  }, [inventory]);

  const selectedKey = `${activeShelf}-${selectedCell.row}-${selectedCell.col}`;
  const selectedProduct = occupiedMap[selectedKey] || null;

  const shelfProducts = useMemo(() => {
    return inventory.filter(item => {
      const loc = parseLocation({
        shelf: item.shelf,
        rowNumber: item.row ?? item.rowNumber ?? item.row_number,
        columnNumber: item.column ?? item.columnNumber ?? item.column_number,
        locationCode: item.locationCode || item.location_code || item.shelfLocation
      });
      return loc.shelf === activeShelf;
    });
  }, [inventory, activeShelf]);

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="shelf-map-title">
      <div className="modal-content shelf-map-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 860 }}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="badge-primary-soft">
                <MapPin size={13} /> Interactive Store Map
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>StationAI Physical Shelf Navigator</span>
            </div>
            <h2 id="shelf-map-title" style={{ margin: 0, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              Store Shelf Layout & Storage Location
            </h2>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close shelf map">
            <X size={18} />
          </button>
        </div>

        {/* Target Product Banner */}
        {product && (
          <div className="shelf-target-banner" style={{ margin: '0 20px 16px', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(59,130,246,0.1)', borderRadius: 10, border: '1px solid rgba(59,130,246,0.3)' }}>
            <div className="shelf-target-icon" style={{ color: 'var(--primary)' }}>
              <Sparkles size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 600, color: 'var(--text-muted)' }}>Target Product</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{product.name}</div>
            </div>
            <div className="shelf-target-badge" style={{ fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={16} /> {targetLoc.locationDisplay} ({targetLoc.locationCode})
            </div>
          </div>
        )}

        {/* Shelf Tabs */}
        <div style={{ padding: '0 20px', marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${shelvesList.length}, 1fr)`, gap: 8 }}>
            {shelvesList.map(s => {
              const isSelected = activeShelf === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setActiveShelf(s);
                    setSelectedCell({ row: 1, col: 1 });
                  }}
                  style={{
                    padding: '8px',
                    borderRadius: 8,
                    border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-secondary)',
                    color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  SHELF {s} {isSelected && '✓'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Body with Grid and Inspector */}
        <div style={{ padding: '0 20px 20px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
          
          {/* 5x5 Grid */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, overflowX: 'auto' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `60px repeat(${totalCols}, minmax(36px, 1fr))`,
              gap: 6,
              marginBottom: 6,
              textAlign: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--text-muted)'
            }}>
              <div style={{ textAlign: 'left' }}>ROWS</div>
              {Array.from({ length: totalCols }, (_, i) => (
                <div key={i}>{String(i + 1).padStart(2, '0')}</div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Array.from({ length: totalRows }, (_, rIndex) => {
                const rowNum = rIndex + 1;
                return (
                  <div
                    key={rowNum}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `60px repeat(${totalCols}, minmax(36px, 1fr))`,
                      gap: 6,
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      R{rowNum}
                    </div>

                    {Array.from({ length: totalCols }, (_, cIndex) => {
                      const colNum = cIndex + 1;
                      const cellKey = `${activeShelf}-${rowNum}-${colNum}`;
                      const isOccupied = Boolean(occupiedMap[cellKey]);
                      const productInCell = occupiedMap[cellKey];
                      const isSelected = selectedCell.row === rowNum && selectedCell.col === colNum;
                      const isTarget = targetLoc.shelf === activeShelf && targetLoc.row === rowNum && targetLoc.column === colNum;

                      let bgStyle = 'rgba(34, 197, 94, 0.12)';
                      let borderStyle = '1px solid rgba(34, 197, 94, 0.35)';
                      let iconSymbol = '🟩';

                      if (isSelected || isTarget) {
                        bgStyle = 'rgba(59, 130, 246, 0.25)';
                        borderStyle = '2px solid #3b82f6';
                        iconSymbol = '🟦';
                      } else if (isOccupied) {
                        bgStyle = 'rgba(239, 68, 68, 0.15)';
                        borderStyle = '1px solid rgba(239, 68, 68, 0.4)';
                        iconSymbol = '🟥';
                      }

                      return (
                        <button
                          key={colNum}
                          type="button"
                          onClick={() => setSelectedCell({ row: rowNum, col: colNum })}
                          title={productInCell ? `${productInCell.name} (${activeShelf}-${rowNum}-${colNum})` : `Available (${activeShelf}-${rowNum}-${colNum})`}
                          style={{
                            height: 38,
                            borderRadius: 6,
                            background: bgStyle,
                            border: borderStyle,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                          }}
                        >
                          {iconSymbol}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 12, paddingTop: 8, borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>🟩 Available</span>
              <span>🟥 Occupied</span>
              <span>🟦 Selected</span>
            </div>
          </div>

          {/* Details Inspector */}
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Inspecting Location
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', marginTop: 2, marginBottom: 12 }}>
              {formatLocationDisplay(activeShelf, selectedCell.row, selectedCell.col)}
            </div>

            {selectedProduct ? (
              <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: 12, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span>{getCategoryEmoji(selectedProduct.category)}</span>
                  <div>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '0.92rem' }}>{selectedProduct.name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{selectedProduct.brand} • {selectedProduct.category}</div>
                  </div>
                </div>
                <div className="flex-between" style={{ fontSize: '0.85rem', marginTop: 6 }}>
                  <span>Price: <strong>₹{selectedProduct.price}</strong></span>
                  <span>Stock: <strong style={{ color: selectedProduct.stock === 0 ? 'var(--danger)' : 'var(--success)' }}>{selectedProduct.stock} pcs</strong></span>
                </div>
                {onSelectProduct && (
                  <button
                    className="btn btn-primary btn-xs"
                    style={{ width: '100%', marginTop: 10 }}
                    onClick={() => {
                      onSelectProduct(selectedProduct);
                      onClose();
                    }}
                  >
                    Select Product
                  </button>
                )}
              </div>
            ) : (
              <div style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                <Package size={28} style={{ opacity: 0.3, margin: '0 auto 6px' }} />
                Empty storage position
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Code: <strong>{formatLocationCode(activeShelf, selectedCell.row, selectedCell.col)}</strong>
          </div>
          <button className="btn btn-outline" onClick={onClose}>
            Close Map
          </button>
        </div>
      </div>
    </div>
  );
}
