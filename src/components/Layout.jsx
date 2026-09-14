<<<<<<< HEAD
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Search, Package, Network, Settings, LogOut,
  Store, Bell, X, Timer, User, ChevronRight, Menu, AlertTriangle
} from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useStock } from '../context/StockContext';
import { useAuth } from '../context/AuthContext';
import { calculateExpiryStatus, getDaysRemaining, getExpiryText } from '../utils';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/find': 'Find Item',
  '/inventory': 'Inventory',
  '/architecture': 'AI Architecture',
  '/expiry-alerts': 'Expiry Alerts',
  '/settings': 'Settings',
  '/profile': 'Profile',
};

// Category emoji for product images
const CATEGORY_EMOJI = {
  'Pens': '🖊️', 'Pencils': '✏️', 'Markers': '🖍️', 'Highlighters': '🖊️',
  'Erasers': '🧹', 'Notebooks': '📓', 'Files': '📁', 'Paper': '📄',
  'Scissors': '✂️', 'Staplers': '📌', 'Glue': '🧴', 'Art Supplies': '🎨',
  'Geometry': '📐', 'Rulers': '📏', 'School Bags': '🎒', 'Sticky Notes': '🗒️',
  'Correction Fluid': '🖊️', 'default': '📦'
};

export function getCategoryEmoji(category) {
  return CATEGORY_EMOJI[category] || CATEGORY_EMOJI['default'];
}

