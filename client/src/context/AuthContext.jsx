import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

export const TOKEN_STORAGE_KEY = 'cinema_token';
export const USER_STORAGE_KEY = 'cinema_user';
export const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AuthContext = createContext(null);

/**
 * Provider quản lý trạng thái đăng nhập (user, token) và đồng bộ qua localStorage.
 */
export function AuthProvider({ children }) {
  const [token, setToken] = useLocalStorage(TOKEN_STORAGE_KEY, null);
  const [user, setUser] = useLocalStorage(USER_STORAGE_KEY, null);
  const [loading, setLoading] = useState(Boolean(token));

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, [setToken, setUser]);

  const login = useCallback(
    (payloadOrToken, maybeUser) => {
      if (typeof payloadOrToken === 'object' && payloadOrToken !== null) {
        setToken(payloadOrToken.token || null);
        setUser(payloadOrToken.user || null);
      } else {
        setToken(payloadOrToken || null);
        setUser(maybeUser || null);
      }
    },
    [setToken, setUser]
  );

  const updateUser = useCallback(
    (nextUser) => {
      setUser((prev) => {
        if (typeof nextUser === 'function') {
          return nextUser(prev);
        }
        return nextUser;
      });
    },
    [setUser]
  );

  // Xác thực lại token khi F5 trang
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let isMounted = true;

    const verifySession = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        if (res.status === 401) {
          if (isMounted) logout();
          return;
        }

        if (res.ok) {
          const body = await res.json();
          const fetchedUser = body?.data?.user || body?.user;
          if (isMounted && fetchedUser) {
            setUser(fetchedUser);
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Không thể xác thực lại phiên đăng nhập:', err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    verifySession();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [token, logout, setUser]);

  // Lắng nghe sự kiện 401 từ axios interceptor để đăng xuất đồng bộ
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => {
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, [logout]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(token && user),
      isAdmin: user?.role === 'admin',
      login,
      logout,
      updateUser,
    }),
    [user, token, loading, login, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook truy cập AuthContext.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  }
  return context;
}

export default AuthContext;
