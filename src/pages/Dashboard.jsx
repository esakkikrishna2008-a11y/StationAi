import { Search, Package, AlertTriangle, XCircle, Clock, Eye, Activity, MapPin, PackageSearch, PackageCheck, Timer, Ban, DollarSign } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { useStock } from '../context/StockContext';
import { useAuth } from '../context/AuthContext';
import { calculateStatus, shelves } from '../data';
import { calculateExpiryStatus, getDaysRemaining, getExpiryText } from '../utils';
import { getCategoryEmoji } from '../components/Layout';

function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
}

export default function Dashboard() {
    const navigate = useNavigate();
    const { inventory, activities } = useStock();
    const { user } = useAuth();
    const [recentSearches, setRecentSearches] = useState([]);
    const [fastSearchQuery, setFastSearchQuery] = useState('');

    useEffect(() => {
        const saved = localStorage.getItem('stationAI_recent');
        if (saved) {
            setRecentSearches(JSON.parse(saved).slice(0, 5));
        }
    }, []);

    // Compute Metrics dynamically
    const metrics = useMemo(() => {
        const m = { total: inventory.length, available: 0, lowStock: 0, outOfStock: 0, expiringSoon: 0, expired: 0, totalValue: 0 };
        inventory.forEach(item => {
            const status = calculateStatus(item.stock, item.reorderLevel);
            if (status === 'In Stock') m.available++;
            else if (status === 'Low Stock') m.lowStock++;
            else if (status === 'Out of Stock') m.outOfStock++;
            m.totalValue += item.stock * item.price;

            if (item.expiryTracking && item.batches) {
                item.batches.forEach(b => {
                    const es = calculateExpiryStatus(b.expiryDate, true);
                    if (es === 'EXPIRED') m.expired++;
                    else if (es === 'EXPIRING SOON' || es === 'CRITICAL') m.expiringSoon++;
                });
            }
        });
        return m;
    }, [inventory]);

    const healthyPercentage = metrics.total > 0 ? Math.round((metrics.available / metrics.total) * 100) : 0;

    // Extract Stock Alerts
    const stockAlerts = inventory.filter(i => calculateStatus(i.stock, i.reorderLevel) !== 'In Stock')
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 5);

    // Expiry Alerts – batches expiring soon or expired
    const expiryAlerts = useMemo(() => {
        const alerts = [];
        inventory.forEach(item => {
            if (!item.expiryTracking || !item.batches) return;
            item.batches.forEach(b => {
                const es = calculateExpiryStatus(b.expiryDate, true);
                if (es === 'EXPIRED' || es === 'CRITICAL' || es === 'EXPIRING SOON') {
                    const days = getDaysRemaining(b.expiryDate);
                    alerts.push({ ...b, productName: item.name, productId: item.id, status: es, daysRemaining: days });
                }
            });
        });
        return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, 6);
    }, [inventory]);

    // Shelf Distribution
    const shelfOverview = shelves.map(s => {
        const relevant = inventory.filter(i => i.shelf === s);
        const m = { shelf: s, total: relevant.length, ok: 0, low: 0, out: 0 };
        relevant.forEach(i => {
            const st = calculateStatus(i.stock, i.reorderLevel);
            if (st === 'In Stock') m.ok++;
            else if (st === 'Low Stock') m.low++;
            else if (st === 'Out of Stock') m.out++;
        });
        return m;
    });

    const handleQuickSearch = (e) => {
        if (e.key === 'Enter' || e.type === 'click') {
            if (fastSearchQuery.trim()) {
                navigate(`/find?q=${encodeURIComponent(fastSearchQuery)}`);
            } else {
                navigate('/find');
            }
        }
    };

    const formatDate = (d) => {
        if (!d) return '';
        return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const timeAgo = (ts) => {
        if (!ts) return '';
        const diff = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
        if (diff < 1) return 'Just now';
        if (diff < 60) return `${diff} mins ago`;
        if (diff < 1440) return `${Math.round(diff / 60)} hrs ago`;
        return `${Math.round(diff / 1440)} days ago`;
    };

    return (
        <div className="dashboard-content">

            {/* ALERT BANNERS */}
            {metrics.outOfStock > 0 && (
                <div className="alert-banner mb-4">
                    <div className="flex-between">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <XCircle size={24} />
                            <div>
                                <strong>Inventory Alert</strong>
                                <p style={{ margin: 0, fontSize: '0.9rem' }}>{metrics.outOfStock} products are currently out of stock.</p>
                            </div>
                        </div>
                        <button className="btn btn-outline" onClick={() => navigate('/inventory')} style={{ borderColor: 'rgba(255,255,255,0.4)', color: 'white' }}>
                            View Out of Stock Items
                        </button>
                    </div>
                </div>
            )}

            {metrics.expired > 0 && (
                <div className="alert-banner mb-4" style={{ background: '#7f1d1d' }}>
                    <div className="flex-between">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Ban size={24} />
                            <div>
                                <strong>⛔ Expired Stock Warning</strong>
                                <p style={{ margin: 0, fontSize: '0.9rem' }}>{metrics.expired} batch(es) have expired and should not be sold.</p>
                            </div>
                        </div>
                        <button className="btn btn-outline" onClick={() => navigate('/inventory?expiry=Expired')} style={{ borderColor: 'rgba(255,255,255,0.4)', color: 'white' }}>
                            View Expired
                        </button>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <div className="page-header flex-between mb-4">
                <div>
                    <h2>{getGreeting()}, {user?.name?.split(' ')[0] || 'Admin'} 👋</h2>
                    <p>Here is your inventory overview for today.</p>
                </div>
                <button className="btn btn-primary" onClick={() => navigate('/find')}>
                    <Search size={18} /> Find an Item
                </button>
            </div>

            {/* KPI GRID – 4 columns */}
            <div className="dash-grid-4 mb-4">
                <div className="card kpi-card">
                    <div className="kpi-icon blue"><Package size={24} /></div>
                    <div className="kpi-content">
                        <p className="kpi-label">Total Products</p>
                        <h3 className="kpi-value">{metrics.total}</h3>
                        <p className="kpi-subtext">Catalog items</p>
                    </div>
                </div>
                <div className="card kpi-card">
                    <div className="kpi-icon green"><PackageCheck size={24} /></div>
                    <div className="kpi-content">
                        <p className="kpi-label">In Stock</p>
                        <h3 className="kpi-value">{metrics.available}</h3>
                        <p className="kpi-subtext">{healthyPercentage}% healthy</p>
                    </div>
                </div>
                <div className="card kpi-card">
                    <div className="kpi-icon orange"><AlertTriangle size={24} /></div>
                    <div className="kpi-content">
                        <p className="kpi-label">Low Stock</p>
                        <h3 className="kpi-value">{metrics.lowStock}</h3>
                        <p className="kpi-subtext">Needs reorder</p>
                    </div>
                </div>
                <div className="card kpi-card">
                    <div className="kpi-icon red"><XCircle size={24} /></div>
                    <div className="kpi-content">
                        <p className="kpi-label">Out of Stock</p>
                        <h3 className="kpi-value">{metrics.outOfStock}</h3>
                        <p className="kpi-subtext">Restock needed</p>
                    </div>
                </div>
            </div>

            <div className="dash-grid-4 mb-4">
                <div className="card kpi-card">
                    <div className="kpi-icon orange"><Timer size={24} /></div>
                    <div className="kpi-content">
                        <p className="kpi-label">Expiring Soon</p>
                        <h3 className="kpi-value">{metrics.expiringSoon}</h3>
                        <p className="kpi-subtext">Within 30 days</p>
                    </div>
                </div>
                <div className="card kpi-card">
                    <div className="kpi-icon red"><Ban size={24} /></div>
                    <div className="kpi-content">
                        <p className="kpi-label">Expired</p>
                        <h3 className="kpi-value">{metrics.expired}</h3>
                        <p className="kpi-subtext">Action needed</p>
                    </div>
                </div>
                <div className="card kpi-card" style={{ gridColumn: 'span 2' }}>
                    <div className="kpi-icon purple"><DollarSign size={24} /></div>
                    <div className="kpi-content">
                        <p className="kpi-label">Total Inventory Value</p>
                        <h3 className="kpi-value" style={{ fontSize: '1.5rem' }}>₹{metrics.totalValue.toLocaleString('en-IN')}</h3>
                        <p className="kpi-subtext">Based on current stock × price</p>
                    </div>
                </div>
            </div>

            {/* SEARCH BAR */}
            <div className="card mb-4">
                <h3 className="dash-title">Find an Item</h3>
                <p className="dash-desc mb-4">Quickly locate stationery products by name, brand, SKU, batch number or shelf location.</p>
                <div className="search-input-wrapper" style={{ background: 'var(--bg-secondary)', border: '2px solid var(--border)' }}>
                    <Search size={22} className="text-muted" style={{ marginLeft: 12 }} />
                    <input
                        className="search-input"
                        type="text"
                        placeholder="Search products, SKU, brand, batch, shelf..."
                        value={fastSearchQuery}
                        onChange={(e) => setFastSearchQuery(e.target.value)}
                        onKeyDown={handleQuickSearch}
                    />
                    <button className="btn btn-primary" style={{ marginRight: 4, borderRadius: 99, padding: '8px 24px' }} onClick={handleQuickSearch}>
                        Find Item
                    </button>
                </div>
            </div>

            {/* 2-COL: HEALTH + STOCK ALERTS */}
            <div className="dash-grid-2 mb-4">
                <div className="card">
                    <h3 className="dash-title mb-4">Inventory Health</h3>
                    <div className="health-bar-container mb-4">
                        <div className="health-bar-fill" style={{ width: `${healthyPercentage}%` }}></div>
                    </div>
                    <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 24 }}>
                        {healthyPercentage}% of products are sufficiently stocked.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="flex-between">
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--success)' }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: 'currentColor' }}></div> Healthy Stock</span>
                            <strong>{metrics.available}</strong>
                        </div>
                        <div className="flex-between">
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--warning)' }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: 'currentColor' }}></div> Low Stock</span>
                            <strong>{metrics.lowStock}</strong>
                        </div>
                        <div className="flex-between">
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger)' }}><div style={{ width: 12, height: 12, borderRadius: '50%', background: 'currentColor' }}></div> Out of Stock</span>
                            <strong>{metrics.outOfStock}</strong>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="flex-between mb-4">
                        <h3 className="dash-title"><AlertTriangle size={18} style={{ marginRight: 6, display: 'inline', color: 'var(--warning)' }} /> Stock Alerts</h3>
                        <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => navigate('/inventory')}>View Inventory</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {stockAlerts.length === 0 ? (
                            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                                <PackageCheck size={32} style={{ margin: '0 auto 12px' }} />
                                <p>All products are sufficiently stocked.</p>
                            </div>
                        ) : stockAlerts.map(i => {
                            const st = calculateStatus(i.stock, i.reorderLevel);
                            return (
                                <div key={i.id} className="alert-row">
                                    <div style={{ marginRight: 12 }}>
                                        {st === 'Out of Stock' ? <XCircle color="var(--danger)" /> : <AlertTriangle color="var(--warning)" />}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <strong style={{ color: 'var(--text-primary)' }}>{i.name}</strong>
                                        <div style={{ fontSize: '0.8rem', color: st === 'Out of Stock' ? 'var(--danger)' : 'var(--warning)', marginTop: 4 }}>
                                            {st === 'Out of Stock' ? 'Out of Stock' : `${i.stock} units remaining`}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>Shelf {i.shelf}</span>
                                        <span>Row {i.row} → Col {i.column}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* EXPIRY ALERTS WIDGET */}
            <div className="card mb-4">
                <div className="flex-between mb-4">
                    <h3 className="dash-title"><Timer size={18} style={{ marginRight: 8, display: 'inline', color: 'var(--warning)' }} /> ⚠ Expiry Alerts</h3>
                    <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => navigate('/inventory?expiry=Expiring+Soon')}>View Expiry Alerts</button>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <span className="expiry-summary-pill orange">{metrics.expiringSoon} expiring soon</span>
                    <span className="expiry-summary-pill red">{metrics.expired} expired</span>
                </div>
                {expiryAlerts.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                        <PackageCheck size={32} style={{ margin: '0 auto 12px' }} />
                        <p>No expiry alerts at this time.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {expiryAlerts.map((a, idx) => (
                            <div key={idx} className="alert-row" style={{ borderLeft: `3px solid ${a.status === 'EXPIRED' ? 'var(--danger)' : a.status === 'CRITICAL' ? '#dc2626' : 'var(--warning)'}` }}>
                                <div style={{ marginRight: 12, fontSize: '1.2rem' }}>
                                    {a.status === 'EXPIRED' ? '⛔' : a.status === 'CRITICAL' ? '🔴' : '🟠'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <strong style={{ color: 'var(--text-primary)' }}>{a.productName}</strong>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>Batch: {a.batchId}</div>
                                </div>
                                <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>
                                    <div style={{ fontWeight: 600, color: a.status === 'EXPIRED' ? 'var(--danger)' : 'var(--warning)' }}>
                                        {getExpiryText(a.daysRemaining)}
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{formatDate(a.expiryDate)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 2-COL: RECENT SEARCHES + RECENTLY VIEWED */}
            <div className="dash-grid-2 mb-4">
                <div className="card">
                    <h3 className="dash-title mb-4"><Clock size={18} style={{ marginRight: 8, display: 'inline', verticalAlign: 'text-bottom', color: 'var(--text-muted)' }} /> Recent Searches</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {recentSearches.length === 0 ? (
                            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: 12 }}>
                                <Search size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                                <p>No recent searches yet.</p>
                            </div>
                        ) : recentSearches.map((s, idx) => (
                            <div key={idx} className="hist-row" onClick={() => navigate('/find?q=' + encodeURIComponent(s.query))}>
                                <Search size={16} className="text-muted" />
                                <div style={{ flex: 1 }}><strong>{s.query}</strong></div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(s.timestamp).toLocaleTimeString()}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card">
                    <h3 className="dash-title mb-4"><Eye size={18} style={{ marginRight: 8, display: 'inline', verticalAlign: 'text-bottom', color: 'var(--text-muted)' }} /> Recently Viewed</h3>
                    <div className="recently-viewed-grid">
                        {inventory.slice(0, 6).map(p => (
                            <div key={p.id} className="small-product-card" onClick={() => navigate('/inventory')}>
                                <div className="s-img">
                                    {p.image ? (
                                        <img src={p.image} alt={p.name}
                                            onError={e => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'block'; }}
                                        />
                                    ) : null}
                                    <span style={{ display: p.image ? 'none' : 'block' }}>{getCategoryEmoji(p.category)}</span>
                                </div>
                                <div className="s-info">
                                    <strong>{p.name}</strong>
                                    <span className="price">₹{p.price}</span>
                                    <span className="qty">{p.stock} units</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* QUICK ACTIONS & SHELF OVERVIEW */}
            <div className="dash-grid-2 mb-4">
                <div className="card">
                    <h3 className="dash-title mb-4"><MapPin size={18} style={{ marginRight: 8, display: 'inline', verticalAlign: 'text-bottom', color: 'var(--text-muted)' }} /> Store Shelf Overview</h3>
                    <div className="shelf-grid">
                        {shelfOverview.map(s => (
                            <div key={s.shelf} className="shelf-card">
                                <div className="shelf-head">
                                    <h4>SHELF {s.shelf}</h4>
                                    <span className="shelf-total">{s.total} Products</span>
                                </div>
                                <div className="shelf-stats">
                                    <div className="s-stat"><span className="dot green"></span> {s.ok}</div>
                                    <div className="s-stat"><span className="dot orange"></span> {s.low}</div>
                                    <div className="s-stat"><span className="dot red"></span> {s.out}</div>
                                </div>
                                <button className="btn btn-outline" style={{ width: '100%', fontSize: '0.8rem', padding: 6, marginTop: 12 }} onClick={() => navigate('/inventory')}>
                                    View
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div className="card">
                        <h3 className="dash-title mb-4">Quick Actions</h3>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <button className="btn btn-primary" onClick={() => navigate('/find')}><Search size={16} /> Find Item</button>
                            <button className="btn btn-outline" onClick={() => navigate('/inventory')}><Package size={16} /> View Inventory</button>
                            <button className="btn btn-outline text-warning" style={{ borderColor: 'var(--warning)', background: 'rgba(245, 158, 11, 0.05)' }} onClick={() => navigate('/inventory?expiry=Expiring+Soon')}><Timer size={16} /> Expiring Soon</button>
                            <button className="btn btn-outline text-danger" style={{ borderColor: 'var(--danger)', background: 'rgba(239, 68, 68, 0.05)' }} onClick={() => navigate('/inventory?expiry=Expired')}><Ban size={16} /> Expired Stock</button>
                        </div>
                    </div>

                    <div className="card" style={{ flex: 1 }}>
                        <h3 className="dash-title mb-4"><Activity size={18} style={{ marginRight: 8, display: 'inline', verticalAlign: 'text-bottom', color: 'var(--text-muted)' }} /> Recent Activity</h3>
                        <div className="activity-list">
                            {activities && activities.length > 0 ? activities.map(act => (
                                <div key={act.id} className="act-row">
                                    <span className={`dot ${act.type === 'success' ? 'green' : act.type === 'warning' ? 'orange' : 'red'}`}></span>
                                    <div style={{ flex: 1 }}>
                                        <strong>{act.title}</strong>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{act.details}</div>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{timeAgo(act.timestamp)}</span>
                                </div>
                            )) : (
                                <>
                                    <div className="act-row">
                                        <span className="dot green"></span>
                                        <div style={{ flex: 1 }}>
                                            <strong>System started</strong>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>StationAI initialized with {metrics.total} products</div>
                                        </div>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Now</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
