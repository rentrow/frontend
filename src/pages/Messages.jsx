import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, MapPin, Clock, ChevronRight, Inbox } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const FALLBACK = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=200&q=60';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Messages() {
  const { user }                = useAuth();
  const [threads,  setThreads]  = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('rentrow_token');
    fetch('https://backend-sfrm.onrender.com/api/messages/inbox', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setThreads(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-card animate-scale-in" style={{ textAlign: 'center' }}>
          <MessageSquare size={40} style={{ color: 'var(--primary)', margin: '0 auto 1rem' }} />
          <h2 className="auth-title">Sign in to view messages</h2>
          <Link to="/login" className="btn btn-primary" style={{ marginTop: '1rem' }}>Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 animate-fade-up" style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
          Messages
        </h1>
        <p className="text-muted text-sm mt-1">
          {threads.length} conversation{threads.length !== 1 ? 's' : ''}
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card" style={{ padding: '1rem', opacity: 0.45, display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', background: 'var(--surface-3)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 14, background: 'var(--surface-3)', borderRadius: 4, marginBottom: 8 }} />
                <div style={{ height: 11, width: '60%', background: 'var(--surface-3)', borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      ) : threads.length === 0 ? (
        <div className="empty-state">
          <Inbox size={40} style={{ margin: '0 auto 1rem', color: 'var(--border)' }} />
          <div className="empty-state-title">No conversations yet</div>
          <p className="text-sm mt-1">Contact a landlord from a property listing to start chatting.</p>
          <Link to="/" className="btn btn-outline btn-sm" style={{ marginTop: '1rem' }}>Browse Listings</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {threads.map(t => (
            <Link
              key={t.propertyId}
              to={`/messages/${t.propertyId}`}
              style={{ textDecoration: 'none' }}
            >
              <div className="card" style={{
                padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}>
                {/* Cover image */}
                <img
                  src={t.coverImage || FALLBACK}
                  alt=""
                  style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', objectFit: 'cover', flexShrink: 0 }}
                />

                {/* Thread info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.2rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.propertyTitle}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', flexShrink: 0, marginLeft: '0.5rem' }}>
                      {timeAgo(t.lastAt)}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)', marginBottom: '0.25rem' }}>
                    {t.otherUser?.name}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{
                      fontSize: '0.8125rem', color: 'var(--text-2)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      maxWidth: '80%',
                    }}>
                      {t.lastMessage}
                    </p>
                    {t.unreadCount > 0 && (
                      <span style={{
                        background: 'var(--primary)', color: '#fff',
                        borderRadius: 'var(--radius-full)', fontSize: '0.6875rem',
                        fontWeight: 700, padding: '0.15rem 0.45rem', flexShrink: 0,
                      }}>
                        {t.unreadCount}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight size={16} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
