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

const ROLE_PREFIXES = {
  athlete: ['/app/athlete', '/app/teams'],
  coach: ['/app/coach', '/app/teams'],
  scout: ['/app/scout', '/app/organizer/opportunities', '/app/opportunities'],
  club_admin: ['/app/club', '/app/teams', '/app/organizer/opportunities', '/app/opportunities'],
  organizer: ['/app/organizer', '/app/tournaments', '/app/opportunities'],
  super_admin: ['/app'],
};

export function canOpen(role, pathname) {
  if (!role || !pathname?.startsWith('/app')) return false;
  if (pathname === '/app' || pathname.startsWith('/app/account') || pathname.startsWith('/app/notifications')) return true;
  return (ROLE_PREFIXES[role] || []).some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

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
      const session = res.data?.data;
      if (!session?.token || !session?.user) {
        throw new Error('Sign in did not start a session. Try again.');
      }
      localStorage.setItem('gsc_token', session.token);
      setUser(session.user);
      return session.user;
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
