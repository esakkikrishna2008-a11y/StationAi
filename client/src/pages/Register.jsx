import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Store } from 'lucide-react';

function getPasswordStrength(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthClass = ['', 'weak', 'medium', 'medium', 'strong'];

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: '', shopName: '', email: '', phone: '',
    password: '', confirmPassword: '', terms: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  const strength = getPasswordStrength(form.password);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
    setError('');
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Full name is required.';
    if (!form.shopName.trim()) newErrors.shopName = 'Shop name is required.';
    if (!form.email.trim()) newErrors.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Invalid email.';
    if (!form.password) newErrors.password = 'Password is required.';
    else if (form.password.length < 6) newErrors.password = 'Must be at least 6 characters.';
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match.';
    if (!form.terms) newErrors.terms = 'Please accept the terms to continue.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setError('');

    try {
      await register({
        name: form.name.trim(),
        shopName: form.shopName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password
      });
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-brand-logo">
            <Store size={32} color="white" />
          </div>
          <h1>StationAI</h1>
          <p>Smart inventory tracking for modern stationery shops</p>
        </div>
      </div>

      <div className="auth-right" style={{ overflowY: 'auto' }}>
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h2>Create account</h2>
            <p>Get started with StationAI for free</p>
          </div>

          {error && (
            <div className="auth-error-message" role="alert">{error}</div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="reg-name">Full Name</label>
                <input id="reg-name" name="name" type="text" className={`form-input ${errors.name ? 'error' : ''}`}
                  placeholder="Raj Kumar" value={form.name} onChange={handleChange} disabled={loading} />
                {errors.name && <span className="form-error">{errors.name}</span>}
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="reg-shop">Shop Name</label>
                <input id="reg-shop" name="shopName" type="text" className={`form-input ${errors.shopName ? 'error' : ''}`}
                  placeholder="My Stationery Store" value={form.shopName} onChange={handleChange} disabled={loading} />
                {errors.shopName && <span className="form-error">{errors.shopName}</span>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">Email Address</label>
              <input id="reg-email" name="email" type="email" className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="you@shop.com" value={form.email} onChange={handleChange} disabled={loading} />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-phone">Phone Number <span style={{ color: 'var(--text-muted)' }}>(optional)</span></label>
              <input id="reg-phone" name="phone" type="tel" className="form-input"
                placeholder="+91 98765 43210" value={form.phone} onChange={handleChange} disabled={loading} />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">Password</label>
              <div className="form-input-wrapper">
                <input id="reg-password" name="password" type={showPassword ? 'text' : 'password'}
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  placeholder="Min. 6 characters" value={form.password} onChange={handleChange} disabled={loading} />
                <button type="button" className="form-input-toggle" onClick={() => setShowPassword(p => !p)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {form.password && (
                <div>
                  <div className="password-strength" style={{ marginTop: 6 }}>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className={`strength-bar ${i <= strength ? strengthClass[strength] : ''}`} />
                    ))}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                    Password strength: {strengthLabel[strength]}
                  </span>
                </div>
              )}
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-confirm">Confirm Password</label>
              <div className="form-input-wrapper">
                <input id="reg-confirm" name="confirmPassword" type={showConfirm ? 'text' : 'password'}
                  className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                  placeholder="Re-enter password" value={form.confirmPassword} onChange={handleChange} disabled={loading} />
                <button type="button" className="form-input-toggle" onClick={() => setShowConfirm(p => !p)}>
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
            </div>

            <div className="form-checkbox-row" style={{ marginBottom: 4 }}>
              <input id="reg-terms" name="terms" type="checkbox" checked={form.terms} onChange={handleChange} disabled={loading} />
              <label htmlFor="reg-terms">
                I accept the <a href="#" style={{ color: 'var(--primary)' }}>terms of service</a> and <a href="#" style={{ color: 'var(--primary)' }}>privacy policy</a>
              </label>
            </div>
            {errors.terms && <span className="form-error" style={{ display: 'block', marginBottom: 12 }}>{errors.terms}</span>}

            <button type="submit" className="btn-full" disabled={loading} style={{ marginTop: 8, height: 44 }}>
              {loading ? <><span className="spinner"></span> Creating account…</> : 'Create Account'}
            </button>
          </form>

          <div className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
