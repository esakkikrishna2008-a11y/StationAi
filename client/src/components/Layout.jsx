import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, PlusCircle, Search,
  AlertTriangle, Timer, Receipt, Settings, LogOut,
  Store, Bell, X, User, ChevronRight, Menu, Sun, Moon
} from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useStock } from '../context/StockContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { calculateExpiryStatus } from '../utils';
import AddEditProductModal from './AddEditProductModal';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/billing': 'Billing / POS',
  '/inventory': 'Inventory',
  '/find': 'Find Item',
  '/stock-alerts': 'Stock Alerts',
  '/expiry-alerts': 'Expiry Alerts',
  '/billing-history': 'Billing History',
  '/settings': 'Settings',
  '/profile': 'Profile',
};

// Category emoji for product images (Universal Retail)
const CATEGORY_EMOJI = {
  // Stationery
  'Pens': '🖊️', 'Pencils': '✏️', 'Markers': '🖍️', 'Markers & Highlighters': '🖍️',
  'Erasers': '🧹', 'Notebooks': '📓', 'Files': '📁', 'Files & Folders': '📁',
  'Paper': '📄', 'Paper & Envelopes': '📄', 'Scissors': '✂️', 'Staplers': '📌',
  'Glue': '🧴', 'Art Supplies': '🎨', 'Geometry': '📐', 'Rulers': '📏',
  'School Supplies': '🎒', 'Office Supplies': '💼', 'Desk Accessories': '📎',
  // Grocery & Staples
  'Rice & Grains': '🌾', 'Wheat & Flour': '🌾', 'Cooking Oil & Ghee': '🫒',
  'Sugar & Salt': '🧂', 'Pulses & Dals': '🥣', 'Spices & Masalas': '🌶️',
  'Snacks & Biscuits': '🍪', 'Snacks & Sweets': '🍫', 'Beverages & Tea': '🧃',
  'Beverages': '🥤', 'Dairy & Eggs': '🥛', 'Dairy & Frozen': '🧀',
  'Packaged Food': '🥫', 'Bakery & Bread': '🍞',
  // Departmental & General Store
  'Food & Groceries': '🛒', 'Personal Care & Hygiene': '🧴', 'Personal Care': '🧼',
  'Personal Hygiene': '🪥', 'Household & Cleaning': '🧹', 'Cleaning & Laundry': '🧼',
  'Cleaning Supplies': '🧽', 'Home & Kitchen': '🍳', 'Electronics & Accessories': '🔋',
  'Electronics & Gadgets': '🔌', 'Daily Essentials': '🛍️', 'Household Items': '🏠',
  'Batteries & Hardware': '🔋', 'Apparel & Footwear': '👕', 'Baby Care': '🍼',
  'default': '📦'
};

export function getCategoryEmoji(category) {
  if (!category) return CATEGORY_EMOJI['default'];
  return CATEGORY_EMOJI[category] || CATEGORY_EMOJI['default'];
}

