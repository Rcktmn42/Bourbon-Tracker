// frontend/src/pages/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import './Login.css';

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState(''); // Track error type for different styling
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
    // Clear errors when user starts typing
    setError('');
    setErrorType('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrorType('');
    setIsLoading(true);

    try {
      const payload = {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      };

      // Expecting login() to return { success: boolean, error?: string }
      const result = await login(payload);

      if (!result?.success) {
        const errorMessage = result?.error || 'Login failed. Please check your credentials.';
        setError(errorMessage);
        
        // Set error type based on message content for different styling
        if (errorMessage.includes('pending approval')) {
          setErrorType('pending');
        } else if (errorMessage.includes('disabled')) {
          setErrorType('disabled');
        } else {
          setErrorType('credentials');
        }
        return;
      }

      // Success: force navigation right away (in case context propagation is delayed)
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });

    } catch (err) {
      console.error('Login error:', err);
      setError('Network or server error. Please try again.');
      setErrorType('network');
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

        {/* Enhanced error display with different types */}
        {error && (
          <div className={`login-error ${errorType}`}>
            <div className="error-message">{error}</div>
            {errorType === 'pending' && (
              <div className="error-help">
                <p>💡 <strong>What's next?</strong></p>
                <ul>
                  <li>Check your email for a welcome message</li>
                  <li>You'll receive another email when approved</li>
                  <li>Approval typically takes 24-48 hours</li>
                </ul>
              </div>
            )}
            {errorType === 'disabled' && (
              <div className="error-help">
                <p>💡 <strong>Need help?</strong></p>
                <p>Contact our support team for assistance with your account.</p>
              </div>
            )}
            {errorType === 'credentials' && (
              <div className="error-help">
                <p>💡 <strong>Having trouble?</strong></p>
                <ul>
                  <li>Double-check your email and password</li>
                  <li>Make sure Caps Lock is off</li>
                  <li>Try typing your password in a text editor first</li>
                </ul>
              </div>
            )}
          </div>
        )}

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

        {/* Additional helpful links */}
        <div className="login-footer">
          <p>Don't have an account? <a href="/register" onClick={(e) => { e.preventDefault(); navigate('/register'); }}>Create one here</a></p>
        </div>
      </form>
    </div>
  );
}