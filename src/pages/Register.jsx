import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

// Use environment variable or fallback to deployed backend
const API_URL = import.meta.env.VITE_API_URL || 'https://backend-sfrm.onrender.com';

export default function Register() {
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [phone,    setPhone]    = useState('');
  const [role,     setRole]     = useState('USER');
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(false);
  const navigate   = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Save pending registration data (no password — OTP-only)
      sessionStorage.setItem('rentrow_pending', JSON.stringify({ name, phone, role }));

      // CHANGE THIS LINE - use API_URL instead of localhost
      const res  = await fetch(`${API_URL}/api/auth/send-otp`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ email, purpose: 'REGISTER' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP.');

      navigate(`/verify?email=${encodeURIComponent(email)}&purpose=REGISTER`);
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
          <h1 className="auth-title">Create account</h1>
          <p className="auth-subtitle">Join RentRow — we'll verify your email via OTP</p>
        </div>

        {error && (
          <div className="form-error">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">Full name</label>
            <input
              id="reg-name" type="text" className="form-input"
              placeholder="John Doe"
              value={name} onChange={e => setName(e.target.value)} required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email address</label>
            <input
              id="reg-email" type="email" className="form-input"
              placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)} required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-phone">Phone number <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span></label>
            <input
              id="reg-phone" type="tel" className="form-input"
              placeholder="+91 98765 43210"
              value={phone} onChange={e => setPhone(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">I am a…</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {[
                { val: 'USER',     label: 'Tenant',   desc: 'Looking for a place' },
                { val: 'LANDLORD', label: 'Landlord', desc: 'Listing a property'  },
              ].map(({ val, label, desc }) => (
                <button
                  key={val} type="button" onClick={() => setRole(val)}
                  style={{
                    padding: '0.875rem', borderRadius: 'var(--radius-md)',
                    border: `1px solid ${role === val ? 'var(--primary)' : 'var(--border)'}`,
                    background: role === val ? 'var(--primary-subtle)' : 'var(--surface-2)',
                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: role === val ? 'var(--primary-hover)' : 'var(--text-1)' }}>{label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.125rem' }}>{desc}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit" className="btn btn-primary w-full"
            style={{ padding: '0.7rem', fontSize: '0.9375rem' }}
            disabled={loading}
          >
            {loading ? 'Sending OTP…' : 'Continue with Email OTP'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
