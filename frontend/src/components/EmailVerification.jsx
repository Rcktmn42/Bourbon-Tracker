// frontend/src/components/EmailVerification.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './EmailVerification.css';

export default function EmailVerification() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(3);

  const navigate = useNavigate();
  const location = useLocation();

  // Get email from navigation state or redirect to register
  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    } else {
      navigate('/register');
    }
  }, [location.state, navigate]);

  // Handle resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Handle code input change
  const handleCodeChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      if (nextInput) nextInput.focus();
    }

    // Clear error when user starts typing
    if (error) setError('');
  };

  // Handle backspace
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  // Handle paste
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedText.length === 6) {
      setCode(pastedText.split(''));
    }
  };

  // Verify email
  const handleVerify = async (e) => {
    e.preventDefault();
    const verificationCode = code.join('');

    if (verificationCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          code: verificationCode
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'EXPIRED') {
          setError('Verification code has expired. Please request a new one.');
        } else if (data.code === 'TOO_MANY_ATTEMPTS') {
          setError('Too many attempts. Please request a new verification code.');
        } else if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts);
          setError(data.error);
        } else {
          setError(data.error || 'Verification failed');
        }
        
        // Clear the code inputs on error
        setCode(['', '', '', '', '', '']);
        const firstInput = document.getElementById('code-0');
        if (firstInput) firstInput.focus();
        
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/verification-success');
      }, 2000);

    } catch (error) {
      console.error('Verification error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Resend verification code
  const handleResend = async () => {
    setResendLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.waitTime) {
          setResendCooldown(data.waitTime);
          setError(`Please wait ${data.waitTime} seconds before requesting a new code`);
        } else {
          setError(data.error || 'Failed to resend code');
        }
        return;
      }

      setResendCooldown(60); // Start 60-second cooldown
      setRemainingAttempts(3); // Reset attempts with new code
      setCode(['', '', '', '', '', '']); // Clear current code
      
      // Focus first input
      const firstInput = document.getElementById('code-0');
      if (firstInput) firstInput.focus();

    } catch (error) {
      console.error('Resend error:', error);
      setError('Network error. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  if (success) {
    return (
      <div className="verification-page">
        <div className="verification-container">
          <div className="verification-success">
            <div className="success-icon">✅</div>
            <h2>Email Verified!</h2>
            <p>Your email has been successfully verified. Your account is now pending admin approval.</p>
            <p>Redirecting...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="verification-page">
      <div className="verification-container">
        <div className="verification-header">
          <h2>Verify Your Email</h2>
          <p>We've sent a 6-digit code to</p>
          <p className="email-display">{email}</p>
        </div>

        <form onSubmit={handleVerify} className="verification-form">
          <div className="code-input-container">
            {code.map((digit, index) => (
              <input
                key={index}
                id={`code-${index}`}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="code-input"
                disabled={loading}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          <div className="verification-info">
            <p>Attempts remaining: <span className="attempts">{remainingAttempts}</span></p>
            <p className="expiry-note">Code expires in 30 minutes</p>
          </div>

          {error && (
            <div className="verification-error">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading || code.join('').length !== 6}
            className="verify-button"
          >
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>

          <div className="resend-section">
            <p>Didn't receive the code?</p>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading || resendCooldown > 0}
              className="resend-button"
            >
              {resendLoading ? 'Sending...' : 
               resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
            </button>
          </div>

          <div className="back-section">
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="back-button"
            >
              ← Back to Registration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}