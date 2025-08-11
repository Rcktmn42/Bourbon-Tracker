// frontend/src/App.jsx

import React, { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  Navigate
} from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';
import PublicLayout from './components/PublicLayout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Admin from './pages/Admin.jsx';
import Home from './pages/Home.jsx';
import Profile from './pages/Profile.jsx'; // <-- NEW
import './App.css';

// Authenticated Layout - Full app experience
function AuthenticatedLayout({ children }) {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  if (loading) {
    return <p>Loading…</p>;
  }

  return (
    <>
      <header className="main-header">
        <nav className="main-nav">
          <div className="nav-left">
            <Link to="/">Home</Link>
            {user && (user.role === 'admin' || user.role === 'power_user') && (
              <Link to="/admin">Admin</Link>
            )}
            <Link to="/profile">Profile</Link> {/* <-- NEW */}
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

      <main className="main-content">{children}</main>
    </>
  );
}

// Main App Component
export default function App() {
  const [status, setStatus] = useState('Loading…');

  useEffect(() => {
    fetch('/health')
      .then(res => res.json())
      .then(data => setStatus(data.status))
      .catch(() => setStatus('Error'));
  }, []);

  return (
    <BrowserRouter>
      <AppContent status={status} />
    </BrowserRouter>
  );
}

// Separate component to use auth context inside Router
function AppContent({ status }) {
  const { user, loading } = useAuth();

  // Show loading while checking authentication
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.2rem'
      }}>
        Loading...
      </div>
    );
  }

  // If user is not logged in, show public layout with only auth routes
  if (!user) {
    return (
      <PublicLayout>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          {/* Redirect any other route to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </PublicLayout>
    );
  }

  // User is logged in, show authenticated layout with all app routes
  return (
    <AuthenticatedLayout>
      <Routes>
        {/* Protected routes - all automatically secured */}
        <Route path="/" element={<Home status={status} />} />
        <Route path="/profile" element={<Profile />} /> {/* <-- NEW */}
        
        {/* Admin route with role checking */}
        <Route 
          path="/admin" 
          element={
            user.role === 'admin' || user.role === 'power_user' ? (
              <Admin />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />
        
        {/* Redirect auth routes to home if already logged in */}
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Navigate to="/" replace />} />
        
        {/* Catch-all redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthenticatedLayout>
  );
}
