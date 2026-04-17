import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Send, ShieldAlert } from 'lucide-react';

// Use environment variable or fallback to Render backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://backend-sfrm.onrender.com';

const FALLBACK = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=200&q=60';

function formatTime(d) {
  return new Date(d).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, day: 'numeric', month: 'short' });
}

export default function Thread() {
  const { propertyId } = useParams();
  const { user }       = useAuth();
  const navigate       = useNavigate();
  const token          = localStorage.getItem('rentrow_token');

  const [messages,  setMessages]  = useState([]);
  const [property,  setProperty]  = useState(null);
  const [body,      setBody]      = useState('');
  const [sending,   setSending]   = useState(false);
  const [loading,   setLoading]   = useState(true);
  const bottomRef  = useRef(null);

  const fetchThread = async () => {
    // CHANGED: Use API_BASE_URL instead of localhost
    const r = await fetch(`${API_BASE_URL}/api/messages/${propertyId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const d = await r.json();
    if (Array.isArray(d)) setMessages(d);
  };

  useEffect(() => {
    if (!user) return;
    // Fetch property info
    // CHANGED: Use API_BASE_URL instead of localhost
    fetch(`${API_BASE_URL}/api/properties`)
      .then(r => r.json())
      .then(list => {
        const p = list.find(x => x.id === parseInt(propertyId));
        setProperty(p || null);
      });

    fetchThread().then(() => setLoading(false));

    // Poll for new messages every 8 seconds
    const interval = setInterval(fetchThread, 8000);
    return () => clearInterval(interval);
  }, [propertyId, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!body.trim() || sending) return;

    // Determine receiver (the other party)
    const receiverId = property?.owner?.id;
    if (!receiverId) return;

    setSending(true);
    try {
      // CHANGED: Use API_BASE_URL instead of localhost
      const res = await fetch(`${API_BASE_URL}/api/messages`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body   : JSON.stringify({ propertyId: parseInt(propertyId), receiverId, body }),
      });
      const msg = await res.json();
      if (res.ok) {
        setMessages(prev => [...prev, msg]);
        setBody('');
      }
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-card animate-scale-in" style={{ textAlign: 'center' }}>
          <h2 className="auth-title">Sign in to view messages</h2>
          <Link to="/login" className="btn btn-primary" style={{ marginTop: '1rem' }}>Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--nav-height))', maxWidth: 700, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{
        padding: '1rem 1.5rem',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-1)',
        display: 'flex', alignItems: 'center', gap: '1rem',
        flexShrink: 0,
      }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/messages')} style={{ padding: '0.4rem' }}>
          <ArrowLeft size={18} />
        </button>
        {property && (
          <>
            <img
              src={property.images?.[0] || FALLBACK}
              alt=""
              style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', objectFit: 'cover' }}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{property.title}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>{property.address?.split(',')[0]}</div>
            </div>
          </>
        )}
      </div>

      {/* ── Anti-fraud warning ── */}
      <div style={{
        background: 'rgba(245,158,11,0.1)',
        border: '1px solid rgba(245,158,11,0.3)',
        borderLeft: '3px solid var(--amber)',
        padding: '0.75rem 1.25rem',
        display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
        flexShrink: 0, fontSize: '0.8125rem',
      }}>
        <ShieldAlert size={17} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }} />
        <div>
          <strong style={{ color: 'var(--amber)' }}>Safety Reminder:</strong>
          <span style={{ color: 'var(--text-2)', marginLeft: '0.375rem' }}>
            Never pay rent or deposit <strong>before visiting the property in person</strong>. RentRow does not handle transactions between tenants and landlords — beware of advance-payment fraud.
          </span>
        </div>
      </div>

      {/* ── Thread ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }} className="hide-scrollbar">
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-3)', paddingTop: '4rem' }}>Loading…</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-3)', paddingTop: '4rem' }}>
            <p>No messages yet.</p>
            <p className="text-sm mt-1">Send a message to start the conversation.</p>
          </div>
        ) : (
          messages.map(m => {
            const mine = m.senderId === user.id || m.sender?.id === user.id;
            return (
              <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: '0.875rem' }}>
                <div style={{
                  maxWidth: '72%',
                  background: mine ? 'var(--primary)' : 'var(--surface-2)',
                  color: mine ? '#fff' : 'var(--text-1)',
                  padding: '0.625rem 0.875rem',
                  borderRadius: mine
                    ? 'var(--radius-lg) var(--radius-lg) var(--radius-sm) var(--radius-lg)'
                    : 'var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-sm)',
                  border: mine ? 'none' : '1px solid var(--border)',
                }}>
                  {!mine && (
                    <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--primary-hover)', marginBottom: '0.25rem' }}>
                      {m.sender?.name}
                    </div>
                  )}
                  <p style={{ fontSize: '0.9375rem', lineHeight: 1.5 }}>{m.body}</p>
                  <div style={{ fontSize: '0.6875rem', marginTop: '0.25rem', opacity: 0.65, textAlign: 'right' }}>
                    {formatTime(m.createdAt)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <form onSubmit={send} style={{
        padding: '1rem 1.5rem',
        borderTop: '1px solid var(--border)',
        background: 'var(--surface-1)',
        display: 'flex', gap: '0.75rem', alignItems: 'flex-end',
        flexShrink: 0,
      }}>
        <textarea
          className="form-input"
          rows={1}
          placeholder="Type a message…"
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); } }}
          style={{ flex: 1, resize: 'none', minHeight: '42px', maxHeight: '120px' }}
        />
        <button
          type="submit"
          className="btn btn-primary"
          style={{ padding: '0.6rem 1rem', flexShrink: 0 }}
          disabled={!body.trim() || sending}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
