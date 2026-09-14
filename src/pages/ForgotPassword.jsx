import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Store, ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return setError('Email address is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Please enter a valid email address.');

    setLoading(true);
    setError('');
    // Simulate email sending (demo only — no real email sent)
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    setSubmitted(true);
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

      <div className="auth-right">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h2>Forgot password?</h2>
            <p>Enter your email and we'll send you a reset link</p>
          </div>

          {/* Demo notice */}
          <div className="auth-demo-hint">
            <strong>🧪 Prototype Notice</strong>
            This is a frontend-only demo. Password reset emails are not actually sent.
          </div>

          {submitted ? (
            <div>
              <div className="auth-success-message">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <Mail size={20} />
                  <strong>Reset link sent (simulated)</strong>
                </div>
                If <strong>{email}</strong> is registered, a reset link would be sent to that address.
                In this demo, simply{' '}
                <Link to="/login" style={{ color: 'var(--success)' }}>return to login</Link> and use the demo credentials.
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              {error && <div className="auth-error-message" role="alert">{error}</div>}

              <div className="form-group">
                <label className="form-label" htmlFor="fp-email">Email Address</label>
                <input
                  id="fp-email"
                  type="email"
                  className={`form-input ${error ? 'error' : ''}`}
                  placeholder="you@shop.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(''); }}
                  disabled={loading}
                />
              </div>

              <button type="submit" className="btn-full" disabled={loading} style={{ height: 44 }}>
                {loading ? <><span className="spinner"></span> Sending…</> : 'Send Reset Link'}
              </button>
            </form>
          )}

          <div className="auth-footer" style={{ marginTop: 20 }}>
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}>
              <ArrowLeft size={16} /> Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
