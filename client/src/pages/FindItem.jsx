import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useStock } from '../context/StockContext';
import { api } from '../services/api';
import { calculateStatus, parseLocation, formatLocationCode, formatLocationDisplay } from '../data';
import ProductModal from '../components/ProductModal';
import { getCategoryEmoji } from '../components/Layout';
import {
  Search, Mic, MicOff, MapPin, Eye, PackageX, Sparkles,
  RotateCcw, History, Trash2, CheckCircle2, ArrowRight
} from 'lucide-react';

export default function FindItem() {
  const { inventory } = useStock();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState('All');

  // Spotlight product
  const [spotlightProduct, setSpotlightProduct] = useState(null);
  const [selectedProductModal, setSelectedProductModal] = useState(null);

  // Voice Search State
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [voiceNotice, setVoiceNotice] = useState('');
  const recognitionRef = useRef(null);

  // Search History
  const [searchHistory, setSearchHistory] = useState([]);

  // Read URL query params
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setSearchQuery(q);
      handleExecuteSearch(q, false);
    }
  }, [searchParams]);

  // Set initial spotlight if empty
  useEffect(() => {
    if (!spotlightProduct && inventory.length > 0 && !searchQuery) {
      setSpotlightProduct(inventory[0]);
    }
  }, [inventory, spotlightProduct, searchQuery]);

  // Fetch search history
  const loadSearchHistory = async () => {
    try {
      const res = await api.getSearchHistory();
      if (res && res.history) {
        setSearchHistory(res.history);
      }
    } catch (err) {
      console.error('Failed to fetch search history:', err);
    }
  };

  useEffect(() => {
    loadSearchHistory();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(inventory.map(item => item.category));
    return ['All', ...Array.from(cats)];
  }, [inventory]);

  // Multi-attribute search matching
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) {
      return inventory;
    }

    const rawQ = searchQuery.toLowerCase().trim();

    // Voice shortcut handling: "show low stock items"
    if (rawQ.includes('low stock')) {
      return inventory.filter(i => i.stock > 0 && i.stock <= i.reorderLevel);
    }
    // Voice shortcut handling: "out of stock"
    if (rawQ.includes('out of stock')) {
      return inventory.filter(i => i.stock === 0);
    }

    const terms = rawQ.split(/\s+/).filter(Boolean);

    return inventory.filter(item => {
      const name = item.name.toLowerCase();
      const brand = (item.brand || '').toLowerCase();
      const category = (item.category || '').toLowerCase();
      const sku = (item.sku || '').toLowerCase();
      const shelf = (item.shelfLocation || item.shelf || '').toLowerCase();

      const combinedText = `${name} ${brand} ${category} ${sku} ${shelf}`;
      return terms.every(t => combinedText.includes(t));
    });
  }, [inventory, searchQuery]);

  // Apply filters
  const filteredProducts = useMemo(() => {
    return searchMatches.filter(item => {
      let matchCat = categoryFilter === 'All' || item.category === categoryFilter;
      let matchStock = true;
      if (stockFilter !== 'All') {
        const s = calculateStatus(item.stock, item.reorderLevel);
        matchStock = s === stockFilter;
      }
      return matchCat && matchStock;
    });
  }, [searchMatches, categoryFilter, stockFilter]);

  const handleExecuteSearch = (queryToRun, updateUrl = true) => {
    const q = (queryToRun !== undefined ? queryToRun : searchQuery).trim();
    if (updateUrl) {
      setSearchParams(q ? { q } : {});
    }

    if (!q) return;

    const rawQ = q.toLowerCase();
    const terms = rawQ.split(/\s+/).filter(Boolean);

    const match = inventory.find(item => {
      const combined = `${item.name} ${item.brand} ${item.category} ${item.sku} ${item.shelfLocation || item.shelf}`.toLowerCase();
      return terms.every(t => combined.includes(t));
    }) || inventory.find(item => item.name.toLowerCase().includes(rawQ));

    if (match) {
      setSpotlightProduct(match);
    }

    // Call search API to log search history
    api.searchProducts(q).then(() => loadSearchHistory()).catch(() => {});
  };

  // Voice Search via Web Speech API
  const handleToggleVoice = () => {
    setVoiceError('');
    setVoiceNotice('');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError('Voice search is not supported in this browser. Please use Chrome or type your search.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setVoiceNotice('');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceNotice('Listening... Speak product name, brand, or shelf location...');
        setVoiceError('');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          let cleanQuery = transcript.trim();
          // Support spoken phrases like "find blue gel pen" or "find products on shelf B1-01"
          cleanQuery = cleanQuery.replace(/^(find|search for|show me|locate)\s+/i, '');
          setSearchQuery(cleanQuery);
          setVoiceNotice(`Searched: "${cleanQuery}"`);
          handleExecuteSearch(cleanQuery, true);
        }
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        setVoiceNotice('');
        if (event.error === 'not-allowed') {
          setVoiceError('Microphone access was denied. Please allow microphone permissions or type your search.');
        } else if (event.error !== 'no-speech') {
          setVoiceError(`Voice error (${event.error}). Please type your search.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setIsListening(false);
      setVoiceNotice('');
      setVoiceError('Voice search is not supported in this browser. Please use Chrome or type your search.');
    }
  };

  const handleClearHistory = async () => {
    try {
      await api.clearSearchHistory();
      setSearchHistory([]);
    } catch (err) {
      console.error('Clear history error:', err);
    }
  };

  return (
    <div className="find-item-page">
      {/* Header */}
      <div className="page-header flex-between">
        <div>
          <h2>Find Item</h2>
          <p>Search any store product instantly by name, brand, category, SKU, barcode, or storage shelf location.</p>
        </div>
      </div>

      {/* Voice Status Banners */}
      {voiceNotice && (
        <div className="alert-banner info mb-3 flex-between">
          <span>🎤 {voiceNotice}</span>
          <button className="btn-close" onClick={() => setVoiceNotice('')}>✕</button>
        </div>
      )}

      {voiceError && (
        <div className="alert-banner warning mb-4 flex-between">
          <span>⚠️ {voiceError}</span>
          <button className="btn-close" onClick={() => setVoiceError('')}>✕</button>
        </div>
      )}

      {/* Search Bar Card */}
      <div className="search-control-card card mb-4">
        <div className="search-input-wrapper-lg">
          <Search size={22} className="text-muted" style={{ marginLeft: 8 }} />
          <input
            type="text"
            className="search-input-main"
            placeholder={isListening ? 'Listening... speak product name or shelf...' : 'Search product name (e.g. "Rice", "Notebook"), brand, category, shelf (e.g. "A-02-04")...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleExecuteSearch(searchQuery);
              }
            }}
          />

          {/* Voice Search Button */}
          <button
            type="button"
            className={`mic-btn ${isListening ? 'mic-listening' : ''}`}
            onClick={handleToggleVoice}
            title={isListening ? 'Listening... Click to stop' : 'Click to Speak (Voice Search)'}
            aria-label="Voice Search"
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Search Button */}
          <button
            type="button"
            className="btn btn-primary search-submit-btn"
            onClick={() => handleExecuteSearch(searchQuery)}
          >
            Search
          </button>
        </div>

        {/* Filter Controls */}
        <div className="filter-row mt-3 pt-3" style={{ borderTop: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="custom-dropdown" style={{ minWidth: 160 }}>
            <label>Category Filter</label>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="custom-dropdown" style={{ minWidth: 160 }}>
            <label>Stock Status</label>
            <select
              value={stockFilter}
              onChange={e => setStockFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="In Stock">In Stock (Available)</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>

          {(categoryFilter !== 'All' || stockFilter !== 'All' || searchQuery) && (
            <button
              className="btn btn-outline btn-sm self-end"
              style={{ height: 38 }}
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('All');
                setStockFilter('All');
                setSearchParams({});
              }}
            >
              <RotateCcw size={14} /> Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Spotlight Search Result Card */}
      {spotlightProduct && inventory.length > 0 && (() => {
        const loc = parseLocation({
          shelf: spotlightProduct.shelf,
          rowNumber: spotlightProduct.row ?? spotlightProduct.rowNumber ?? spotlightProduct.row_number,
          columnNumber: spotlightProduct.column ?? spotlightProduct.columnNumber ?? spotlightProduct.column_number,
          locationCode: spotlightProduct.locationCode || spotlightProduct.location_code || spotlightProduct.shelfLocation
        });

        return (
          <div className="product-spotlight-card mb-5">
            <div className="spotlight-header">
              <div className="spotlight-badge-label">
                <Sparkles size={14} /> Item Search Result
              </div>
              <span className="spotlight-sku" style={{ fontFamily: 'monospace' }}>
                {spotlightProduct.sku}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span className="cat-badge">{spotlightProduct.category}</span>
                  {spotlightProduct.brand && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>• {spotlightProduct.brand}</span>}
                </div>
                <h2 style={{ margin: '4px 0 8px', fontSize: '1.5rem', color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                  {spotlightProduct.name}
                </h2>
                <span className={`status-badge static-badge ${spotlightProduct.stock === 0 ? 'status-out-stock' : spotlightProduct.stock <= spotlightProduct.reorderLevel ? 'status-low-stock' : 'status-in-stock'}`}>
                  {spotlightProduct.stock === 0 ? '❌ OUT OF STOCK' : spotlightProduct.stock <= spotlightProduct.reorderLevel ? '⚠️ LOW STOCK' : '✓ AVAILABLE'}
                </span>
              </div>

              {/* Quick Specs */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                background: 'var(--bg-secondary)',
                padding: 14,
                borderRadius: 10,
                border: '1px solid var(--border)'
              }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Stock</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: spotlightProduct.stock === 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                    {spotlightProduct.stock} {spotlightProduct.unit || 'units'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Selling Price</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>
                    ₹{spotlightProduct.price}
                  </div>
                </div>

                {/* Highly Visible Exact Physical Storage Location */}
                <div style={{
                  gridColumn: 'span 2',
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: 8,
                  padding: '10px 12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--primary)', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={15} /> Physical Storage Location
                    </span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.85rem', color: 'var(--primary)', background: 'rgba(59,130,246,0.15)', padding: '2px 6px', borderRadius: 4 }}>
                      {loc.locationCode}
                    </span>
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    📍 SHELF {loc.shelf}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: 2 }}>
                    ROW {String(loc.row).padStart(2, '0')} • COLUMN {String(loc.column).padStart(2, '0')}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
                <button
                  className="btn btn-primary"
                  style={{ padding: '10px 18px' }}
                  onClick={() => setSelectedProductModal(spotlightProduct)}
                >
                  <Eye size={16} /> View & Update Stock
                </button>
                <button
                  className="btn btn-outline"
                  style={{ padding: '8px 18px', fontSize: '0.85rem' }}
                  onClick={() => navigate('/shelf-map')}
                >
                  <MapPin size={14} /> Open Shelf Map
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Results List */}
      <div className="results-header-row mb-3 flex-between">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
          <span>Matching Items</span>
          <span className="results-count-pill">{filteredProducts.length}</span>
        </div>
        {searchQuery && (
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Results for "{searchQuery}"
          </span>
        )}
      </div>

      {filteredProducts.length > 0 ? (
        <div className="product-grid mb-5">
          {filteredProducts.map(product => {
            const s = calculateStatus(product.stock, product.reorderLevel);
            const isOut = product.stock === 0;
            const isLow = product.stock > 0 && product.stock <= product.reorderLevel;
            const loc = parseLocation({
              shelf: product.shelf,
              rowNumber: product.row ?? product.rowNumber ?? product.row_number,
              columnNumber: product.column ?? product.columnNumber ?? product.column_number,
              locationCode: product.locationCode || product.location_code || product.shelfLocation
            });

            return (
              <div
                key={product.id}
                className="card product-card"
                onClick={() => {
                  setSpotlightProduct(product);
                  setSelectedProductModal(product);
                }}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <span className="cat-badge">{product.category}</span>
                  <span className={`status-badge static-badge ${isOut ? 'status-out-stock' : isLow ? 'status-low-stock' : 'status-in-stock'}`} style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                    {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'Available'}
                  </span>
                </div>

                <h4 style={{ margin: '0 0 4px', fontSize: '1rem', color: 'var(--text-primary)' }}>{product.name}</h4>
                {product.brand && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 10 }}>{product.brand}</div>}

                {/* Location Badge */}
                <div style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '6px 8px',
                  marginBottom: 10,
                  fontSize: '0.78rem'
                }}>
                  <div style={{ fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MapPin size={12} /> Shelf {loc.shelf} • Row {String(loc.row).padStart(2, '0')} • Col {String(loc.column).padStart(2, '0')}
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Code: {loc.locationCode}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stock: </span>
                    <strong style={{ color: isOut ? 'var(--danger)' : 'var(--text-primary)' }}>{product.stock} pcs</strong>
                  </div>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--success)' }}>₹{product.price}</strong>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        inventory.length === 0 ? (
          <div className="empty-results-card card mb-5" style={{ padding: '56px 24px', textAlign: 'center' }}>
            <PackageX size={56} style={{ color: 'var(--text-muted)', opacity: 0.35, margin: '0 auto 14px' }} />
            <h3 style={{ fontSize: '1.3rem', marginBottom: 6, color: 'var(--text-primary)' }}>
              No products available. Add a product to start searching.
            </h3>
            <p style={{ color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto 20px', lineHeight: 1.5 }}>
              Your store catalog is currently empty. Add products in Inventory to enable instant search and shelf lookup.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/inventory')}
              style={{ margin: '0 auto' }}
            >
              Go to Inventory & Add Product
            </button>
          </div>
        ) : (
          <div className="empty-results-card card mb-5" style={{ padding: '48px 24px', textAlign: 'center' }}>
            <PackageX size={56} style={{ color: 'var(--text-muted)', opacity: 0.35, margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: 6, color: 'var(--text-primary)' }}>
              No stationery item found
            </h3>
            <p style={{ color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto 16px' }}>
              We couldn't find any products matching "{searchQuery}".
            </p>
            <button
              className="btn btn-outline"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('All');
                setStockFilter('All');
                setSearchParams({});
              }}
            >
              Clear Search
            </button>
          </div>
        )
      )}

      {/* Search History */}
      <div className="card search-history-card">
        <div className="flex-between mb-3">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={18} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Recent Searches</h3>
          </div>

          {searchHistory.length > 0 && (
            <button
              className="btn btn-outline btn-xs text-danger"
              onClick={handleClearHistory}
            >
              <Trash2 size={12} /> Clear History
            </button>
          )}
        </div>

        {searchHistory.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No recent searches recorded.
          </div>
        ) : (
          <div className="table-responsive-wrapper" style={{ border: 'none', padding: 0 }}>
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>SEARCH QUERY</th>
                  <th>RESULT STATUS</th>
                  <th>SHELF</th>
                  <th>TIME</th>
                </tr>
              </thead>
              <tbody>
                {searchHistory.slice(0, 8).map(entry => (
                  <tr key={entry.id} style={{ cursor: 'pointer' }} onClick={() => { setSearchQuery(entry.query); handleExecuteSearch(entry.query); }}>
                    <td><strong>{entry.productName || entry.query}</strong></td>
                    <td>
                      <span className={`status-badge static-badge ${entry.status === 'Available' || entry.status === 'In Stock' ? 'status-in-stock' : entry.status === 'Low Stock' ? 'status-low-stock' : 'status-out-stock'}`} style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                        {entry.status}
                      </span>
                    </td>
                    <td><span className="shelf-pill">{entry.shelf}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{entry.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedProductModal && (
        <ProductModal
          product={selectedProductModal}
          onClose={() => setSelectedProductModal(null)}
          onSelectProduct={(p) => {
            setSelectedProductModal(p);
            setSpotlightProduct(p);
          }}
        />
      )}
    </div>
  );
}
