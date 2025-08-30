import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import './ResetPassword.css';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);

  // Verify token on component mount
  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
      setVerifying(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await fetch(`/api/auth/verify-reset-token/${token}`);
        const data = await response.json();

        if (response.ok && data.valid) {
          setTokenValid(true);
          setUser(data.user);
        } else {
          setError(data.error || 'Invalid or expired reset token');
        }
      } catch (err) {
        setError('Network error. Please try again.');
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const validatePassword = (password) => {
    if (!password || password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (password.length > 128) {
      return 'Password must be less than 128 characters';
    }
    return null;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPasswords(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { newPassword, confirmPassword } = passwords;

    // Validation
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="loading-spinner">⟳</div>
          <h2>Verifying Reset Link</h2>
          <p>Please wait while we verify your password reset link...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="error-icon">❌</div>
          <h2>Invalid Reset Link</h2>
          <p className="error-message">{error}</p>
          <div className="error-actions">
            <Link to="/request-password-reset" className="btn-primary">
              Request New Reset Link
            </Link>
            <Link to="/login" className="btn-secondary">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="success-icon">✅</div>
          <h2>Password Reset Successful!</h2>
          <p className="success-message">
            Your password has been reset successfully. You can now log in with your new password.
          </p>
          <div className="countdown-info">
            <p>You will be redirected to the login page in a few seconds...</p>
          </div>
          <Link to="/login" className="btn-primary">
            Go to Login Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-container">
      <div className="reset-password-card">
        <div className="reset-icon">🔐</div>
        <h2>Set New Password</h2>
        {user && (
          <p className="user-info">
            Setting new password for: <strong>{user.first_name}</strong> ({user.email})
          </p>
        )}

        <form onSubmit={handleSubmit} className="reset-password-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={passwords.newPassword}
              onChange={handleInputChange}
              placeholder="Enter your new password"
              disabled={loading}
              autoComplete="new-password"
              required
            />
            <small className="password-hint">
              Password must be at least 8 characters long
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={passwords.confirmPassword}
              onChange={handleInputChange}
              placeholder="Confirm your new password"
              disabled={loading}
              autoComplete="new-password"
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary"
            disabled={loading || !passwords.newPassword || !passwords.confirmPassword}
          >
            {loading ? 'Updating Password...' : 'Reset Password'}
          </button>
        </form>

        <div className="form-footer">
          <p>
            Remember your password? <Link to="/login">Back to Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;