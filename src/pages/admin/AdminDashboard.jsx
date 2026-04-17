import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Shield, Users, Home as HomeIcon, CreditCard, Activity, RefreshCw } from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const token = localStorage.getItem('rentrow_token');

  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ usersCount: 0, propertiesCount: 0, activeProperties: 0, revenue: 0 });
  const [users, setUsers] = useState([]);
  const [properties, setProperties] = useState([]);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      navigate('/');
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const hdrs = { Authorization: `Bearer ${token}` };
      const [stRes, usRes, prRes, txRes] = await Promise.all([
        fetch('http://localhost:5000/api/admin/dashboard', { headers: hdrs }),
        fetch('http://localhost:5000/api/admin/users', { headers: hdrs }),
        fetch('http://localhost:5000/api/admin/properties', { headers: hdrs }),
        fetch('http://localhost:5000/api/admin/transactions', { headers: hdrs }),
      ]);
      setStats(await stRes.json());
      setUsers(await usRes.json());
      setProperties(await prRes.json());
      setTransactions(await txRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="container py-8 animate-fade-up">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield style={{ color: 'var(--primary)' }} /> Admin Dashboard
          </h1>
          <p className="text-muted text-sm mt-1">Manage users, listings, and monitor platform activity.</p>
        </div>
        <button onClick={fetchData} className="btn btn-outline btn-sm" disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh Data
        </button>
      </div>

      <div style={{ display: 'flex', gap: '2rem', flexDirection: 'column' }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
          {[
            { id: 'overview', icon: Activity, label: 'Overview' },
            { id: 'users', icon: Users, label: 'Users' },
            { id: 'properties', icon: HomeIcon, label: 'Listings' },
            { id: 'transactions', icon: CreditCard, label: 'Transactions' },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)',
                background: activeTab === id ? 'var(--primary)' : 'transparent',
                color: activeTab === id ? '#fff' : 'var(--text-2)',
                border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem'
              }}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>Loading data...</div>
        ) : (
          <div>
            {activeTab === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                <StatCard label="Total Users" value={stats.usersCount} />
                <StatCard label="Total Properties" value={stats.propertiesCount} />
                <StatCard label="Active Listings" value={stats.activeProperties} color="var(--green)" />
                <StatCard label="Platform Revenue" value={`₹${stats.revenue}`} color="var(--primary)" />
              </div>
            )}

            {activeTab === 'users' && (
              <div className="card" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', width: '60px' }}>ID</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Name</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Email</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Role</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem' }}>#{u.id}</td>
                        <td style={{ padding: '0.75rem', fontWeight: 600 }}>{u.name}</td>
                        <td style={{ padding: '0.75rem' }}>{u.email}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span className={`badge ${u.role === 'ADMIN' ? 'badge-primary' : ''}`}>{u.role}</span>
                        </td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-3)' }}>
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'properties' && (
              <div className="card" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', width: '60px' }}>ID</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Title</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Owner</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Status</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {properties.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem' }}>#{p.id}</td>
                        <td style={{ padding: '0.75rem', fontWeight: 600 }}>{p.title}</td>
                        <td style={{ padding: '0.75rem' }}>{p.owner?.name}</td>
                        <td style={{ padding: '0.75rem' }}>{p.status}</td>
                        <td style={{ padding: '0.75rem' }}>₹{p.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'transactions' && (
              <div className="card" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', width: '60px' }}>ID</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Prop ID</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Amount</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Razorpay Order</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(t => (
                      <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem' }}>#{t.id}</td>
                        <td style={{ padding: '0.75rem' }}>#{t.propertyId}</td>
                        <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--green)' }}>₹{t.amount}</td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-3)', fontFamily: 'monospace' }}>
                          {t.razorpayOrderId || 'N/A'}
                        </td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-3)' }}>
                          {new Date(t.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color = 'var(--text-1)' }) {
  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div style={{ fontSize: '0.875rem', color: 'var(--text-3)', marginBottom: '0.5rem', fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 800, color }}>
        {value}
      </div>
    </div>
  );
}
