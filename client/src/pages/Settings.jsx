import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  User, Store, Package, Bell, Shield, Palette, Save,
  Eye, EyeOff, CheckCircle, Sun, Moon, Laptop, Plus, Trash2, Tag, Check, Grid
} from 'lucide-react';
import {
  getStoreType,
  setStoreType,
  STORE_TYPES,
  getAllCategoriesForStore,
  getCustomCategories,
  addCustomCategory,
  deleteCustomCategory,
  getGridConfig
} from '../data';
import { api } from '../services/api';

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'store', label: 'Store & Type', icon: Store },
  { id: 'categories', label: 'Categories', icon: Tag },
  { id: 'inventory', label: 'Inventory & Grid', icon: Package },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'security', label: 'Security', icon: Shield },
];

function ToggleRow({ label, desc, checked, onChange }) {
  return (
    <div className="settings-toggle-row">
      <div className="toggle-info">
        <div className="toggle-label">{label}</div>
        {desc && <div className="toggle-desc">{desc}</div>}
      </div>
      <label className="toggle-switch">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span className="toggle-slider" />
      </label>
    </div>
  );
}

function SaveButton({ onClick, saved }) {
  return (
    <button className="btn btn-primary" onClick={onClick} style={{ marginTop: 12 }}>
      {saved ? <><CheckCircle size={16} /> Saved!</> : <><Save size={16} /> Save Changes</>}
    </button>
  );
}

