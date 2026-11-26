import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from './api';

const AuthContext = createContext(null);

export const ROLE_HOME = {
  athlete: '/app/athlete',
  coach: '/app/coach',
  scout: '/app/scout',
  club_admin: '/app/club',
  organizer: '/app/organizer',
  super_admin: '/app/admin',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('gsc_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api.get('/auth/me')
      .then((res) => setUser(res.data.data))
      .catch(() => localStorage.removeItem('gsc_token'))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    async login(email, password) {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('gsc_token', res.data.data.token);
      setUser(res.data.data.user);
      return res.data.data.user;
    },
    async register(payload) {
      const res = await api.post('/auth/register', payload);
      localStorage.setItem('gsc_token', res.data.data.token);
      setUser(res.data.data.user);
      return res.data.data.user;
    },
    async logout() {
      try { await api.post('/auth/logout'); } catch { /* token may already be expired */ }
      localStorage.removeItem('gsc_token');
      setUser(null);
    },
    setUser,
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
