// frontend/src/contexts/AuthContext.jsx

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/whoami', { credentials: 'include' });
      if (!response.ok) {
        setUser(null);
        return null;
      }
      // Backend returns the user object directly, not { user: ... }
      const data = await response.json();
      setUser(data);
      return data;
    } catch (err) {
      console.error('checkAuth error:', err);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        let errText = 'Login failed';
        try {
          const errJson = await response.json();
          // Backend uses { error: "..." }, not { message: "..." }
          errText = errJson.error || errJson.message || errText;
        } catch {
          /* ignore JSON parse errors */
        }
        return { success: false, error: errText };
      }

      // Successful login sets the cookie; now fetch the user
      const who = await checkAuth();
      if (who) return { success: true, user: who };
      // If we got here, cookie set but whoami failed—surface a helpful message
      return { success: false, error: 'Logged in, but could not load user profile.' };
    } catch (err) {
      console.error('login error:', err);
      return { success: false, error: 'Network error' };
    }
  }, [checkAuth]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.error('logout error:', err);
    } finally {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const value = { user, loading, login, logout, checkAuth, refreshAuth: checkAuth };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};