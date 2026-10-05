import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Edit3, Save, X, LogOut, Mail, Phone, Store, Calendar, Shield } from 'lucide-react';

export default function Profile() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: user?.name || '', shopName: user?.shopName || '', phone: user?.phone || '' });
  const [saveFeedback, setSaveFeedback] = useState('');

  const handleSave = () => {
    if (!editForm.name.trim()) return setSaveFeedback('Name is required.');
    updateUser({ name: editForm.name.trim(), shopName: editForm.shopName.trim(), phone: editForm.phone.trim() });
    setEditing(false);
    setSaveFeedback('Profile updated successfully!');
    setTimeout(() => setSaveFeedback(''), 3000);
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const formatDate = (iso) => {
    if (!iso) return 'Unknown';
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'A';

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="page-header">
        <h2>My Profile</h2>
        <p>View and manage your account information.</p>
      </div>

      {/* Profile header card */}
      <div className="profile-header">
        <div className="profile-avatar-lg">{userInitial}</div>

        <div className="profile-header-info" style={{ flex: 1 }}>
          <h2>{user?.name}</h2>
          <p>{user?.role}</p>
          <div className="profile-header-meta">
            <span className="profile-meta-item"><Store size={13} /> {user?.shopName}</span>
            <span className="profile-meta-item"><Calendar size={13} /> Joined {formatDate(user?.createdAt)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {editing ? (
            <>
              <button className="btn btn-primary btn-sm" onClick={handleSave}><Save size={14} /> Save</button>
              <button className="btn btn-outline btn-sm" onClick={() => { setEditing(false); setEditForm({ name: user?.name || '', shopName: user?.shopName || '', phone: user?.phone || '' }); }}><X size={14} /></button>
            </>
          ) : (
            <button className="btn btn-outline btn-sm" onClick={() => setEditing(true)}><Edit3 size={14} /> Edit</button>
          )}
        </div>
      </div>

      {saveFeedback && (
        <div className="auth-success-message mb-4">{saveFeedback}</div>
      )}

      {/* Profile details */}
      <div style={{ display: 'grid', gap: 16 }}>
        <div className="card">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={16} color="var(--primary)" /> Account Information
          </h3>

          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Shop Name</label>
                <input className="form-input" value={editForm.shopName} onChange={e => setEditForm(f => ({ ...f, shopName: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input className="form-input" type="tel" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { icon: Mail, label: 'Email', value: user?.email },
                { icon: Phone, label: 'Phone', value: user?.phone || '—' },
                { icon: Store, label: 'Shop Name', value: user?.shopName },
                { icon: Shield, label: 'Role', value: user?.role },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 32, height: 32, background: 'var(--primary-light)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <item.icon size={15} color="var(--primary)" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{item.label}</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>{item.value}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Danger zone */}
        <div className="card" style={{ border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 8, color: 'var(--danger)' }}>Sign Out</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Sign out of StationAI on this device.
          </p>
          <button className="btn btn-danger btn-sm" onClick={handleLogout}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
