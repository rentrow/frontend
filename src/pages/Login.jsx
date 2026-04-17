import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [tab,          setTab]          = useState('otp');   // 'otp' | 'password'
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState(null);
  const [loading,      setLoading]      = useState(false);
  const { login }  = useAuth();
  const navigate   = useNavigate();

  /* ── OTP login ── */
  const handleOtp = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res  = await fetch('https://backend-sfrm.onrender.com/api/auth/send-otp', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ email, purpose: 'LOGIN' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP.');
      navigate(`/verify?email=${encodeURIComponent(email)}&purpose=LOGIN`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ── Password login ── */
  const handlePassword = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res  = await fetch('https://backend-sfrm.onrender.com/api/auth/login', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed.');

      // Persist auth state FIRST, then navigate to home
      await login(data.user, data.token);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-scale-in">

        <div className="auth-header">
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to your RentRow account</p>
        </div>

        {/* Tab switcher */}
        <div style={{
          display: 'flex', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)',
          padding: '3px', marginBottom: '1.5rem',
        }}>
          {[['otp', 'Email OTP'], ['password', 'Password']].map(([t, lbl]) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(null); }}
              style={{
                flex: 1, padding: '0.5rem', borderRadius: 'calc(var(--radius-md) - 2px)',
                background: tab === t ? 'var(--surface-1)' : 'transparent',
                border: tab === t ? '1px solid var(--border)' : '1px solid transparent',
                fontWeight: tab === t ? 700 : 500,
                color: tab === t ? 'var(--text-1)' : 'var(--text-3)',
                fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {lbl}
            </button>
          ))}
        </div>

        {error && (
          <div className="form-error">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* OTP tab */}
        {tab === 'otp' && (
          <form onSubmit={handleOtp}>
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" htmlFor="login-email-otp">Email address</label>
              <input
                id="login-email-otp" type="email" className="form-input"
                placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required
              />
            </div>
            <button
              type="submit" className="btn btn-primary w-full"
              style={{ padding: '0.7rem', fontSize: '0.9375rem' }}
              disabled={loading}
            >
              {loading ? 'Sending OTP…' : 'Send OTP'}
            </button>
          </form>
        )}

        {/* Password tab */}
        {tab === 'password' && (
          <form onSubmit={handlePassword}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email-pw">Email address</label>
              <input
                id="login-email-pw" type="email" className="form-input"
                placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" htmlFor="login-password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: '0.75rem', top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', cursor: 'pointer', color: 'var(--text-3)',
                    display: 'flex', alignItems: 'center', padding: 0,
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit" className="btn btn-primary w-full"
              style={{ padding: '0.7rem', fontSize: '0.9375rem' }}
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}

        <div className="auth-footer">
          Don't have an account? <Link to="/register">Create one</Link>
        </div>
      </div>
    </div>
  );
}
