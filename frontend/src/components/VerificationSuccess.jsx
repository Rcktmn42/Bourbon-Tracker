// frontend/src/components/VerificationSuccess.jsx
import { useNavigate } from 'react-router-dom';
import './VerificationSuccess.css';

export default function VerificationSuccess() {
  const navigate = useNavigate();

  return (
    <div className="verification-success-page">
      <div className="success-container">
        <div className="success-icon">🎉</div>
        
        <h2>Email Verified Successfully!</h2>
        
        <div className="success-content">
          <div className="success-message">
            Your email address has been verified and your account has been created.
          </div>
          
          <div className="success-details">
            Your account is now <strong>pending admin approval</strong>. You'll receive an email notification once your account has been approved and you can start using WakePour.
          </div>
          
          <div className="success-info">
            <h3>What happens next?</h3>
            <ol>
              <li>Our team will review your registration (typically within 24-48 hours)</li>
              <li>You'll receive an approval email once your account is activated</li>
              <li>You can then log in and start tracking your favorite bourbons!</li>
            </ol>
          </div>
        </div>
        
        <div className="success-actions">
          <button 
            onClick={() => navigate('/login')}
            className="register-button primary"
          >
            Go to Login Page
          </button>
          
          <button 
            onClick={() => navigate('/')}
            className="register-button secondary"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}