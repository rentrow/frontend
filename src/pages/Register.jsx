import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://backend-sfrm.onrender.com';

export default function Verify() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get email and purpose from URL params
  const params = new URLSearchParams(location.search);
  const email = params.get('email');
  const purpose = params.get('purpose'); // 'REGISTER' or 'LOGIN'

  // Redirect if no email
  useEffect(() => {
    if (!email) {
      navigate('/register');
    }
  }, [email, navigate]);

  // Countdown for resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerify = async (e) => {
    e.preventDefault();
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
          role: pendingData.role
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
      
      // Redirect based on purpose
      if (purpose === 'REGISTER') {
        navigate('/');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    
    setLoading(true);
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
      
      // Show success message
      setCountdown(60);
      
      // In development, show OTP in console
      if (data.dev_otp) {
        console.log('Development OTP:', data.dev_otp);
        alert(`Demo OTP: ${data.dev_otp} (check console)`);
      } else {
        alert('OTP resent successfully!');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return null;
  }

  return (
    <div className="auth-page">
      <div className="auth-card animate-scale-in">
        <div className="auth-header">
          <h1 className="auth-title">Verify Your Email</h1>
          <p className="auth-subtitle">
            We've sent a 6-digit code to<br />
            <strong>{email}</strong>
          </p>
        </div>

        {error && (
          <div className="form-error">
            <AlertCircle size={16} /> {error}
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
              style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.25rem' }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            style={{ padding: '0.7rem', fontSize: '0.9375rem' }}
            disabled={loading || otp.length !== 6}
          >
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button
            onClick={handleResendOTP}
            disabled={countdown > 0 || loading}
            style={{
              background: 'none',
              border: 'none',
              color: countdown > 0 ? 'var(--text-3)' : 'var(--primary)',
              cursor: countdown > 0 ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
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
