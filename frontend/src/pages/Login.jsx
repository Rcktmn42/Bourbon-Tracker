// frontend/src/pages/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import './Login.css';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If already logged in, bounce away
  useEffect(() => {
    if (user) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const payload = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      };

      // Expecting login() to return { success: boolean, error?: string }
      const result = await login(payload);

      if (!result?.success) {
        setError(result?.error || 'Login failed. Please check your credentials.');
        return;
      }

      // Success: force navigation right away (in case context propagation is delayed)
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });

    } catch (err) {
      console.error('Login error:', err);
      setError('Network or server error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Avoid rendering the form when we know we're logged in
  if (user) return null;

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <h2>Login</h2>

        {error && <div className="login-error">{error}</div>}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          className="login-input"
          value={formData.email}
          onChange={handleChange}
          autoComplete="email"
          required
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          className="login-input"
          value={formData.password}
          onChange={handleChange}
          autoComplete="current-password"
          required
        />

        <button
          type="submit"
          className="login-button"
          disabled={isLoading}
          aria-busy={isLoading ? 'true' : 'false'}
        >
          {isLoading ? 'Logging in…' : 'Log In'}
        </button>
      </form>
    </div>
  );
}
