// frontend/src/contexts/AuthContext.jsx

import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Debug: log when user state changes
  useEffect(() => {
    console.log('User state changed:', user);
  }, [user]);

  // Function to check current authentication status
  const checkAuth = async () => {
    try {
      console.log('Checking auth status...'); // Debug log
      const response = await fetch('/api/whoami', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        console.log('Auth check successful:', data.user); // Debug log
        setUser(data.user);
        return data.user;
      } else {
        console.log('Auth check failed'); // Debug log
        setUser(null);
        return null;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Function to handle login
  const login = async (credentials) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Login response:', data); // Debug log
        
        // If login API doesn't return user data, fetch it separately
        if (data.user) {
          console.log('Setting user from login response:', data.user);
          setUser(data.user);
          return { success: true, user: data.user };
        } else {
          // Login succeeded but no user data, fetch it
          console.log('Login succeeded, fetching user data...');
          await checkAuth();
          return { success: true };
        }
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  // Function to handle logout
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
  };

  // Check auth status on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const value = {
    user,
    loading,
    login,
    logout,
    checkAuth,
    refreshAuth: checkAuth // Alias for forcing auth refresh
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};