import { useState, useEffect, useCallback } from 'react';
import {
  Activity, Filter, Trash2, RefreshCw, Package, TrendingUp, TrendingDown,
  Plus, Edit2, XCircle, Search, Clock, ChevronDown, AlertTriangle, Download
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ACTIVITY_TYPES = [
  { value: 'ALL', label: 'All Activity' },
  { value: 'PRODUCT_ADDED', label: 'Product Added' },
  { value: 'PRODUCT_UPDATED', label: 'Product Updated' },
  { value: 'PRODUCT_DELETED', label: 'Product Deleted' },
  { value: 'STOCK_IN', label: 'Stock In' },
  { value: 'STOCK_OUT', label: 'Stock Out' },
  { value: 'STOCK_UPDATED', label: 'Stock Updated' },
  { value: 'BATCH_ADDED', label: 'Batch Added' },
  { value: 'SEARCH', label: 'Search' },
  { value: 'LOGIN', label: 'Login' },
];

function activityIcon(type) {
  switch (type) {
    case 'PRODUCT_ADDED': return <Plus size={15} />;
    case 'PRODUCT_UPDATED': return <Edit2 size={15} />;
    case 'PRODUCT_DELETED': return <XCircle size={15} />;
    case 'STOCK_IN': return <TrendingUp size={15} />;
    case 'STOCK_OUT': return <TrendingDown size={15} />;
    case 'STOCK_UPDATED': return <Package size={15} />;
    case 'BATCH_ADDED': return <Package size={15} />;
    case 'SEARCH': return <Search size={15} />;
    default: return <Activity size={15} />;
  }
}

function activityColor(type) {
  if (type === 'PRODUCT_ADDED' || type === 'STOCK_IN' || type === 'BATCH_ADDED') return 'var(--success)';
  if (type === 'PRODUCT_DELETED' || type === 'STOCK_OUT') return 'var(--danger)';
  if (type === 'PRODUCT_UPDATED' || type === 'STOCK_UPDATED') return 'var(--primary)';
  if (type === 'SEARCH') return 'var(--accent-secondary)';
  return 'var(--text-muted)';
}

function formatRelativeTime(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ActivityLog() {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [offset, setOffset] = useState(0);
  const [clearing, setClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const LIMIT = 30;

  const loadActivity = useCallback(async (reset = false) => {
    setLoading(true);
    setError(null);
    const currentOffset = reset ? 0 : offset;
    try {
      const data = await api.getActivityLogs({ type: filter, limit: LIMIT, offset: currentOffset });
      if (reset) {
        setActivities(data.activities || []);
        setOffset(0);
      } else {
        setActivities(prev => reset ? data.activities : [...prev, ...(data.activities || [])]);
      }
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load activity log');
    } finally {
      setLoading(false);
    }
  }, [filter, offset]);

  useEffect(() => {
    loadActivity(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleLoadMore = async () => {
    const newOffset = offset + LIMIT;
    setOffset(newOffset);
    setLoading(true);
    try {
      const data = await api.getActivityLogs({ type: filter, limit: LIMIT, offset: newOffset });
      setActivities(prev => [...prev, ...(data.activities || [])]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      await api.clearActivityLogs();
      setActivities([]);
      setTotal(0);
      setShowClearConfirm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setClearing(false);
    }
  };

  const groupedByDate = activities.reduce((acc, a) => {
    const dateKey = new Date(a.createdAt).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(a);
    return acc;
  }, {});

  return (
    <div className="dashboard-content">
      {/* Header */}
      <div className="page-header flex-between mb-4">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Activity size={22} color="var(--primary)" /> Activity Log
          </h2>
          <p>Complete audit trail of all inventory actions, stock changes, and system events.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-outline"
            onClick={() => loadActivity(true)}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          {user?.role === 'admin' && (
            <button
              className="btn btn-danger"
              onClick={() => setShowClearConfirm(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Trash2 size={15} /> Clear Log
            </button>
          )}
        </div>
      </div>

      {/* Summary bar */}
      <div className="card mb-4" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={16} color="var(--primary)" />
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{total.toLocaleString()}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>total events recorded</span>
        </div>
        <div style={{ height: 20, width: 1, background: 'var(--border)', margin: '0 4px' }} />
        <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          Showing {activities.length} of {total} · All times in Indian Standard Time (IST)
        </div>
      </div>

      {/* Filter bar */}
      <div className="card mb-4" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Filter size={15} color="var(--text-muted)" />
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filter:</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ACTIVITY_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setFilter(t.value)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 99,
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  border: filter === t.value ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                  background: filter === t.value ? 'rgba(99,102,241,0.15)' : 'transparent',
                  color: filter === t.value ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card mb-4" style={{ padding: 16, background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', display: 'flex', gap: 10, alignItems: 'center' }}>
          <AlertTriangle size={16} color="var(--danger)" />
          <span style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{error}</span>
        </div>
      )}

      {/* Activity Timeline */}
      {loading && activities.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={28} className="spin" style={{ marginBottom: 12, opacity: 0.5 }} />
          <p>Loading activity history...</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="card" style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
          <Activity size={40} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
          <p style={{ fontWeight: 600, marginBottom: 4 }}>No activity found</p>
          <p style={{ fontSize: '0.82rem' }}>
            {filter === 'ALL' ? 'No events have been recorded yet. Start managing your inventory.' : `No "${ACTIVITY_TYPES.find(t => t.value === filter)?.label}" events found.`}
          </p>
        </div>
      ) : (
        <>
          {Object.entries(groupedByDate).map(([date, items]) => (
            <div key={date} className="mb-4">
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10
              }}>
                <div style={{
                  background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  borderRadius: 99, padding: '3px 14px',
                  fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)',
                  letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap'
                }}>
                  {date}
                </div>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{items.length} events</span>
              </div>

              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {items.map((a, idx) => (
                  <div
                    key={a.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 14,
                      padding: '14px 18px',
                      borderBottom: idx < items.length - 1 ? '1px solid var(--border)' : 'none',
                      transition: 'background 0.15s ease',
                    }}
                    className="activity-row"
                  >
                    {/* Icon */}
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `${activityColor(a.activityType)}18`,
                      border: `1.5px solid ${activityColor(a.activityType)}40`,
                      color: activityColor(a.activityType),
                      flexShrink: 0,
                      marginTop: 2
                    }}>
                      {activityIcon(a.activityType)}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 700,
                          background: `${activityColor(a.activityType)}20`,
                          color: activityColor(a.activityType),
                          borderRadius: 4, padding: '1px 7px',
                          textTransform: 'uppercase', letterSpacing: '0.04em'
                        }}>
                          {a.activityType?.replace(/_/g, ' ')}
                        </span>
                        {a.sku && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            {a.sku}
                          </span>
                        )}
                      </div>

                      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {a.description}
                      </p>

                      {a.productName && a.activityType !== 'SEARCH' && (
                        <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Product: <strong style={{ color: 'var(--text-secondary)' }}>{a.productName}</strong>
                        </p>
                      )}

                      {a.details && typeof a.details === 'object' && Object.keys(a.details).length > 0 && (
                        <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {Object.entries(a.details).slice(0, 4).map(([k, v]) => (
                            <span key={k} style={{
                              fontSize: '0.72rem',
                              background: 'var(--bg-tertiary)',
                              border: '1px solid var(--border)',
                              borderRadius: 4,
                              padding: '2px 8px',
                              color: 'var(--text-muted)'
                            }}>
                              {k}: <strong style={{ color: 'var(--text-secondary)' }}>{String(v)}</strong>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Time & User */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {a.time}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {formatRelativeTime(a.createdAt)}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 3 }}>
                        by {a.userName}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Load More */}
          {activities.length < total && (
            <div style={{ textAlign: 'center', marginTop: 12, marginBottom: 20 }}>
              <button
                className="btn btn-outline"
                onClick={handleLoadMore}
                disabled={loading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {loading ? <RefreshCw size={14} className="spin" /> : <ChevronDown size={14} />}
                Load More ({total - activities.length} remaining)
              </button>
            </div>
          )}
        </>
      )}

      {/* Clear Confirm Dialog */}
      {showClearConfirm && (
        <div className="confirm-dialog-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()} role="dialog" aria-labelledby="clear-log-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(239,68,68,0.15)', display: 'flex',
                alignItems: 'center', justifyContent: 'center'
              }}>
                <Trash2 size={18} color="var(--danger)" />
              </div>
              <h3 id="clear-log-title" style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                Clear All Activity Logs?
              </h3>
            </div>
            <p style={{ margin: '0 0 20px', fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              This will permanently delete <strong style={{ color: 'var(--text-primary)' }}>{total.toLocaleString()} event records</strong> from the audit trail. This action cannot be undone.
            </p>
            <div className="confirm-dialog-actions">
              <button className="btn btn-outline" onClick={() => setShowClearConfirm(false)} disabled={clearing}>Cancel</button>
              <button className="btn btn-danger" onClick={handleClearAll} disabled={clearing}>
                {clearing ? 'Clearing...' : 'Clear All Logs'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .activity-row:hover { background: var(--bg-secondary); }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
