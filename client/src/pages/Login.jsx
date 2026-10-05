import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Store, Package, Search, BarChart3, Shield, Loader2 } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: '', password: '', remember: false });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.email.trim()) return setError('Email address is required.');
    if (!form.password) return setError('Password is required.');

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(form.email)) return setError('Please enter a valid email address.');

    setLoading(true);
    setError('');

    try {
      await login(form.email, form.password, form.remember);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* LEFT — Branding */}
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-brand-logo">
            <Store size={32} color="white" />
          </div>
          <h1>StationAI</h1>
          <p>Smart inventory tracking for modern stationery shops</p>

          <div className="auth-features">
            <div className="auth-feature-item">
              <Package size={18} color="#60a5fa" />
              <span>Track every product with shelf, row & column precision</span>
            </div>
            <div className="auth-feature-item">
              <Search size={18} color="#60a5fa" />
              <span>Find any item in seconds with smart search</span>
            </div>
            <div className="auth-feature-item">
              <BarChart3 size={18} color="#60a5fa" />
              <span>Monitor stock levels and expiry dates in real time</span>
            </div>
            <div className="auth-feature-item">
              <Shield size={18} color="#60a5fa" />
              <span>FEFO-aware inventory management built in</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT — Form */}
      <div className="auth-right">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h2>Welcome back 👋</h2>
            <p>Sign in to manage your inventory</p>
          </div>

          {/* Demo Account for Evaluation Card */}
          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '12px',
            padding: '14px 16px',
            marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.1rem' }}>🎓</span>
                <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>Demo Account</span>
              </div>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'var(--primary)',
                background: 'rgba(59, 130, 246, 0.1)',
                padding: '2px 8px',
                borderRadius: '99px',
                border: '1px solid rgba(59, 130, 246, 0.2)'
              }}>
                Demo Account for Evaluation
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '8px 12px',
              fontSize: '0.82rem',
              marginBottom: '12px',
              background: 'var(--bg-card)',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)'
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Email</span>
                <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.85rem' }}>demo@stationai.app</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Password</span>
                <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.85rem' }}>Demo@123</strong>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                setForm(prev => ({ ...prev, email: 'demo@stationai.app', password: 'Demo@123' }));
                setError('');
              }}
              style={{
                width: '100%',
                fontWeight: 700,
                fontSize: '0.84rem',
                padding: '7px 12px',
                background: 'rgba(59, 130, 246, 0.08)',
                borderColor: 'rgba(59, 130, 246, 0.35)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>⚡</span> Use Demo Account
            </button>
          </div>

          {error && (
            <div className="auth-error-message" role="alert" style={{ marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                className={`form-input ${error && !form.email ? 'error' : ''}`}
                placeholder="you@shop.com"
                value={form.email}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div className="form-input-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="form-input"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="form-input-toggle"
                  onClick={() => setShowPassword(p => !p)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-checkbox-row">
              <input
                id="remember"
                name="remember"
                type="checkbox"
                checked={form.remember}
                onChange={handleChange}
                disabled={loading}
              />
              <label htmlFor="remember">Remember me</label>
              <Link to="/forgot-password" style={{ marginLeft: 'auto', color: 'var(--primary)', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              className="btn-full"
              disabled={loading}
              style={{ marginBottom: 16, height: 44 }}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Signing in…
                </>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="auth-footer">
            Don't have an account?{' '}
            <Link to="/register">Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
