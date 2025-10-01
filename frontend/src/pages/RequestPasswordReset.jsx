import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import apiFetch from '../utils/api';
import './RequestPasswordReset.css';

function RequestPasswordReset() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (!email.trim()) {
      setError('Email address is required');
      setLoading(false);
      return;
    }

    try {
      const response = await apiFetch('/api/auth/request-password-reset', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setSubmitted(true);
      } else {
        setError(data.error || 'Failed to send reset email');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="request-reset-container">
        <div className="request-reset-card">
          <div className="success-icon">📧</div>
          <h2>Check Your Email</h2>
          <p className="success-message">{message}</p>
          <div className="reset-info">
            <ul>
              <li>Check your email inbox for a password reset link</li>
              <li>The link will expire in 1 hour for security</li>
              <li>Don't see the email? Check your spam folder</li>
              <li>If you still don't receive it, the email may not be registered</li>
            </ul>
          </div>
          <div className="form-actions">
            <Link to="/login" className="btn-secondary">
              Back to Login
            </Link>
            <button 
              type="button"
              className="btn-primary"
              onClick={() => {
                setSubmitted(false);
                setEmail('');
                setMessage('');
              }}
            >
              Try Different Email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="request-reset-container">
      <div className="request-reset-card">
        <div className="reset-icon">🔐</div>
        <h2>Reset Your Password</h2>
        <p className="reset-description">
          Enter your email address and we'll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit} className="request-reset-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              disabled={loading}
              autoComplete="email"
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="form-footer">
          <p>
            Remember your password? <Link to="/login">Back to Login</Link>
          </p>
          <p>
            Don't have an account? <Link to="/register">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RequestPasswordReset;