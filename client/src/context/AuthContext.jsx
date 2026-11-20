import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { getToken, setToken, removeToken } from '../api/client';

const AuthContext = createContext(null);

const ROLE_HIERARCHY = ['INSPECTOR', 'SUPERVISOR', 'ADMIN'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(() => getToken());
  const [loading, setLoading] = useState(true);

  // Restore user from /api/auth/me if a token exists in localStorage on startup
  useEffect(() => {
    let isMounted = true;
    const storedToken = getToken();

    if (!storedToken) {
      setLoading(false);
      return;
    }

    api
      .get('/auth/me')
      .then((res) => {
        if (isMounted) {
          setUser(res.data?.data || null);
          setTokenState(storedToken);
        }
      })
      .catch(() => {
        if (isMounted) {
          removeToken();
          setTokenState(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: receivedToken, user: receivedUser } = res.data.data;
    setToken(receivedToken);
    setTokenState(receivedToken);
    setUser(receivedUser);
    return receivedUser;
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setTokenState(null);
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (minRole) => {
      if (!user || !user.app_role) return false;
      if (!minRole) return true;
      const have = ROLE_HIERARCHY.indexOf(user.app_role);
      const need = ROLE_HIERARCHY.indexOf(minRole);
      return have !== -1 && have >= need;
    },
    [user]
  );

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    hasRole,
    isAuthenticated: Boolean(user && token),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
