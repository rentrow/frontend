import { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  /* ── Rehydrate session on mount ── */
  useEffect(() => {
    try {
      const storedUser  = localStorage.getItem('rentrow_user');
      const storedToken = localStorage.getItem('rentrow_token');

      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
      }
    } catch {
      // Corrupted storage — wipe it and start fresh
      localStorage.removeItem('rentrow_user');
      localStorage.removeItem('rentrow_token');
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── login — returns a Promise so callers can `await login(...)` ── */
  const login = (userData, token) => {
    return new Promise((resolve) => {
      localStorage.setItem('rentrow_token', token);
      localStorage.setItem('rentrow_user', JSON.stringify(userData));
      setUser(userData);          // React batches this; Promise lets Login.jsx
      resolve();                  // sequence navigate() AFTER this resolves
    });
  };

  /* ── logout ── */
  const logout = () => {
    localStorage.removeItem('rentrow_token');
    localStorage.removeItem('rentrow_user');
    setUser(null);
  };

  /* ── Convenience helpers ── */
  const getToken    = () => localStorage.getItem('rentrow_token');
  const isLoggedIn  = Boolean(user);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, getToken, isLoggedIn }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
