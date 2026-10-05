import { useState, useMemo } from 'react';
import { useStock } from '../context/StockContext';
import { getGridConfig, formatLocationCode, formatLocationDisplay, parseLocation } from '../data';
import { MapPin, Package, Eye, Layers, CheckCircle, Info, Sparkles } from 'lucide-react';
import ProductModal from '../components/ProductModal';
import { getCategoryEmoji } from '../components/Layout';

export default function ShelfMap() {
  const { inventory } = useStock();
  const gridConfig = useMemo(() => getGridConfig(), []);
  const shelvesList = gridConfig.shelves || ['A', 'B', 'C', 'D'];
  const totalRows = gridConfig.rows || 5;
  const totalCols = gridConfig.columns || 5;

  const [activeShelf, setActiveShelf] = useState('B');
  const [selectedCell, setSelectedCell] = useState({ row: 2, col: 3 });
  const [activeProductModal, setActiveProductModal] = useState(null);

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

  // Selected cell key
  const selectedKey = `${activeShelf}-${selectedCell.row}-${selectedCell.col}`;
  const selectedProduct = occupiedMap[selectedKey] || null;

  // Products on currently active shelf
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

  // Shelf occupation stats
  const totalSlotsPerShelf = totalRows * totalCols;
  const occupiedCount = shelfProducts.length;
  const availableCount = Math.max(0, totalSlotsPerShelf - occupiedCount);

  return (
    <div className="shelf-map-page">
      {/* Header */}
      <div className="page-header flex-between mb-4">
        <div>
          <h2>Interactive Shelf Map</h2>
          <p>Visual physical store layout navigator. Select any shelf and click a cell to inspect product storage.</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span className="badge-primary-soft" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
            <Layers size={16} /> Total Shelves: {shelvesList.length}
          </span>
        </div>
      </div>

      {/* Shelf Selector Tabs */}
      <div className="card mb-4" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={18} color="var(--primary)" /> Select Shelf:
          </span>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Viewing Shelf <strong>{activeShelf}</strong> ({occupiedCount} of {totalSlotsPerShelf} locations occupied)
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${shelvesList.length}, 1fr)`, gap: 10 }}>
          {shelvesList.map(s => {
            const isSelected = activeShelf === s;
            const countForShelf = inventory.filter(i => {
              const loc = parseLocation({
                shelf: i.shelf,
                rowNumber: i.row ?? i.rowNumber ?? i.row_number,
                columnNumber: i.column ?? i.columnNumber ?? i.column_number,
                locationCode: i.locationCode || i.location_code || i.shelfLocation
              });
              return loc.shelf === s;
            }).length;

            return (
              <button
                key={s}
                type="button"
                className={`shelf-tab-btn ${isSelected ? 'active' : ''}`}
                onClick={() => {
                  setActiveShelf(s);
                  setSelectedCell({ row: 1, col: 1 });
                }}
                style={{
                  padding: '14px 10px',
                  borderRadius: '10px',
                  border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-card)',
                  color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                  fontWeight: 800,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>SHELF {s}</span>
                  {isSelected && <span>✓</span>}
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isSelected ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {countForShelf} items stored
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid + Inspector Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.4fr) minmax(280px, 1fr)', gap: 18, alignItems: 'start' }}>
        
        {/* Visual Storage Grid */}
        <div className="card" style={{ padding: '20px' }}>
          <div className="flex-between mb-3">
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                SHELF {activeShelf} Storage Grid
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Click any cell to inspect or view stored product details.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, fontSize: '0.78rem' }}>
              <span className="badge-success-soft">{availableCount} Available</span>
              <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', fontWeight: 700, padding: '3px 8px', borderRadius: 4 }}>
                {occupiedCount} Occupied
              </span>
            </div>
          </div>

          {/* Grid Container */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '16px',
            overflowX: 'auto'
          }}>
            {/* Column Headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: `80px repeat(${totalCols}, minmax(50px, 1fr))`,
              gap: 8,
              marginBottom: 8,
              textAlign: 'center',
              fontSize: '0.8rem',
              fontWeight: 800,
              color: 'var(--text-muted)'
            }}>
              <div style={{ textAlign: 'left', paddingLeft: 6 }}>ROWS</div>
              {Array.from({ length: totalCols }, (_, i) => (
                <div key={i}>{String(i + 1).padStart(2, '0')}</div>
              ))}
            </div>

            {/* Grid Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Array.from({ length: totalRows }, (_, rIndex) => {
                const rowNum = rIndex + 1;
                return (
                  <div
                    key={rowNum}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `80px repeat(${totalCols}, minmax(50px, 1fr))`,
                      gap: 8,
                      alignItems: 'center'
                    }}
                  >
                    <div style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                      paddingLeft: 6
                    }}>
                      ROW {String(rowNum).padStart(2, '0')}
                    </div>

                    {Array.from({ length: totalCols }, (_, cIndex) => {
                      const colNum = cIndex + 1;
                      const cellKey = `${activeShelf}-${rowNum}-${colNum}`;
                      const isOccupied = Boolean(occupiedMap[cellKey]);
                      const productInCell = occupiedMap[cellKey];
                      const isSelected = selectedCell.row === rowNum && selectedCell.col === colNum;

                      // Color mapping matching Requirement 11:
                      // 🟩 Available (Green)
                      // 🟥 Occupied / product location (Red)
                      // 🟦 Selected (Blue)
                      let bgStyle = 'rgba(34, 197, 94, 0.12)';
                      let borderStyle = '1px solid rgba(34, 197, 94, 0.35)';
                      let textStyle = '#22c55e';
                      let iconSymbol = '🟩';

                      if (isSelected) {
                        bgStyle = 'rgba(59, 130, 246, 0.25)';
                        borderStyle = '2px solid #3b82f6';
                        textStyle = '#3b82f6';
                        iconSymbol = '🟦';
                      } else if (isOccupied) {
                        bgStyle = 'rgba(239, 68, 68, 0.15)';
                        borderStyle = '1px solid rgba(239, 68, 68, 0.4)';
                        textStyle = '#ef4444';
                        iconSymbol = '🟥';
                      }

                      return (
                        <button
                          key={colNum}
                          type="button"
                          onClick={() => {
                            setSelectedCell({ row: rowNum, col: colNum });
                          }}
                          onDoubleClick={() => {
                            if (productInCell) {
                              setActiveProductModal(productInCell);
                            }
                          }}
                          title={
                            productInCell
                              ? `Occupied: ${productInCell.name} (Shelf ${activeShelf} • Row ${rowNum} • Col ${colNum})`
                              : `Available: Shelf ${activeShelf} • Row ${rowNum} • Col ${colNum}`
                          }
                          style={{
                            height: 48,
                            borderRadius: '8px',
                            background: bgStyle,
                            border: borderStyle,
                            color: textStyle,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            transition: 'all 0.15s ease',
                            position: 'relative'
                          }}
                        >
                          <span style={{ fontSize: '1rem', lineHeight: 1 }}>{iconSymbol}</span>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, marginTop: 2, opacity: 0.85 }}>
                            {String(rowNum).padStart(2, '0')}-{String(colNum).padStart(2, '0')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Legend (Requirement 11) */}
            <div style={{
              display: 'flex',
              gap: 20,
              justifyContent: 'center',
              marginTop: 18,
              paddingTop: 14,
              borderTop: '1px solid var(--border)',
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
              flexWrap: 'wrap'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>🟩</span> <strong>Available</strong>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>🟥</span> <strong>Occupied / Product Location</strong>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>🟦</span> <strong>Selected Location</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Selected Cell Inspector Details Panel */}
        <div className="card" style={{ padding: '20px' }}>
          <div className="flex-between mb-3">
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Info size={18} color="var(--primary)" /> Position Details
            </h3>
            <span style={{
              fontFamily: 'monospace',
              fontWeight: 800,
              fontSize: '0.9rem',
              color: 'var(--primary)',
              background: 'rgba(59, 130, 246, 0.1)',
              padding: '3px 8px',
              borderRadius: 4
            }}>
              {formatLocationCode(activeShelf, selectedCell.row, selectedCell.col)}
            </span>
          </div>

          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '10px',
            padding: '14px',
            border: '1px solid var(--border)',
            marginBottom: 16
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Physical Storage Slot
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
              {formatLocationDisplay(activeShelf, selectedCell.row, selectedCell.col)}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Shelf {activeShelf} • Row {String(selectedCell.row).padStart(2, '0')} • Column {String(selectedCell.col).padStart(2, '0')}
            </div>
          </div>

          {selectedProduct ? (
            <div style={{
              background: 'var(--bg-card)',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 8,
                  background: 'var(--bg-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.4rem', flexShrink: 0
                }}>
                  {getCategoryEmoji(selectedProduct.category)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className="cat-badge">{selectedProduct.category}</span>
                    {selectedProduct.brand && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>• {selectedProduct.brand}</span>}
                  </div>
                  <h4 style={{ margin: '3px 0 0', fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    {selectedProduct.name}
                  </h4>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                background: 'var(--bg-secondary)',
                padding: '12px',
                borderRadius: '8px'
              }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Stock</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: selectedProduct.stock === 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                    {selectedProduct.stock} pcs
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Selling Price</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--success)' }}>
                    ₹{selectedProduct.price}
                  </div>
                </div>
              </div>

              <button
                className="btn btn-primary btn-sm"
                style={{ width: '100%', padding: '10px', marginTop: 4 }}
                onClick={() => setActiveProductModal(selectedProduct)}
              >
                <Eye size={15} /> View Full Product Details
              </button>
            </div>
          ) : (
            <div style={{
              padding: '36px 16px',
              textAlign: 'center',
              background: 'var(--bg-card)',
              borderRadius: '12px',
              border: '1px dashed var(--border)',
              color: 'var(--text-muted)'
            }}>
              <Package size={36} style={{ opacity: 0.3, margin: '0 auto 10px' }} />
              <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.98rem' }}>
                Position Is Empty
              </h4>
              <p style={{ fontSize: '0.82rem', maxWidth: 220, margin: '6px auto 0' }}>
                No product is currently assigned to this storage position.
              </p>
            </div>
          )}

          {/* Other products on this shelf */}
          <div style={{ marginTop: 20 }}>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 10 }}>
              All Products on Shelf {activeShelf} ({shelfProducts.length})
            </h4>
            <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {shelfProducts.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: 8 }}>
                  No products on Shelf {activeShelf}.
                </div>
              ) : (
                shelfProducts.map(item => {
                  const loc = parseLocation({
                    shelf: item.shelf,
                    rowNumber: item.row ?? item.rowNumber ?? item.row_number,
                    columnNumber: item.column ?? item.columnNumber ?? item.column_number,
                    locationCode: item.locationCode || item.location_code || item.shelfLocation
                  });
                  const isCurrentSelected = selectedCell.row === loc.row && selectedCell.col === loc.column;

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedCell({ row: loc.row, col: loc.column });
                      }}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 6,
                        background: isCurrentSelected ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-secondary)',
                        border: isCurrentSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.82rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{getCategoryEmoji(item.category)}</span>
                        <div>
                          <strong style={{ color: 'var(--text-primary)' }}>{item.name}</strong>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Row {String(loc.row).padStart(2, '0')} • Col {String(loc.column).padStart(2, '0')}
                          </div>
                        </div>
                      </div>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>
                        {loc.locationCode}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Product Detail Modal */}
      {activeProductModal && (
        <ProductModal
          product={activeProductModal}
          onClose={() => setActiveProductModal(null)}
        />
      )}
    </div>
  );
}
