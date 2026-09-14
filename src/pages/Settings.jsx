import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User, Store, Package, Bell, Shield, Palette, Save,
  Eye, EyeOff, CheckCircle
} from 'lucide-react';

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'store', label: 'Store', icon: Store },
  { id: 'inventory', label: 'Inventory', icon: Package },
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
    <button className="btn btn-primary" onClick={onClick} style={{ marginTop: 8 }}>
      {saved ? <><CheckCircle size={16} /> Saved!</> : <><Save size={16} /> Save Changes</>}
    </button>
  );
}

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [activeSection, setActiveSection] = useState('profile');

  // Profile form
  const [profile, setProfile] = useState({
    name: user?.name || '',
    shopName: user?.shopName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [profileSaved, setProfileSaved] = useState(false);

  // Store settings
  const [store, setStore] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('stationAI_settings_store') || '{}');
    return { currency: 'INR', timezone: 'Asia/Kolkata', address: '', reorderThreshold: 5, ...saved };
  });

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

  const saveProfile = () => {
    updateUser({ name: profile.name, shopName: profile.shopName, phone: profile.phone });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const saveStore = () => {
    localStorage.setItem('stationAI_settings_store', JSON.stringify(store));
  };

  const saveInv = () => {
    localStorage.setItem('stationAI_settings_inv', JSON.stringify(invSettings));
  };

  const saveNotifs = () => {
    localStorage.setItem('stationAI_settings_notifs', JSON.stringify(notifs));
  };

  const changePassword = () => {
    if (!security.currentPassword) return setSecurityMsg('Current password is required.');
    if (security.newPassword.length < 6) return setSecurityMsg('New password must be at least 6 characters.');
    if (security.newPassword !== security.confirmNew) return setSecurityMsg('New passwords do not match.');
    // Demo mode: just simulate success
    setSecurityMsg('✅ Password updated successfully (demo mode).');
    setSecurity({ currentPassword: '', newPassword: '', confirmNew: '' });
  };

  const renderSection = () => {
    switch (activeSection) {
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
                  <label className="form-label">Shop Name</label>
                  <input className="form-input" value={profile.shopName} onChange={e => setProfile(p => ({ ...p, shopName: e.target.value }))} />
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input className="form-input" type="email" value={profile.email} readOnly style={{ opacity: 0.7 }} title="Email cannot be changed in demo mode" />
                  <span className="form-error" style={{ color: 'var(--text-muted)' }}>Cannot change email in demo mode</span>
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

      case 'store':
        return (
          <div className="settings-section">
            <div className="card">
              <h3 className="settings-card-title">Store Configuration</h3>
              <div className="form-group">
                <label className="form-label">Store Address</label>
                <input className="form-input" placeholder="123 MG Road, Bangalore" value={store.address} onChange={e => setStore(s => ({ ...s, address: e.target.value }))} />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Default Currency</label>
                  <select className="form-input filter-select" value={store.currency} onChange={e => setStore(s => ({ ...s, currency: e.target.value }))}>
                    <option value="INR">₹ INR - Indian Rupee</option>
                    <option value="USD">$ USD - US Dollar</option>
                    <option value="EUR">€ EUR - Euro</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Timezone</label>
                  <select className="form-input filter-select" value={store.timezone} onChange={e => setStore(s => ({ ...s, timezone: e.target.value }))}>
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Default Reorder Threshold</label>
                <input className="form-input" type="number" min="1" value={store.reorderThreshold}
                  onChange={e => setStore(s => ({ ...s, reorderThreshold: Number(e.target.value) }))}
                  style={{ maxWidth: 150 }} />
              </div>
              <SaveButton onClick={saveStore} />
            </div>
          </div>
        );

      case 'inventory':
        return (
          <div className="settings-section">
            <div className="card">
              <h3 className="settings-card-title">Inventory Settings</h3>
              <ToggleRow
                label="Enable Expiry Tracking"
                desc="Track expiry dates on applicable products"
                checked={invSettings.expiryTracking}
                onChange={v => setInvSettings(s => ({ ...s, expiryTracking: v }))}
              />
              <ToggleRow
                label="FEFO Stock Deduction"
                desc="First Expired First Out: deduct oldest-expiring stock first"
                checked={invSettings.fefo}
                onChange={v => setInvSettings(s => ({ ...s, fefo: v }))}
              />
              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label">Default Low Stock Threshold</label>
                <input className="form-input" type="number" min="1" value={invSettings.lowStockThreshold}
                  onChange={e => setInvSettings(s => ({ ...s, lowStockThreshold: Number(e.target.value) }))}
                  style={{ maxWidth: 150 }} />
              </div>
              <div className="form-group">
                <label className="form-label">Default Sort Order</label>
                <select className="form-input filter-select" value={invSettings.defaultSort} onChange={e => setInvSettings(s => ({ ...s, defaultSort: e.target.value }))} style={{ maxWidth: 220 }}>
                  <option value="name">Product Name</option>
                  <option value="quantity">Quantity</option>
                  <option value="expiry">Expiry Date</option>
                  <option value="price">Price</option>
                </select>
              </div>
              <SaveButton onClick={saveInv} />
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
              <h3 className="settings-card-title">Appearance</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 16 }}>
                StationAI uses a premium dark theme by default for optimal readability in store environments.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ padding: '14px 20px', background: 'var(--bg-primary)', border: '2px solid var(--primary)', borderRadius: 'var(--radius-md)', cursor: 'pointer', minWidth: 120, textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>🌙 Dark</div>
                  <div style={{ color: 'var(--primary)', fontSize: '0.75rem', marginTop: 4 }}>Active</div>
                </div>
                <div style={{ padding: '14px 20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)', cursor: 'not-allowed', opacity: 0.5, minWidth: 120, textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.875rem' }}>☀️ Light</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: 4 }}>Coming soon</div>
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
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 16 }}>
                🧪 Demo mode: Password changes are simulated and do not affect your login.
              </p>
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

            <div className="card">
              <h3 className="settings-card-title">Session Info</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                You are logged in as <strong>{user?.name}</strong> ({user?.email}).
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 8 }}>
                Role: {user?.role} · Store: {user?.shopName}
              </p>
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
        <h2>Settings</h2>
        <p>Configure your StationAI inventory management preferences.</p>
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