export default function Layout() {
  const { inventory, notifications, markNotificationRead, toasts, removeToast } = useStock();
  const { user, logout } = useAuth();
  const [showNotif, setShowNotif] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const notifRef = useRef(null);

  const currentPageTitle = PAGE_TITLES[location.pathname] || 'StationAI';

  // Close notif panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotif(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Build expiry notifications dynamically
  const expiryNotifications = useMemo(() => {
    const expNotifs = [];
    inventory.forEach(item => {
      if (!item.expiryTracking || !item.batches) return;
      item.batches.forEach(b => {
        const es = calculateExpiryStatus(b.expiryDate, true);
        if (es === 'EXPIRED' || es === 'CRITICAL' || es === 'EXPIRING SOON') {
          const days = getDaysRemaining(b.expiryDate);
          expNotifs.push({
            id: `exp-${item.id}-${b.batchId}`,
            title: es === 'EXPIRED' ? `${item.name} Expired` : `${item.name} Expiring`,
            message: `Batch ${b.batchId}: ${getExpiryText(days)}`,
            type: es === 'EXPIRED' ? 'error' : 'warning',
            read: false,
            date: new Date().toISOString()
          });
        }
      });
    });
    return expNotifs;
  }, [inventory]);

  const allNotifications = useMemo(() => {
    const expiryIds = new Set(expiryNotifications.map(n => n.id));
    const storedOnly = notifications.filter(n => !expiryIds.has(n.id));
    return [...expiryNotifications, ...storedOnly].slice(0, 30);
  }, [notifications, expiryNotifications]);

  const unreadCount = allNotifications.filter(n => !n.read).length;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'A';

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { to: '/find', icon: Search, label: 'Find Item' },
    { to: '/inventory', icon: Package, label: 'Inventory' },
    { to: '/architecture', icon: Network, label: 'AI Architecture' },
    { to: '/expiry-alerts', icon: Timer, label: 'Expiry Alerts', badge: expiryNotifications.length || null },
  ];

  return (
    <div className="app-container">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay visible"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <nav className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-header">
          <div className="sidebar-logo-icon">
            <Store size={20} color="white" />
          </div>
          <h1>StationAI</h1>
        </div>

        <div className="nav-section">
          <span className="nav-section-label">Navigation</span>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <item.icon size={18} />
              {item.label}
              {item.badge > 0 && (
                <span className="nav-badge">{item.badge > 9 ? '9+' : item.badge}</span>
              )}
            </NavLink>
          ))}
        </div>

        <div className="sidebar-bottom">
          <span className="nav-section-label" style={{ padding: '4px 12px 4px' }}>Account</span>
          <NavLink to="/settings" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <Settings size={18} />
            Settings
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <User size={18} />
            Profile
          </NavLink>
          <button
            className="nav-link"
            onClick={() => setShowLogoutConfirm(true)}
            style={{ border: 'none', cursor: 'pointer', width: '100%', background: 'transparent', textAlign: 'left', color: 'var(--text-muted)' }}
          >
            <LogOut size={18} />
            Logout
          </button>

          {user && (
            <div
              className="sidebar-user"
              onClick={() => navigate('/profile')}
              style={{ marginTop: 8 }}
            >
              <div className="user-avatar">{userInitial}</div>
              <div className="user-info">
                <div className="user-name">{user.name}</div>
                <div className="user-role">{user.role}</div>
              </div>
              <ChevronRight size={14} color="var(--text-muted)" />
            </div>
          )}
        </div>
      </nav>

      {/* Main area */}
      <main className="main-content">
        {/* Top bar */}
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(o => !o)}
              aria-label="Toggle navigation"
              aria-expanded={sidebarOpen}
            >
              <Menu size={20} />
            </button>

            <div className="breadcrumb">
              <span>StationAI</span>
              <span className="breadcrumb-sep"><ChevronRight size={12} /></span>
              <span className="breadcrumb-current">{currentPageTitle}</span>
            </div>
          </div>

          <div className="topbar-right">
            {/* Notification Bell */}
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button
                className="btn-icon"
                onClick={() => setShowNotif(v => !v)}
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
                aria-expanded={showNotif}
                style={{ position: 'relative' }}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: -4, right: -4,
                    background: 'var(--danger)',
                    color: 'white',
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    minWidth: 16, height: 16,
                    borderRadius: '99px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 3px'
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotif && (
                <div className="notif-panel" role="dialog" aria-label="Notifications">
                  <div className="notif-header">
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>
                      Notifications {unreadCount > 0 && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>({unreadCount})</span>}
                    </h4>
                    <button className="btn-close" onClick={() => setShowNotif(false)} aria-label="Close notifications">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="notif-list">
                    {allNotifications.length === 0 ? (
                      <div className="notif-empty">
                        <Bell size={28} style={{ marginBottom: 10, opacity: 0.3 }} />
                        <p style={{ fontSize: '0.85rem' }}>No notifications</p>
                      </div>
                    ) : allNotifications.map(n => (
                      <div
                        key={n.id}
                        className={`notif-item ${n.read ? '' : 'unread'} type-${n.type}`}
                        onClick={() => { markNotificationRead(n.id); setShowNotif(false); }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => e.key === 'Enter' && markNotificationRead(n.id)}
                      >
                        <div className="notif-title">{n.title}</div>
                        <div className="notif-msg">{n.message}</div>
                        <div className="notif-time">
                          {new Date(n.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User badge */}
            <button
              className="btn-ghost"
              onClick={() => navigate('/profile')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px' }}
            >
              <div className="user-avatar" style={{ width: 28, height: 28, fontSize: '0.8rem' }}>{userInitial}</div>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {user?.name?.split(' ')[0] || 'Admin'}
              </span>
            </button>
          </div>
        </header>

        <div className="page-container">
          <Outlet />
        </div>
      </main>

      {/* Global Toast Container */}
      <div className="toast-container" aria-live="polite">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type}`} role="alert">
            <div style={{ flex: 1, fontSize: '0.875rem' }}>{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="confirm-dialog-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="confirm-dialog" onClick={e => e.stopPropagation()} role="dialog" aria-labelledby="logout-title">
            <h3 id="logout-title">Sign out of StationAI?</h3>
            <p>You will need to enter your credentials again to access your inventory.</p>
            <div className="confirm-dialog-actions">
              <button className="btn btn-outline" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleLogout}>Sign Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
=======
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Search, Package, Network, Settings, LogOut, Store, Bell, X, Timer, AlertTriangle } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useStock } from '../context/StockContext';
import { calculateExpiryStatus, getDaysRemaining, getExpiryText } from '../utils';

export default function Layout() {
    const { inventory, notifications, markNotificationRead, toasts, removeToast } = useStock();
    const [showNotif, setShowNotif] = useState(false);
    const navigate = useNavigate();

    // Build expiry notifications dynamically
    const expiryNotifications = useMemo(() => {
        const expNotifs = [];
        inventory.forEach(item => {
            if (!item.expiryTracking || !item.batches) return;
            item.batches.forEach(b => {
                const es = calculateExpiryStatus(b.expiryDate, true);
                if (es === 'EXPIRED' || es === 'CRITICAL' || es === 'EXPIRING SOON') {
                    const days = getDaysRemaining(b.expiryDate);
                    expNotifs.push({
                        id: `exp-${item.id}-${b.batchId}`,
                        title: es === 'EXPIRED' ? `⛔ ${item.name} Expired` : `🟠 ${item.name} Expiring`,
                        message: `Batch ${b.batchId}: ${getExpiryText(days)}`,
                        type: es === 'EXPIRED' ? 'error' : 'warning',
                        read: false,
                        date: new Date().toISOString()
                    });
                }
            });
        });
        return expNotifs;
    }, [inventory]);

    // Merge stored notifications with expiry-generated ones
    const allNotifications = useMemo(() => {
        const expiryIds = new Set(expiryNotifications.map(n => n.id));
        const storedOnly = notifications.filter(n => !expiryIds.has(n.id));
        return [...expiryNotifications, ...storedOnly].slice(0, 30);
    }, [notifications, expiryNotifications]);

    const unreadCount = allNotifications.filter(n => !n.read).length;

    return (
        <div className="app-container">
            <nav className="sidebar">
                <div className="sidebar-header">
                    <Store className="text-primary" size={24} style={{ width: 32, height: 32, marginRight: 8, padding: 4 }} />
                    <h1>StationAI</h1>
                </div>

                <div className="nav-links">
                    <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <LayoutDashboard size={20} /> Dashboard
                    </NavLink>
                    <NavLink to="/find" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <Search size={20} /> Find Item
                    </NavLink>
                    <NavLink to="/inventory" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <Package size={20} /> Inventory
                    </NavLink>
                    <NavLink to="/architecture" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        <Network size={20} /> AI Architecture
                    </NavLink>
                </div>

                {/* Expiry Quick Link */}
                {expiryNotifications.length > 0 && (
                    <div style={{ padding: '12px 16px', margin: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 10, cursor: 'pointer', border: '1px solid rgba(239,68,68,0.15)' }}
                        onClick={() => navigate('/inventory?expiry=Expiring+Soon')}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--warning)', fontWeight: 600, fontSize: '0.8rem' }}>
                            <Timer size={16} />
                            <span>{expiryNotifications.length} Expiry Alert{expiryNotifications.length !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                )}

                <div style={{ marginTop: 'auto', padding: '24px 12px' }} className="nav-links">
                    <a href="#" className="nav-link" style={{ color: 'var(--text-muted)' }}>
                        <Settings size={20} /> Settings
                    </a>
                    <a href="#" className="nav-link" style={{ color: 'var(--text-muted)' }}>
                        <LogOut size={20} /> Logout
                    </a>
                </div>
            </nav>

            <main className="main-content">
                <header className="topbar">
                    <div style={{ position: 'relative' }}>
                        <button
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', position: 'relative' }}
                            onClick={() => setShowNotif(!showNotif)}
                        >
                            <Bell size={24} color="var(--text-secondary)" />
                            {unreadCount > 0 && (
                                <div style={{
                                    position: 'absolute', top: -5, right: -5,
                                    background: 'var(--danger)', color: 'white',
                                    fontSize: '0.65rem', fontWeight: 700,
                                    width: 18, height: 18, borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </div>
                            )}
                        </button>

                        {showNotif && (
                            <div style={{
                                position: 'absolute', top: 40, right: 0,
                                width: 360, background: 'var(--bg-secondary)',
                                border: '1px solid var(--border)', borderRadius: 12,
                                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
                                zIndex: 50, maxHeight: 440, overflowY: 'auto'
                            }}>
                                <div className="flex-between" style={{ padding: '16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                                    <h4 style={{ margin: 0 }}>Notifications ({unreadCount})</h4>
                                    <button onClick={() => setShowNotif(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                                        <X size={16} color="var(--text-muted)" />
                                    </button>
                                </div>
                                <div>
                                    {allNotifications.length === 0 ? (
                                        <p style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No notifications.</p>
                                    ) : (
                                        allNotifications.map(n => (
                                            <div
                                                key={n.id}
                                                onClick={() => { markNotificationRead(n.id); }}
                                                style={{
                                                    padding: '14px 16px',
                                                    borderBottom: '1px solid var(--border)',
                                                    background: n.read ? 'transparent' : n.type === 'error' ? 'rgba(239,68,68,0.05)' : n.type === 'warning' ? 'rgba(245,158,11,0.05)' : 'rgba(59,130,246,0.05)',
                                                    cursor: 'pointer',
                                                    borderLeft: n.type === 'error' ? '3px solid var(--danger)' : n.type === 'warning' ? '3px solid var(--warning)' : 'none'
                                                }}
                                            >
                                                <strong style={{ display: 'block', fontSize: '0.85rem' }}>{n.title}</strong>
                                                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{n.message}</span>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                                    {new Date(n.date).toLocaleTimeString()}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-primary)', fontWeight: 500 }}>
                        <span>Shopkeeper Admin</span>
                        <div style={{ width: 32, height: 32, background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                            A
                        </div>
                    </div>
                </header>

                <div className="page-container">
                    <Outlet />
                </div>
            </main>

            {/* Global Toast Container */}
            <div className="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast ${toast.type}`}>
                        <div style={{ flex: 1 }}>
                            {toast.message}
                        </div>
                        <button onClick={() => removeToast(toast.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                            <X size={16} />
                        </button>
                    </div>
                ))}
            </div>

        </div>
    );
>>>>>>> origin/main
}
