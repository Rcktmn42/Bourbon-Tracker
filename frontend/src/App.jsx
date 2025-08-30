// frontend/src/App.jsx

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Existing imports
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Admin from './pages/Admin';
import Profile from './pages/Profile';

// NEW IMPORTS - Add these
import TodaysArrivals from './pages/TodaysArrivals';
import CurrentInventory from './pages/CurrentInventory';
import DeliveryAnalysis from './pages/DeliveryAnalysis';

// EMAIL VERIFICATION IMPORTS - Add these new imports
import EmailVerification from './pages/EmailVerification';
import VerificationSuccess from './pages/VerificationSuccess';

// PASSWORD RESET IMPORTS - Add these new imports
import RequestPasswordReset from './pages/RequestPasswordReset';
import ResetPassword from './pages/ResetPassword';

// Your existing CSS imports
import './App.css';

function AuthenticatedLayout({ children }) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      <header className="main-header">
        <nav className="main-nav">
          <div className="nav-left">
            <Link to="/">Home</Link>
            {user && (user.role === 'admin' || user.role === 'power_user') && (
              <Link to="/admin">Admin</Link>
            )}
            {/* REMOVED - Current Inventory and Historical Trends links */}
            <Link to="/profile">Profile</Link>
          </div>
          <div className="nav-right">
            <span style={{ marginRight: '1rem', color: '#5A3E1B' }}>
              Welcome, {user?.first_name}!
            </span>
            <button className="nav-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </nav>
      </header>
      <main className="main-content">
        <div className="authenticated-container">
          {children}
        </div>
      </main>
    </>
  );
}

function PublicLayout({ children }) {
  return (
    <div className="public-layout">
      <div className="public-background">
        <div className="public-content">
          {children}
        </div>
      </div>
    </div>
  );
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        <Routes>
          {/* Public routes - shown when user is NOT logged in */}
          {!user ? (
            <>
              <Route path="/login" element={
                <PublicLayout>
                  <Login />
                </PublicLayout>
              } />
              
              <Route path="/register" element={
                <PublicLayout>
                  <Register />
                </PublicLayout>
              } />
              
              {/* EMAIL VERIFICATION ROUTES - Add these new routes */}
              <Route path="/verify-email" element={
                <PublicLayout>
                  <EmailVerification />
                </PublicLayout>
              } />
              
              <Route path="/verification-success" element={
                <PublicLayout>
                  <VerificationSuccess />
                </PublicLayout>
              } />
              
              {/* PASSWORD RESET ROUTES - Add these new routes */}
              <Route path="/request-password-reset" element={
                <PublicLayout>
                  <RequestPasswordReset />
                </PublicLayout>
              } />
              
              <Route path="/reset-password" element={
                <PublicLayout>
                  <ResetPassword />
                </PublicLayout>
              } />
              
              {/* Redirect all other paths to login */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          ) : (
            /* Authenticated routes - shown when user IS logged in */
            <>
              {/* Home page */}
              <Route path="/" element={
                <AuthenticatedLayout>
                  <Home />
                </AuthenticatedLayout>
              } />
              
              {/* Profile page */}
              <Route path="/profile" element={
                <AuthenticatedLayout>
                  <Profile />
                </AuthenticatedLayout>
              } />
              
              {/* TODAYS ARRIVALS ROUTE */}
              <Route path="/todays-arrivals" element={
                <AuthenticatedLayout>
                  <TodaysArrivals />
                </AuthenticatedLayout>
              } />
              
              {/* INVENTORY ROUTES */}
              <Route path="/inventory" element={
                <AuthenticatedLayout>
                  <CurrentInventory />
                </AuthenticatedLayout>
              } />
              
              <Route path="/delivery-analysis" element={
                <AuthenticatedLayout>
                  <DeliveryAnalysis />
                </AuthenticatedLayout>
              } />
              
              {/* Admin route - only for admin/power_user roles */}
              {(user.role === 'admin' || user.role === 'power_user') && (
                <Route path="/admin" element={
                  <AuthenticatedLayout>
                    <Admin />
                  </AuthenticatedLayout>
                } />
              )}
              
              {/* Fallback - redirect unknown paths to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      </div>
    </Router>
  );
}

export default App;