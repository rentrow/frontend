import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const [name,            setName]            = useState('');
  const [email,           setEmail]           = useState('');
  const [phone,           setPhone]           = useState('');
  const [role,            setRole]            = useState('USER');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword,    setShowPassword]    = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [error,           setError]           = useState(null);
  const [loading,         setLoading]         = useState(false);
  const navigate = useNavigate();

  /* ── Password strength helper ── */
  const getStrength = (pw) => {
    if (!pw) return { label: '', color: 'transparent', width: '0%' };
    const checks = [pw.length >= 8, /[A-Z]/.test(pw), /[0-9]/.test(pw), /[^A-Za-z0-9]/.test(pw)];
    const score  = checks.filter(Boolean).length;
    if (score <= 1) return { label: 'Weak',   color: '#ef4444', width: '25%' };
    if (score === 2) return { label: 'Fair',   color: '#f97316', width: '50%' };
    if (score === 3) return { label: 'Good',   color: '#eab308', width: '75%' };
    return              { label: 'Strong', color: '#22c55e', width: '100%' };
  };
  const strength = getStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      return setError('Password must be at least 8 characters.');
    }
    if (password !== confirmPassword) {
      return setError('Passwords do not match.');
    }

    setLoading(true);
    try {
      // Persist registration data (including password) for the verify step
      sessionStorage.setItem(
        'rentrow_pending',
        JSON.stringify({ name, phone, role, password }),
      );

      const res = await fetch('https://backend-sfrm.onrender.com/api/auth/send-otp', {
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

  /* ── Shared eye-toggle style ── */
  const eyeBtn = {
    position: 'absolute', right: '0.75rem', top: '50%',
    transform: 'translateY(-50%)', background: 'none',
    border: 'none', cursor: 'pointer', color: 'var(--text-3)',
    display: 'flex', alignItems: 'center', padding: 0,
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

          {/* Full name */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">Full name</label>
            <input
              id="reg-name" type="text" className="form-input"
              placeholder="John Doe"
              value={name} onChange={e => setName(e.target.value)} required
            />
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">Email address</label>
            <input
              id="reg-email" type="email" className="form-input"
              placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)} required
            />
          </div>

          {/* Phone */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-phone">
              Phone number{' '}
              <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              id="reg-phone" type="tel" className="form-input"
              placeholder="+91 98765 43210"
              value={phone} onChange={e => setPhone(e.target.value)}
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Min. 8 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ paddingRight: '2.5rem' }}
              />
              <button type="button" style={eyeBtn} onClick={() => setShowPassword(v => !v)}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Strength bar */}
            {password && (
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{
                  height: '4px', borderRadius: '99px',
                  background: 'var(--border)', overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', width: strength.width,
                    background: strength.color,
                    transition: 'width 0.3s, background 0.3s',
                  }} />
                </div>
                <span style={{ fontSize: '0.75rem', color: strength.color, marginTop: '0.25rem', display: 'block' }}>
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div className="form-group">
            <label className="form-label" htmlFor="reg-confirm">Confirm password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="reg-confirm"
                type={showConfirm ? 'text' : 'password'}
                className="form-input"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                style={{
                  paddingRight: '2.5rem',
                  borderColor: confirmPassword && confirmPassword !== password
                    ? '#ef4444' : undefined,
                }}
              />
              <button type="button" style={eyeBtn} onClick={() => setShowConfirm(v => !v)}>
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirmPassword && confirmPassword !== password && (
              <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem', display: 'block' }}>
                Passwords don't match
              </span>
            )}
          </div>

          {/* Role selector */}
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
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: role === val ? 'var(--primary-hover)' : 'var(--text-1)' }}>
                    {label}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.125rem' }}>
                    {desc}
                  </div>
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
