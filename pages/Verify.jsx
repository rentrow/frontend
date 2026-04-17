import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';

const OTP_EXPIRE_MIN = 10;

export default function Verify() {
  const [params]      = useSearchParams();
  const email         = params.get('email')   || '';
  const purpose       = params.get('purpose') || 'REGISTER';

  const [digits,   setDigits]   = useState(Array(6).fill(''));
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [resending,setResending]= useState(false);
  const [resent,   setResent]   = useState(false);
  const [timeLeft, setTimeLeft] = useState(OTP_EXPIRE_MIN * 60);

  const inputRefs = useRef([]);
  const { login } = useAuth();
  const navigate  = useNavigate();

  /* Countdown timer */
  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  const expired = timeLeft <= 0;
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const ss = String(timeLeft % 60).padStart(2, '0');

  /* Handle digit input */
  const handleChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...digits];
    next[idx]  = val.slice(-1);
    setDigits(next);
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus();
    // Auto-submit when last box filled
    if (idx === 5 && val) {
      const code = [...next.slice(0, 5), val].join('');
      if (code.length === 6) submitCode(code);
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0)
      inputRefs.current[idx - 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      inputRefs.current[5]?.focus();
      submitCode(pasted);
    }
  };

  const submitCode = async (code) => {
    if (loading) return;
    setLoading(true);
    setError(null);

    const pending = JSON.parse(sessionStorage.getItem('rentrow_pending') || '{}');

    try {
      const res  = await fetch('http://localhost:5000/api/auth/verify-otp', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ email, code, purpose, ...pending }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      sessionStorage.removeItem('rentrow_pending');
      login(data.user, data.token);
      navigate('/');
    } catch (err) {
      setError(err.message);
      setDigits(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length !== 6) return setError('Enter all 6 digits');
    submitCode(code);
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    try {
      await fetch('http://localhost:5000/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose }),
      });
      setTimeLeft(OTP_EXPIRE_MIN * 60);
      setResent(true);
      setDigits(Array(6).fill(''));
      inputRefs.current[0]?.focus();
      setTimeout(() => setResent(false), 3000);
    } catch {
      setError('Failed to resend. Try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-scale-in">

        {/* Icon */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--primary-subtle)',
            border: '2px solid rgba(99,102,241,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
          }}>
            <ShieldCheck size={30} style={{ color: 'var(--primary)' }} />
          </div>
          <h1 className="auth-title">Verify your email</h1>
          <p className="auth-subtitle">
            We sent a 6-digit code to<br />
            <strong style={{ color: 'var(--text-1)' }}>{email}</strong>
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="form-error" style={{ marginBottom: '1rem' }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {resent && (
          <div style={{
            padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)',
            background: 'var(--green-subtle)', border: '1px solid rgba(34,197,94,0.2)',
            color: 'var(--green)', fontSize: '0.875rem', marginBottom: '1rem',
          }}>
            ✓ New code sent to your email
          </div>
        )}

        {/* OTP Boxes */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1.5rem' }}
            onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => inputRefs.current[i] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                disabled={loading || expired}
                style={{
                  width: '46px', height: '56px',
                  textAlign: 'center', fontSize: '1.5rem', fontWeight: 700,
                  background: 'var(--surface-2)',
                  border: `2px solid ${d ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-1)', outline: 'none',
                  transition: 'border-color 0.15s',
                  caretColor: 'var(--primary)',
                }}
              />
            ))}
          </div>

          {/* Timer */}
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            {expired ? (
              <span style={{ color: 'var(--red)', fontSize: '0.875rem' }}>Code expired</span>
            ) : (
              <span style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>
                Expires in <strong style={{ color: 'var(--text-2)' }}>{mm}:{ss}</strong>
              </span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            style={{ padding: '0.7rem', fontSize: '0.9375rem', marginBottom: '0.75rem' }}
            disabled={loading || expired || digits.join('').length < 6}
          >
            {loading ? 'Verifying…' : 'Verify Code'}
          </button>
        </form>

        {/* Resend */}
        <button
          className="btn btn-ghost w-full btn-sm"
          onClick={handleResend}
          disabled={resending}
          style={{ color: 'var(--text-3)' }}
        >
          <RefreshCw size={14} />
          {resending ? 'Sending…' : "Didn't receive it? Resend"}
        </button>

        <div className="auth-footer" style={{ marginTop: '1.25rem' }}>
          <Link to={purpose === 'LOGIN' ? '/login' : '/register'}>← Back</Link>
        </div>
      </div>
    </div>
  );
}
