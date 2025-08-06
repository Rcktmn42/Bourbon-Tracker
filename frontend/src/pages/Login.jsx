// frontend/src/pages/Login.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { user, login, refreshAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If user is already logged in, redirect them
  useEffect(() => {
    if (user) {
      // Redirect to the page they were trying to access, or home
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    console.log('Attempting login...'); // Debug log

    const result = await login(formData);

    console.log('Login result:', result); // Debug log

    if (result.success) {
      // Force refresh the auth state to ensure UI updates
      console.log('Refreshing auth state...');
      const updatedUser = await refreshAuth();
      console.log('Updated user after refresh:', updatedUser);
      
      // Determine where to redirect based on user role
      const currentUser = result.user || updatedUser;
      let redirectPath = '/';
      
      // If user is admin or power_user and was trying to access admin, allow it
      const from = location.state?.from?.pathname;
      if (from === '/admin' && currentUser && (currentUser.role === 'admin' || currentUser.role === 'power_user')) {
        redirectPath = '/admin';
      }
      
      console.log('Final redirect path:', redirectPath); // Debug log
      
      // Small delay to ensure state has propagated
      setTimeout(() => {
        navigate(redirectPath, { replace: true });
      }, 50);
      
    } else {
      setError(result.error || 'Login failed');
    }

    setIsLoading(false);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Don't render login form if user is already logged in
  if (user) {
    return <p>Redirecting...</p>;
  }

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
      <h2>Login</h2>
      {error && (
        <div style={{ color: 'red', marginBottom: '1rem' }}>
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '0.5rem' }}
          />
        </div>
        <button 
          type="submit" 
          disabled={isLoading}
          style={{ 
            width: '100%', 
            padding: '0.75rem',
            backgroundColor: isLoading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}