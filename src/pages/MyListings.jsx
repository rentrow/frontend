import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Home, Clock, CheckCircle2, XCircle, Trash2,
  BookmarkCheck, AlertCircle, PlusCircle, RefreshCw,
} from 'lucide-react';
import { TYPE_LABEL, TYPE_EMOJI } from '../constants/propertyTypes';

const STATUS_CONFIG = {
  ACTIVE          : { label: 'Active',          color: 'var(--green)',   bg: 'var(--green-subtle)',  icon: <CheckCircle2 size={13}/> },
  PENDING_PAYMENT : { label: 'Awaiting Payment', color: 'var(--amber)',   bg: 'rgba(245,158,11,0.1)', icon: <Clock size={13}/>        },
  BOOKED          : { label: 'Booked',           color: 'var(--primary)', bg: 'var(--primary-subtle)',icon: <BookmarkCheck size={13}/> },
  EXPIRED         : { label: 'Expired',          color: 'var(--text-3)', bg: 'var(--surface-3)',     icon: <XCircle size={13}/>      },
};

function daysLeft(expiresAt) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt) - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MyListings() {
  const { user }             = useAuth();
  const navigate             = useNavigate();
  const token                = localStorage.getItem('rentrow_token');
  const [listings, setListings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [busyId,   setBusyId]   = useState(null);

  const fetch_ = () => {
    setLoading(true);
    fetch('http://localhost:5000/api/my-listings', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setListings(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'LANDLORD') { navigate('/'); return; }
    fetch_();
  }, [user]);

  const action = async (id, endpoint, method = 'POST') => {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`http://localhost:5000/api/properties/${id}${endpoint}`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      fetch_();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const markBooked  = (id) => action(id, '/book');
  const deleteListing = (id) => {
    if (!confirm('Delete this listing permanently?')) return;
    action(id, '', 'DELETE');
  };

  const counts = {
    active  : listings.filter(l => l.status === 'ACTIVE').length,
    pending : listings.filter(l => l.status === 'PENDING_PAYMENT').length,
    booked  : listings.filter(l => l.status === 'BOOKED').length,
    expired : listings.filter(l => l.status === 'EXPIRED').length,
  };

  return (
    <div className="container py-8 animate-fade-up">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>My Listings</h1>
          <p className="text-muted text-sm mt-1">{listings.length} total propert{listings.length !== 1 ? 'ies' : 'y'}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-outline btn-sm" onClick={fetch_} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/post-ad')}>
            <PlusCircle size={14} /> New Ad
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
        {Object.entries(counts).map(([k, v]) => (
          <div key={k} className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{v}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', textTransform: 'capitalize', marginTop: '0.25rem' }}>{k}</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="form-error" style={{ marginBottom: '1rem' }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Listings */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card" style={{ padding: '1.25rem', opacity: 0.4, display: 'flex', gap: '1rem' }}>
              <div style={{ width: 80, height: 80, background: 'var(--surface-3)', borderRadius: 'var(--radius-md)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 14, background: 'var(--surface-3)', borderRadius: 4, marginBottom: 8 }} />
                <div style={{ height: 11, width: '60%', background: 'var(--surface-3)', borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="empty-state">
          <Home size={40} style={{ margin: '0 auto 1rem', color: 'var(--border)' }} />
          <div className="empty-state-title">No listings yet</div>
          <button className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }} onClick={() => navigate('/post-ad')}>
            Post Your First Ad
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {listings.map(l => {
            const sc    = STATUS_CONFIG[l.status] || STATUS_CONFIG.EXPIRED;
            const days  = daysLeft(l.expiresAt);
            const cover = l.images?.[0] || 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=200&q=60';
            const busy  = busyId === l.id;

            return (
              <div key={l.id} className="card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <img src={cover} alt="" style={{ width: 80, height: 80, borderRadius: 'var(--radius-md)', objectFit: 'cover', flexShrink: 0 }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Title + status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.375rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.3 }}>{l.title}</div>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                      padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)',
                      fontSize: '0.6875rem', fontWeight: 700,
                      color: sc.color, background: sc.bg, flexShrink: 0,
                    }}>
                      {sc.icon} {sc.label}
                    </span>
                  </div>

                  {/* Type + Price */}
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.375rem' }}>
                    <span className="text-sm text-muted">{TYPE_EMOJI[l.type]} {TYPE_LABEL[l.type] || l.type}</span>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>₹{l.price?.toLocaleString('en-IN')}/mo</span>
                  </div>

                  {/* Address + expiry */}
                  <div className="text-sm text-faint" style={{ marginBottom: '0.75rem' }}>
                    {l.locality && <span>{l.locality} · </span>}
                    {l.address}
                    {l.status === 'ACTIVE' && days !== null && (
                      <span style={{ marginLeft: '0.75rem', color: days < 5 ? 'var(--red)' : 'var(--text-3)' }}>
                        · {days}d left (expires {formatDate(l.expiresAt)})
                      </span>
                    )}
                    {l.status === 'BOOKED' && l.bookedAt && (
                      <span style={{ marginLeft: '0.75rem' }}>· Booked on {formatDate(l.bookedAt)}</span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {l.status === 'ACTIVE' && (
                      <button
                        className="btn btn-sm"
                        disabled={busy}
                        onClick={() => markBooked(l.id)}
                        style={{
                          background: 'var(--primary-subtle)', color: 'var(--primary-hover)',
                          border: '1px solid rgba(99,102,241,0.25)',
                        }}
                      >
                        <BookmarkCheck size={14} /> {busy ? 'Updating…' : 'Mark as Booked'}
                      </button>
                    )}
                    {l.status === 'PENDING_PAYMENT' && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => navigate('/post-ad')}
                      >
                        Complete Payment ₹5
                      </button>
                    )}
                    {(l.status === 'ACTIVE' || l.status === 'PENDING_PAYMENT' || l.status === 'EXPIRED' || l.status === 'BOOKED') && (
                      <button
                        className="btn btn-sm btn-danger"
                        disabled={busy}
                        onClick={() => deleteListing(l.id)}
                      >
                        <Trash2 size={13} /> {busy ? '…' : 'Delete'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
