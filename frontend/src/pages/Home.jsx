// frontend/src/pages/Home.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import './Home.css';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="home-page">
      <div className="home-container">
        <div className="welcome-section">
          <h1>Welcome to WakePour</h1>
          {user && (
            <p className="welcome-message">
              Hello, {user.first_name}!
            </p>
          )}
        </div>

        {user && (
          <div className="reports-section">
            
            <div className="reports-grid">
              {/* Wake County Reports */}
              <div className="report-category">
                <h3>Wake County Inventory</h3>
                <div className="report-links">
                  <button 
                    className="report-button primary"
                    onClick={() => navigate('/todays-arrivals')}
                  >
                    📦 Today's Arrivals
                    <span className="report-description">See what bourbon arrived today</span>
                  </button>
                  
                  <button 
                    className="report-button primary"
                    onClick={() => navigate('/inventory')}
                  >
                    🏪 Current Store Inventory
                    <span className="report-description">Search current allocated product inventory</span>
                  </button>
                  
                  <button 
                    className="report-button primary"
                    onClick={() => navigate('/delivery-analysis')}
                  >
                    📈 Drop Tracking
                    <span className="report-description">Delivery analysis and drop predictions</span>
                  </button>
                  
                  <button 
                    className="report-button primary"
                    onClick={() => navigate('/stores')}
                  >
                    🏪 Store Information
                    <span className="report-description">Find ABC store locations and delivery schedules</span>
                  </button>
                </div>
              </div>

              {/* State Warehouse Reports */}
              <div className="report-category">
                <h3>State Warehouse</h3>
                <div className="report-links">
                  <button 
                    className="report-button primary"
                    onClick={() => navigate('/warehouse-inventory')}
                  >
                    🏭 Warehouse Inventory
                    <span className="report-description">State warehouse inventory levels and analytics</span>
                  </button>
                </div>
              </div>

              {/* Shipping Reports */}
              <div className="report-category">
                <h3>Distribution & Shipping</h3>
                <div className="report-links">
                  <button 
                    className="report-button primary"
                    onClick={() => navigate('/statewide-shipments')}
                  >
                    🚚 State Shipping Information
                    <span className="report-description">Track ABC board shipments statewide</span>
                  </button>
                  
                  <button 
                    className="report-button coming-soon"
                    disabled
                  >
                    🗺️ Regional Analysis
                    <span className="report-description">Coming soon</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {user && (
          <div className="user-section">
            <h2>Your Account</h2>
            <div className="account-links">
              <button 
                className="account-button"
                onClick={() => navigate('/profile')}
              >
                👤 Manage Profile
              </button>
              
              <button
                className="account-button"
                onClick={() => navigate('/watchlist')}
              >
                🔔 Watchlist & Alerts
                <span className="report-description">Track your favorite products</span>
              </button>
            </div>
          </div>
        )}

        {!user && (
          <div className="auth-section">
            <h2>Get Started</h2>
            <p>Sign up to access bourbon tracking reports and set up personalized alerts.</p>
            <div className="auth-buttons">
              <button 
                className="auth-button primary"
                onClick={() => navigate('/register')}
              >
                Create Account
              </button>
              <button 
                className="auth-button secondary"
                onClick={() => navigate('/login')}
              >
                Sign In
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}