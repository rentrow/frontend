import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Home, PlusCircle, LogOut, User, MessageSquare, LayoutList, Shield } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const location         = useLocation();
  const token            = localStorage.getItem('rentrow_token');
  const [unread, setUnread] = useState(0);

  /* Poll unread count every 15s */
  useEffect(() => {
    if (!user || !token) return;
    const check = () => {
      fetch('http://localhost:5000/api/messages/unread-count', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.json())
        .then(d => setUnread(d.count || 0))
        .catch(() => {});
    };
    check();
    const id = setInterval(check, 15000);
    return () => clearInterval(id);
  }, [user, token]);

  const handleLogout = () => { logout(); navigate('/login'); };
  const is = (p) => location.pathname === p;

  return (
    <header className="navbar">
      <div className="container">
        {/* Brand */}
        <Link to="/" className="nav-brand" style={{ textDecoration: 'none' }}>
          <Home size={20} style={{ color: 'var(--primary)' }} />
          RentRow<span className="brand-dot" />
        </Link>

        {/* Actions */}
        <nav className="nav-actions">
          {user ? (
            <>
              {/* Messages */}
              <Link to="/messages" style={{ position: 'relative', textDecoration: 'none' }}>
                <button className={`btn btn-sm ${is('/messages') ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '0.4rem 0.65rem' }}>
                  <MessageSquare size={16} />
                  {unread > 0 && (
                    <span style={{
                      position: 'absolute', top: -4, right: -4,
                      background: 'var(--red)', color: '#fff',
                      fontSize: '0.6rem', fontWeight: 700,
                      width: 16, height: 16, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{unread > 9 ? '9+' : unread}</span>
                  )}
                </button>
              </Link>

              {/* Admin Panel */}
              {user.role === 'ADMIN' && (
                <Link to="/admin" className={`btn btn-sm ${is('/admin') ? 'btn-primary' : 'btn-ghost'}`}>
                  <Shield size={15} />
                  <span className="hide-mobile">Dashboard</span>
                </Link>
              )}

              {/* Landlord links */}
              {user.role === 'LANDLORD' && (
                <>
                  <Link to="/my-listings" className={`btn btn-sm ${is('/my-listings') ? 'btn-primary' : 'btn-ghost'}`}>
                    <LayoutList size={15} />
                    <span className="hide-mobile">My Listings</span>
                  </Link>
                  <Link to="/post-ad" className={`btn btn-sm ${is('/post-ad') ? 'btn-primary' : 'btn-outline'}`}>
                    <PlusCircle size={15} />
                    <span className="hide-mobile">Post Ad</span>
                  </Link>
                </>
              )}

              {/* User chip */}
              <div className="nav-user-chip">
                <User size={13} style={{ color: 'var(--primary)' }} />
                <span className="hide-mobile">{user.name}</span>
              </div>

              {/* Logout */}
              <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ padding: '0.4rem 0.6rem' }} title="Logout">
                <LogOut size={15} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login"    className="btn btn-ghost btn-sm">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
