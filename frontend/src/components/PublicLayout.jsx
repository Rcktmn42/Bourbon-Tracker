// frontend/src/components/PublicLayout.jsx

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './PublicLayout.css';

export default function PublicLayout({ children }) {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  return (
    <>
      <header className="public-header">
        <div className="public-nav">
          <div className="public-brand">
            <h1>NC Bourbon Tracker</h1>
          </div>
          <div className="public-auth-links">
            {isLoginPage ? (
              <Link to="/register" className="public-link">
                Need an account? Register
              </Link>
            ) : (
              <Link to="/login" className="public-link">
                Have an account? Login
              </Link>
            )}
          </div>
        </div>
      </header>
      
      <main className="public-main">
        {children}
      </main>
    </>
  );
}