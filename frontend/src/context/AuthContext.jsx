import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { TOKEN_KEY } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        if (active) setLoading(false);
        return;
      }

      try {
        const { data } = await api.get('/auth/me');
        if (active) setUser(data?.user || null);
      } catch {
        if (active) {
          localStorage.removeItem(TOKEN_KEY);
          setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    bootstrap();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => setUser(null);
    window.addEventListener('blogsphere:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('blogsphere:unauthorized', handleUnauthorized);
  }, []);

  const login = useCallback(async (credentials) => {
    const { data } = await api.post('/auth/login', credentials);
    if (data?.token) localStorage.setItem(TOKEN_KEY, data.token);
    if (data?.user) setUser(data.user);
    return data;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    if (data?.token) localStorage.setItem(TOKEN_KEY, data.token);
    if (data?.user) setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      if (localStorage.getItem(TOKEN_KEY)) await api.post('/auth/logout');
    } catch {
      // A stale/revoked token should never prevent local sign-out.
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    setUser(data?.user || null);
    return data?.user || null;
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const { data } = await api.put('/auth/profile', payload);
    if (data?.user) setUser(data.user);
    return data;
  }, []);

  const changePassword = useCallback(async (payload) => api.put('/auth/password', payload).then((res) => res.data), []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
      login,
      register,
      logout,
      refreshUser,
      updateProfile,
      changePassword,
    }),
    [user, loading, login, register, logout, refreshUser, updateProfile, changePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider');
  return context;
}

export default AuthContext;
