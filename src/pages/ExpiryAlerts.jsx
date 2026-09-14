import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStock } from '../context/StockContext';
import { calculateExpiryStatus, getDaysRemaining, getExpiryText } from '../utils';
import { getCategoryEmoji } from '../components/Layout';
import { Timer, AlertTriangle, XCircle, CheckCircle, Search, Filter, Package } from 'lucide-react';

export default function ExpiryAlerts() {
  const { inventory } = useStock();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState('expiry');

  // Collect all batches with expiry tracking
  const allBatches = useMemo(() => {
    const batches = [];
    inventory.forEach(item => {
      if (!item.expiryTracking || !item.batches) return;
      item.batches.forEach(b => {
        if (!b.expiryDate) return;
        const status = calculateExpiryStatus(b.expiryDate, true);
        const days = getDaysRemaining(b.expiryDate);
        batches.push({
          ...b,
          productId: item.id,
          productName: item.name,
          productCategory: item.category,
          productImage: item.image,
          productBrand: item.brand,
          shelf: b.shelf || item.shelf,
          row: b.row || item.row,
          column: b.column || item.column,
          status,
          daysRemaining: days
        });
      });
    });
    return batches;
  }, [inventory]);

  // Summary counts
  const summary = useMemo(() => {
    const counts = { expired: 0, critical: 0, expiringSoon: 0, safe: 0, total: allBatches.length };
    allBatches.forEach(b => {
      if (b.status === 'EXPIRED') counts.expired++;
      else if (b.status === 'CRITICAL') counts.critical++;
      else if (b.status === 'EXPIRING SOON') counts.expiringSoon++;
      else counts.safe++;
    });
    return counts;
  }, [allBatches]);

  const categories = useMemo(() => {
    const cats = new Set(allBatches.map(b => b.productCategory));
    return ['All', ...Array.from(cats)];
  }, [allBatches]);

  const filtered = useMemo(() => {
    let data = allBatches.filter(b => {
      const q = searchQuery.toLowerCase().trim();
      let matchSearch = true;
      if (q) {
        matchSearch = b.productName.toLowerCase().includes(q) ||
          b.batchId?.toLowerCase().includes(q) ||
          b.supplier?.toLowerCase().includes(q) ||
          b.productCategory.toLowerCase().includes(q) ||
          (b.shelf || '').toLowerCase().includes(q);
      }

      let matchFilter = true;
      if (filter === 'Expired') matchFilter = b.status === 'EXPIRED';
      else if (filter === 'Critical') matchFilter = b.status === 'CRITICAL';
      else if (filter === 'Expiring Soon') matchFilter = b.status === 'EXPIRING SOON';
      else if (filter === 'Safe') matchFilter = b.status === 'SAFE';

      let matchCat = categoryFilter === 'All' ? true : b.productCategory === categoryFilter;

      return matchSearch && matchFilter && matchCat;
    });

    if (sortBy === 'expiry') {
      data.sort((a, b) => a.daysRemaining - b.daysRemaining);
    } else if (sortBy === 'product') {
      data.sort((a, b) => a.productName.localeCompare(b.productName));
    }

    return data;
  }, [allBatches, searchQuery, filter, categoryFilter, sortBy]);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'EXPIRED': return { class: 'expired', color: 'var(--danger)', label: 'Expired', icon: XCircle };
      case 'CRITICAL': return { class: 'critical', color: 'var(--danger)', label: 'Critical', icon: AlertTriangle };
      case 'EXPIRING SOON': return { class: 'warning', color: 'var(--warning)', label: 'Expiring Soon', icon: Timer };
      default: return { class: 'safe', color: 'var(--success)', label: 'Safe', icon: CheckCircle };
    }
  };

  const formatDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h2>Expiry Alerts</h2>
          <p>Monitor batch expiry dates and take action before stock expires.</p>
        </div>
        <button className="btn btn-outline" onClick={() => navigate('/inventory')}>
          <Package size={16} /> View Inventory
        </button>
      </div>

      {/* Summary Cards */}
      <div className="dash-grid-4 mb-6">
        <div className="card kpi-card" style={{ cursor: 'pointer' }} onClick={() => setFilter('Expired')}>
          <div className="kpi-icon red"><XCircle size={22} /></div>
          <div className="kpi-content">
            <p className="kpi-label">Expired</p>
            <h3 className="kpi-value">{summary.expired}</h3>
            <p className="kpi-subtext">Action required</p>
          </div>
        </div>
        <div className="card kpi-card" style={{ cursor: 'pointer' }} onClick={() => setFilter('Critical')}>
          <div className="kpi-icon red"><AlertTriangle size={22} /></div>
          <div className="kpi-content">
            <p className="kpi-label">Critical (≤7 days)</p>
            <h3 className="kpi-value">{summary.critical}</h3>
            <p className="kpi-subtext">Sell or dispose</p>
          </div>
        </div>
        <div className="card kpi-card" style={{ cursor: 'pointer' }} onClick={() => setFilter('Expiring Soon')}>
          <div className="kpi-icon orange"><Timer size={22} /></div>
          <div className="kpi-content">
            <p className="kpi-label">Expiring (≤30 days)</p>
            <h3 className="kpi-value">{summary.expiringSoon}</h3>
            <p className="kpi-subtext">Keep watch</p>
          </div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-icon green"><CheckCircle size={22} /></div>
          <div className="kpi-content">
            <p className="kpi-label">Total Batches Tracked</p>
            <h3 className="kpi-value">{summary.total}</h3>
            <p className="kpi-subtext">{summary.safe} safe</p>
          </div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="card mb-4">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="search-input-wrapper" style={{ flex: '2', minWidth: 220 }}>
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              className="search-input"
              placeholder="Search product, batch, supplier, shelf…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="custom-dropdown">
            <label>Category</label>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="custom-dropdown">
            <label>Sort</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="expiry">Earliest Expiry</option>
              <option value="product">Product Name</option>
            </select>
          </div>
        </div>

        {/* Status pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
          {['All', 'Expired', 'Critical', 'Expiring Soon', 'Safe'].map(f => (
            <button key={f} className={`pill-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'All' ? 'All Batches' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="flex-between mb-4" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <span><Filter size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Showing {filtered.length} batch{filtered.length !== 1 ? 'es' : ''}
        </span>
        {(summary.expired > 0 || summary.critical > 0) && (
          <span style={{ color: 'var(--danger)', fontSize: '0.82rem', fontWeight: 600 }}>
            ⚠ {summary.expired + summary.critical} batch{summary.expired + summary.critical !== 1 ? 'es' : ''} need immediate attention
          </span>
        )}
      </div>

      {/* Batch List */}
      {filtered.length === 0 ? (
        <div style={{ padding: '64px 20px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
          <CheckCircle size={48} style={{ marginBottom: 16, color: 'var(--success)', opacity: 0.5 }} />
          <h3 style={{ marginBottom: 8 }}>No batches found</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto' }}>
            {filter === 'All' ? 'No batches match your current search.' : `No ${filter.toLowerCase()} batches found.`}
          </p>
          {(searchQuery || filter !== 'All' || categoryFilter !== 'All') && (
            <button className="btn btn-outline mt-4" onClick={() => { setSearchQuery(''); setFilter('All'); setCategoryFilter('All'); }}>
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((batch, idx) => {
            const s = getStatusStyle(batch.status);
            const StatusIcon = s.icon;
            return (
              <div key={`${batch.productId}-${batch.batchId}-${idx}`} className={`expiry-batch-card ${s.class}`}>
                {/* Product Image */}
                <div style={{
                  width: 56, height: 56, borderRadius: 8, overflow: 'hidden',
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.8rem', flexShrink: 0
                }}>
                  {batch.productImage ? (
                    <img src={batch.productImage} alt={batch.productName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                    />
                  ) : null}
                  <span style={{ display: batch.productImage ? 'none' : 'block' }}>
                    {getCategoryEmoji(batch.productCategory)}
                  </span>
                </div>

                {/* Main info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                        {batch.productName}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {batch.productCategory} · {batch.productBrand}
                      </div>
                    </div>
                    <span className={`expiry-badge ${s.class}`}>
                      <StatusIcon size={12} />
                      {s.label}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 20, marginTop: 10, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Batch</div>
                      <div style={{ fontSize: '0.83rem', fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 600 }}>{batch.batchId}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Expiry Date</div>
                      <div style={{ fontSize: '0.83rem', color: s.color, fontWeight: 700 }}>{formatDate(batch.expiryDate)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Time</div>
                      <div style={{ fontSize: '0.83rem', fontWeight: 700, color: s.color }}>{getExpiryText(batch.daysRemaining)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Quantity</div>
                      <div style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-primary)' }}>{batch.currentQuantity} units</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Location</div>
                      <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                        Shelf {batch.shelf} · Row {batch.row} · Col {batch.column}
                      </div>
                    </div>
                    {batch.supplier && (
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Supplier</div>
                        <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>{batch.supplier}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action button */}
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => navigate('/inventory')}
                  style={{ flexShrink: 0, alignSelf: 'center' }}
                >
                  View
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