export default function Settings() {
  const { user, updateUser } = useAuth();
  const { theme, setTheme, effectiveTheme } = useTheme();
  const [activeSection, setActiveSection] = useState('store');

  // Profile form
  const [profile, setProfile] = useState({
    name: user?.name || '',
    shopName: user?.shopName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [profileSaved, setProfileSaved] = useState(false);

  // Store Type & Store Settings
  const [selectedStoreType, setSelectedStoreType] = useState(() => getStoreType());
  const [storeSaved, setStoreSaved] = useState(false);
  const [store, setStore] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('stationAI_settings_store') || '{}');
    return { currency: 'INR', timezone: 'Asia/Kolkata', address: '', reorderThreshold: 5, ...saved };
  });

  // Dynamic Categories
  const [customCats, setCustomCats] = useState(() => getCustomCategories());
  const [newCatName, setNewCatName] = useState('');
  const [catMsg, setCatMsg] = useState('');

  // Storage Grid Config
  const [gridConfig, setGridConfig] = useState(() => getGridConfig());
  const [gridSaved, setGridSaved] = useState(false);

  // Inventory settings
  const [invSettings, setInvSettings] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('stationAI_settings_inv') || '{}');
    return { expiryTracking: true, fefo: true, defaultSort: 'name', lowStockThreshold: 10, ...saved };
  });

  // Notification settings
  const [notifs, setNotifs] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('stationAI_settings_notifs') || '{}');
    return { lowStock: true, outOfStock: true, expirySoon: true, criticalExpiry: true, ...saved };
  });

  // Security form
  const [security, setSecurity] = useState({ currentPassword: '', newPassword: '', confirmNew: '' });
  const [showPw, setShowPw] = useState(false);
  const [securityMsg, setSecurityMsg] = useState('');

  // Fetch backend settings on mount
  useEffect(() => {
    api.getSettings().then(res => {
      if (res?.settings) {
        if (res.settings.storeType) {
          setSelectedStoreType(res.settings.storeType);
          setStoreType(res.settings.storeType);
        }
        if (res.settings.shopName && !profile.shopName) {
          setProfile(p => ({ ...p, shopName: res.settings.shopName }));
        }
      }
    }).catch(err => console.log('Settings load error:', err));
  }, []);

  const handleSelectStoreType = (typeId) => {
    setSelectedStoreType(typeId);
    setStoreType(typeId);
    // sync to backend
    api.updateSettings({ storeType: typeId }).catch(() => {});
  };

  const saveProfile = () => {
    updateUser({ name: profile.name, shopName: profile.shopName, phone: profile.phone });
    api.updateSettings({ shopName: profile.shopName }).catch(() => {});
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const saveStore = () => {
    localStorage.setItem('stationAI_settings_store', JSON.stringify(store));
    setStoreType(selectedStoreType);
    api.updateSettings({
      shopName: profile.shopName,
      storeType: selectedStoreType,
      currency: store.currency === 'USD' ? '$' : store.currency === 'EUR' ? '€' : '₹',
      lowStockThreshold: invSettings.lowStockThreshold
    }).catch(() => {});
    setStoreSaved(true);
    setTimeout(() => setStoreSaved(false), 2000);
  };

  const saveInv = () => {
    localStorage.setItem('stationAI_settings_inv', JSON.stringify(invSettings));
  };

  const saveGrid = () => {
    localStorage.setItem('stationAI_grid_config', JSON.stringify(gridConfig));
    setGridSaved(true);
    setTimeout(() => setGridSaved(false), 2000);
  };

  const saveNotifs = () => {
    localStorage.setItem('stationAI_settings_notifs', JSON.stringify(notifs));
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const updated = addCustomCategory(newCatName.trim());
    setCustomCats(getCustomCategories());
    setNewCatName('');
    setCatMsg(`✅ Category "${newCatName.trim()}" added successfully.`);
    setTimeout(() => setCatMsg(''), 2500);
  };

  const handleDeleteCategory = (catName) => {
    deleteCustomCategory(catName);
    setCustomCats(getCustomCategories());
    setCatMsg(`Category "${catName}" removed.`);
    setTimeout(() => setCatMsg(''), 2500);
  };

  const changePassword = () => {
    if (!security.currentPassword) return setSecurityMsg('Current password is required.');
    if (security.newPassword.length < 6) return setSecurityMsg('New password must be at least 6 characters.');
    if (security.newPassword !== security.confirmNew) return setSecurityMsg('New passwords do not match.');
    setSecurityMsg('✅ Password updated successfully.');
    setSecurity({ currentPassword: '', newPassword: '', confirmNew: '' });
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'store':
        return (
          <div className="settings-section" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Store Type Selection */}
            <div className="card">
              <h3 className="settings-card-title">Store Type Setup</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', margin: '0 0 16px' }}>
                Select your retail store format. StationAI dynamically adapts categories, units, expiry rules, and suggestions for your store type while preserving all your products and data.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 20 }}>
                {Object.values(STORE_TYPES).map(st => {
                  const isSelected = selectedStoreType === st.id;
                  return (
                    <div
                      key={st.id}
                      onClick={() => handleSelectStoreType(st.id)}
                      style={{
                        padding: '16px',
                        borderRadius: 'var(--radius-md)',
                        border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                        background: isSelected ? 'var(--primary-bg)' : 'var(--bg-secondary)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <strong style={{ fontSize: '0.98rem', color: isSelected ? 'var(--primary)' : 'var(--text-primary)' }}>
                          {st.label}
                        </strong>
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%',
                          border: isSelected ? '2px solid var(--primary)' : '2px solid var(--border)',
                          background: isSelected ? 'var(--primary)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: '0.75rem'
                        }}>
                          {isSelected && <Check size={12} />}
                        </div>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 10px', lineHeight: 1.4 }}>
                        {st.description}
                      </p>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        <strong>Units:</strong> {st.recommendedUnits.slice(0, 4).join(', ')}...
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Active Store Type Summary */}
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.84rem'
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Active Store Configuration: </span>
                  <strong style={{ color: 'var(--primary)' }}>{selectedStoreType}</strong>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {STORE_TYPES[selectedStoreType]?.categories.length} Preset Categories • {STORE_TYPES[selectedStoreType]?.recommendedUnits.length} Recommended Units
                </span>
              </div>
            </div>

            {/* General Store Info */}
            <div className="card">
              <h3 className="settings-card-title">Store Details & Location</h3>
              <div className="form-group">
                <label className="form-label">Store Address</label>
                <input
                  className="form-input"
                  placeholder="e.g. 123 Main Commercial Street, City Center"
                  value={store.address}
                  onChange={e => setStore(s => ({ ...s, address: e.target.value }))}
                />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Default Currency</label>
                  <select
                    className="form-input filter-select"
                    value={store.currency}
                    onChange={e => setStore(s => ({ ...s, currency: e.target.value }))}
                  >
                    <option value="INR">₹ INR - Indian Rupee</option>
                    <option value="USD">$ USD - US Dollar</option>
                    <option value="EUR">€ EUR - Euro</option>
                    <option value="GBP">£ GBP - British Pound</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Timezone</label>
                  <select
                    className="form-input filter-select"
                    value={store.timezone}
                    onChange={e => setStore(s => ({ ...s, timezone: e.target.value }))}
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                  </select>
                </div>
              </div>
              <SaveButton onClick={saveStore} saved={storeSaved} />
            </div>
          </div>
        );

      case 'categories':
        return (
          <div className="settings-section" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card">
              <h3 className="settings-card-title">Product Categories Management</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', margin: '0 0 16px' }}>
                Categories dynamically adjust to your store type ({selectedStoreType}). You can also create custom categories or remove categories anytime.
              </p>

              {catMsg && (
                <div className="alert-banner info mb-4" style={{ fontSize: '0.85rem', padding: '8px 12px' }}>
                  {catMsg}
                </div>
              )}

              {/* Add New Category Form */}
              <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <input
                  className="form-input"
                  placeholder="Enter new category name (e.g. Spices, Detergents, Gift Items)..."
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                  <Plus size={16} /> Add Category
                </button>
              </form>

              {/* Active Categories List */}
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 10 }}>
                Available Categories for {selectedStoreType}:
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {getAllCategoriesForStore(selectedStoreType).map(cat => {
                  const isCustom = customCats.includes(cat);
                  return (
                    <div
                      key={cat}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: isCustom ? 'var(--primary-bg)' : 'var(--bg-secondary)',
                        border: isCustom ? '1px solid var(--primary)' : '1px solid var(--border)',
                        color: isCustom ? 'var(--primary)' : 'var(--text-primary)',
                        fontSize: '0.84rem',
                        fontWeight: 600
                      }}
                    >
                      <span>{cat}</span>
                      {isCustom && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          title="Delete custom category"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--danger)',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 'inventory':
        return (
          <div className="settings-section" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Shelf/Grid Setup */}
            <div className="card">
              <h3 className="settings-card-title">Storage Layout Configuration</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', margin: '0 0 16px' }}>
                Configure the number of storage shelves, rows, and columns for your store layout (e.g. Shelf A → Row 02 → Column 04).
              </p>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Total Rows per Shelf</label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    max="20"
                    value={gridConfig.rows}
                    onChange={e => setGridConfig(g => ({ ...g, rows: Number(e.target.value) || 5 }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Total Columns per Shelf</label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    max="20"
                    value={gridConfig.columns}
                    onChange={e => setGridConfig(g => ({ ...g, columns: Number(e.target.value) || 5 }))}
                  />
                </div>
              </div>

              <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: '8px',
                padding: '10px 14px',
                border: '1px solid var(--border)',
                fontSize: '0.82rem',
                color: 'var(--text-muted)'
              }}>
                Active Capacity: {gridConfig.shelves.length} Shelves × {gridConfig.rows} Rows × {gridConfig.columns} Columns = <strong>{gridConfig.shelves.length * gridConfig.rows * gridConfig.columns} Storage Slots</strong>
              </div>

              <SaveButton onClick={saveGrid} saved={gridSaved} />
            </div>

            {/* Inventory Rules */}
            <div className="card">
              <h3 className="settings-card-title">Inventory Tracking Rules</h3>
              <ToggleRow
                label="Enable Expiry Tracking"
                desc="Allow products with expiration dates to record batch numbers and track expiry status"
                checked={invSettings.expiryTracking}
                onChange={v => setInvSettings(s => ({ ...s, expiryTracking: v }))}
              />
              <ToggleRow
                label="FEFO Stock Deduction (First Expired, First Out)"
                desc="Automatically deplete oldest-expiring stock batches first during POS billing"
                checked={invSettings.fefo}
                onChange={v => setInvSettings(s => ({ ...s, fefo: v }))}
              />
              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label">Default Low Stock Alert Threshold</label>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  value={invSettings.lowStockThreshold}
                  onChange={e => setInvSettings(s => ({ ...s, lowStockThreshold: Number(e.target.value) }))}
                  style={{ maxWidth: 160 }}
                />
              </div>
              <SaveButton onClick={saveInv} />
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="settings-section">
            <div className="card">
              <h3 className="settings-card-title">Profile Information</h3>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Shop / Store Name</label>
                  <input className="form-input" value={profile.shopName} onChange={e => setProfile(p => ({ ...p, shopName: e.target.value }))} />
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input className="form-input" type="email" value={profile.email} readOnly style={{ opacity: 0.7 }} title="Primary account email" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input className="form-input" type="tel" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
                </div>
              </div>
              <SaveButton onClick={saveProfile} saved={profileSaved} />
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="settings-section">
            <div className="card">
              <h3 className="settings-card-title">Notification Preferences</h3>
              <ToggleRow label="Low Stock Alerts" desc="Get notified when products drop below reorder level"
                checked={notifs.lowStock} onChange={v => setNotifs(n => ({ ...n, lowStock: v }))} />
              <ToggleRow label="Out of Stock Alerts" desc="Get notified when products are completely out of stock"
                checked={notifs.outOfStock} onChange={v => setNotifs(n => ({ ...n, outOfStock: v }))} />
              <ToggleRow label="Expiring Soon Alerts" desc="Notify when a batch will expire within 30 days"
                checked={notifs.expirySoon} onChange={v => setNotifs(n => ({ ...n, expirySoon: v }))} />
              <ToggleRow label="Critical Expiry Alerts" desc="Notify when a batch will expire within 7 days"
                checked={notifs.criticalExpiry} onChange={v => setNotifs(n => ({ ...n, criticalExpiry: v }))} />
              <SaveButton onClick={saveNotifs} />
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="settings-section">
            <div className="card">
              <h3 className="settings-card-title">Appearance & Themes</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 20 }}>
                Choose your preferred visual theme for StationAI. The theme updates immediately and is saved across sessions.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
                {/* Dark Theme Option */}
                <div
                  onClick={() => setTheme('dark')}
                  style={{
                    padding: '18px 20px',
                    background: '#111A2E',
                    border: theme === 'dark' ? '2px solid var(--primary)' : '1px solid #263552',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'var(--transition)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Moon size={18} color="#818CF8" />
                      <span style={{ fontWeight: 700, color: '#F8FAFC', fontSize: '0.95rem' }}>Dark</span>
                    </div>
                    <input
                      type="radio"
                      name="themeSetting"
                      checked={theme === 'dark'}
                      onChange={() => setTheme('dark')}
                      style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: 0 }}>
                    Deep midnight palette optimized for focus and low eye strain in stores.
                  </p>
                </div>

                {/* Light Theme Option */}
                <div
                  onClick={() => setTheme('light')}
                  style={{
                    padding: '18px 20px',
                    background: '#FFFFFF',
                    border: theme === 'light' ? '2px solid var(--primary)' : '1px solid #E2E8F0',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'var(--transition)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Sun size={18} color="#D97706" />
                      <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.95rem' }}>Light</span>
                    </div>
                    <input
                      type="radio"
                      name="themeSetting"
                      checked={theme === 'light'}
                      onChange={() => setTheme('light')}
                      style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0 }}>
                    Crisp, clean daytime interface with clean typography and high contrast.
                  </p>
                </div>

                {/* System Default Option */}
                <div
                  onClick={() => setTheme('system')}
                  style={{
                    padding: '18px 20px',
                    background: 'var(--bg-secondary)',
                    border: theme === 'system' ? '2px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'var(--transition)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Laptop size={18} color="var(--accent)" />
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>System</span>
                    </div>
                    <input
                      type="radio"
                      name="themeSetting"
                      checked={theme === 'system'}
                      onChange={() => setTheme('system')}
                      style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                    Automatically syncs with your operating system preferences ({effectiveTheme}).
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="settings-section">
            <div className="card">
              <h3 className="settings-card-title">Change Password</h3>
              {securityMsg && (
                <div className={securityMsg.startsWith('✅') ? 'auth-success-message' : 'auth-error-message'} style={{ marginBottom: 16 }}>
                  {securityMsg}
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <div className="form-input-wrapper">
                  <input className="form-input" type={showPw ? 'text' : 'password'}
                    value={security.currentPassword} onChange={e => setSecurity(s => ({ ...s, currentPassword: e.target.value }))} />
                  <button type="button" className="form-input-toggle" onClick={() => setShowPw(p => !p)}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input className="form-input" type="password"
                    value={security.newPassword} onChange={e => setSecurity(s => ({ ...s, newPassword: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input className="form-input" type="password"
                    value={security.confirmNew} onChange={e => setSecurity(s => ({ ...s, confirmNew: e.target.value }))} />
                </div>
              </div>
              <button className="btn btn-primary" onClick={changePassword} style={{ marginTop: 4 }}>
                <Shield size={16} /> Update Password
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Store & Application Settings</h2>
        <p>Configure Store Type, Categories, Storage Layout, and POS Preferences for StationAI.</p>
      </div>

      <div className="settings-layout">
        {/* Settings navigation */}
        <div className="card" style={{ padding: '12px', height: 'fit-content' }}>
          <div className="settings-nav">
            {SECTIONS.map(section => (
              <button
                key={section.id}
                className={`settings-nav-item ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                <section.icon size={16} />
                {section.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content area */}
        <div>
          {renderSection()}
        </div>
      </div>
    </div>
  );
}
