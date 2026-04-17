import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AlertCircle, ShieldCheck, RefreshCw } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://backend-sfrm.onrender.com';

export default function Verify() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get email and purpose from URL params
  const params = new URLSearchParams(location.search);
  const email = params.get('email');
  const purpose = params.get('purpose'); // 'REGISTER' or 'LOGIN'

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Redirect if no email
  useEffect(() => {
    if (!email) {
      navigate('/register');
    }
  }, [email, navigate]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Get pending registration data if registering
      let pendingData = {};
      if (purpose === 'REGISTER') {
        const pending = sessionStorage.getItem('rentrow_pending');
        if (pending) {
          pendingData = JSON.parse(pending);
        }
      }

      const res = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code: otp,
          purpose,
          name: pendingData.name,
          phone: pendingData.phone,
          role: pendingData.role || 'USER'
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      // Clear pending data
      sessionStorage.removeItem('rentrow_pending');
      
      // Save token and user data
      localStorage.setItem('rentrow_token', data.token);
      localStorage.setItem('rentrow_user', JSON.stringify(data.user));
      
      // Redirect to home
      navigate('/');
    } catch (err) {
      setError(err.message);
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resending || timeLeft > 540) return; // Only allow resend after 10 seconds
    
    setResending(true);
    setError(null);
    
    try {
      const res = await fetch(`${API_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to resend OTP');
      }
      
      // Reset timer to 10 minutes
      setTimeLeft(600);
      setResent(true);
      setOtp('');
      
      // Show success message
      if (data.dev_otp) {
        console.log('Development OTP:', data.dev_otp);
        alert(`Demo OTP: ${data.dev_otp}\nCheck console for more details.`);
      } else {
        alert('OTP resent successfully!');
      }
      
      setTimeout(() => setResent(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  if (!email) {
    return null;
  }

  const expired = timeLeft <= 0;
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const ss = String(timeLeft % 60).padStart(2, '0');

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
          <h1 className="auth-title">Verify Your Email</h1>
          <p className="auth-subtitle">
            We've sent a 6-digit code to<br />
            <strong style={{ color: 'var(--text-1)' }}>{email}</strong>
          </p>
        </div>

        {error && (
          <div className="form-error">
            <AlertCircle size={16} /> {error}
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

        <form onSubmit={handleVerify}>
          <div className="form-group">
            <label className="form-label" htmlFor="otp">Enter OTP</label>
            <input
              id="otp"
              type="text"
              className="form-input"
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              required
              autoFocus
              style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem', fontWeight: 600 }}
            />
          </div>

          {/* Timer */}
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            {expired ? (
              <span style={{ color: 'var(--red)', fontSize: '0.875rem' }}>Code expired. Please resend.</span>
            ) : (
              <span style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>
                Expires in <strong style={{ color: 'var(--text-2)' }}>{mm}:{ss}</strong>
              </span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            style={{ padding: '0.7rem', fontSize: '0.9375rem' }}
            disabled={loading || otp.length !== 6 || expired}
          >
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button
            onClick={handleResendOTP}
            disabled={resending || expired === false}
            style={{
              background: 'none',
              border: 'none',
              color: (resending || !expired) ? 'var(--text-3)' : 'var(--primary)',
              cursor: (resending || !expired) ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <RefreshCw size={14} className={resending ? 'spin' : ''} />
            {resending ? 'Sending...' : "Didn't receive code? Resend"}
          </button>
        </div>

        <div className="auth-footer" style={{ marginTop: '1rem' }}>
          <Link to={purpose === 'REGISTER' ? '/register' : '/login'}>
            ← Back to {purpose === 'REGISTER' ? 'Sign up' : 'Sign in'}
          </Link>
        </div>
      </div>
    </div>
  );
}
