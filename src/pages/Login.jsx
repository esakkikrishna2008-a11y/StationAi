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

          {/* Demo credentials hint — clearly labelled as prototype-only */}
          <div className="auth-demo-hint">
            <strong>🧪 Demo Credentials (Prototype)</strong>
            Email: <code>admin@stationai.shop</code><br />
            Password: <code>admin123</code>
          </div>

          {error && (
            <div className="auth-error-message" role="alert">
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