export default function Layout() {
  const { inventory, notifications, markNotificationRead, markAllNotificationsRead, toasts, removeToast, error: stockError, refreshInventory } = useStock();
  const { user, logout, backendError } = useAuth();
  const { effectiveTheme, toggleTheme } = useTheme();
  const [showNotif, setShowNotif] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
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

  const allNotifications = notifications || [];
  const unreadCount = allNotifications.filter(n => !n.read).length;

  const stockAlertCount = useMemo(() => {
    if (!inventory || !Array.isArray(inventory)) return 0;
    return inventory.filter(i => {
      const stock = Number(i.stock || i.quantity || 0);
      const reorder = Number(i.reorderLevel || 5);
      return stock <= reorder;
    }).length;
  }, [inventory]);

  const expiryAlertCount = useMemo(() => {
    if (!inventory || !Array.isArray(inventory)) return 0;
    let count = 0;
    inventory.forEach(item => {
      if (!item.expiryTracking || !item.batches || !Array.isArray(item.batches)) return;
      item.batches.forEach(b => {
        const es = calculateExpiryStatus(b.expiryDate, true);
        if (es === 'EXPIRED' || es === 'CRITICAL' || es === 'EXPIRING SOON') {
          count++;
        }
      });
    });
    return count;
  }, [inventory]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'A';

  const navGroups = [
    {
      group: 'MAIN',
      items: [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
        { to: '/billing', icon: ShoppingCart, label: 'Billing / POS' },
        { to: '/inventory', icon: Package, label: 'Inventory' },
      ]
    },
    {
      group: 'PRODUCTS',
      items: [
        { isAction: true, icon: PlusCircle, label: 'Add Product', onClick: () => setShowAddProductModal(true) },
        { to: '/find', icon: Search, label: 'Find Item' },
      ]
    },
    {
      group: 'ALERTS',
      items: [
        { to: '/stock-alerts', icon: AlertTriangle, label: 'Stock Alerts', badge: stockAlertCount || null, badgeType: 'warning' },
        { to: '/expiry-alerts', icon: Timer, label: 'Expiry Alerts', badge: expiryAlertCount || null, badgeType: 'danger' },
      ]
    },
    {
      group: 'REPORTS',
      items: [
        { to: '/billing-history', icon: Receipt, label: 'Billing History' },
      ]
    },
    {
      group: 'SYSTEM',
      items: [
        { to: '/settings', icon: Settings, label: 'Settings' },
      ]
    }
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
          <div>
            <h1>StationAI</h1>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', marginTop: -2, fontWeight: 500 }}>
              Shop Management
            </span>
          </div>
        </div>

        <div className="nav-section" style={{ flex: 1, overflowY: 'auto' }}>
          {navGroups.map((grp) => (
            <div key={grp.group} style={{ marginBottom: 12 }}>
              <span className="nav-section-label">{grp.group}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {grp.items.map((item, idx) => {
                  if (item.isAction) {
                    return (
                      <button
                        key={idx}
                        type="button"
                        className="nav-link nav-link-action"
                        onClick={item.onClick}
                        style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', font: 'inherit' }}
                      >
                        <item.icon size={18} color="var(--primary)" />
                        <span style={{ fontWeight: 600 }}>{item.label}</span>
                      </button>
                    );
                  }

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.exact}
                      className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                      <item.icon size={18} />
                      <span>{item.label}</span>
                      {item.badge > 0 && (
                        <span className={`nav-badge ${item.badgeType === 'danger' ? 'nav-badge-danger' : ''}`}>
                          {item.badge > 9 ? '9+' : item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="sidebar-bottom">
          {user && (
            <div
              className="sidebar-user"
              onClick={() => navigate('/profile')}
              role="button"
              tabIndex={0}
              title="View profile"
              style={{ marginBottom: 6 }}
            >
              <div className="user-avatar">{userInitial}</div>
              <div className="user-info">
                <div className="user-name">{user.name}</div>
                <div className="user-role">{user.role || 'Shopkeeper'}</div>
              </div>
              <User size={14} color="var(--text-muted)" />
            </div>
          )}

          <button
            className="nav-link"
            onClick={() => setShowLogoutConfirm(true)}
            style={{ border: 'none', cursor: 'pointer', width: '100%', background: 'transparent', textAlign: 'left', color: 'var(--text-muted)' }}
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </nav>

      {/* Main area */}
      <main className="main-content">

        {(stockError || backendError) && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '8px 16px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 100
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} />
              <span><strong>Server Notice:</strong> {stockError || backendError}</span>
            </div>
            <button
              className="btn btn-outline btn-xs"
              onClick={() => refreshInventory && refreshInventory()}
              style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' }}
            >
              Retry
            </button>
          </div>
        )}
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
                  <div className="notif-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>
                        Notifications {unreadCount > 0 && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>({unreadCount})</span>}
                      </h4>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => markAllNotificationsRead()}
                          style={{
                            background: 'none', border: 'none', color: 'var(--accent-primary)',
                            fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: 0
                          }}
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>
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
                        onClick={() => {
                          if (!n.read) markNotificationRead(n.id);
                          if (n.relatedProductId) {
                            navigate(`/find?q=${n.relatedProductId}`);
                          }
                          setShowNotif(false);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            if (!n.read) markNotificationRead(n.id);
                            if (n.relatedProductId) navigate(`/find?q=${n.relatedProductId}`);
                            setShowNotif(false);
                          }
                        }}
                      >
                        <div className="notif-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{n.title}</span>
                          {!n.read && (
                            <span
                              onClick={(e) => { e.stopPropagation(); markNotificationRead(n.id); }}
                              title="Mark as read"
                              style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600 }}
                            >
                              Read
                            </span>
                          )}
                        </div>
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

            {/* Theme Toggle Button */}
            <button
              className="btn-icon theme-toggle-btn"
              onClick={toggleTheme}
              title={effectiveTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={effectiveTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'var(--transition)'
              }}
            >
              {effectiveTheme === 'dark' ? (
                <Sun size={18} color="#F59E0B" />
              ) : (
                <Moon size={18} color="#6366F1" />
              )}
            </button>

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

      {/* Add Product Global Modal */}
      {showAddProductModal && (
        <AddEditProductModal
          product={null}
          onClose={() => setShowAddProductModal(false)}
          onSuccess={() => {
            setShowAddProductModal(false);
            if (refreshInventory) refreshInventory();
          }}
        />
      )}
    </div>
  );
}


