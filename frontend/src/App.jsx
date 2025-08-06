// frontend/src/App.jsx

import React, { useEffect, useState } from 'react';
import './App.css';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  Navigate
} from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Admin from './pages/Admin.jsx';

function Layout({ children }) {
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
      <header style={{ padding: '1rem', background: '#f0e6d2' }}>
        <nav style={{ display: 'flex', gap: '1rem' }}>
          {/* Only show Home link if user is logged in */}
          {user && <Link to="/">Home</Link>}

          {!user ? (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          ) : (
            <button className="nav-button" onClick={handleLogout}>
              Logout
            </button>
          )}

          {user && (user.role === 'admin' || user.role === 'power_user') && (
            <Link to="/admin">Admin</Link>
          )}
        </nav>
      </header>

      <main style={{ padding: '2rem' }}>{children}</main>
    </>
  );
}

// Component to handle role-based redirects
function RoleBasedRedirect({ children, requiredRoles = [] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppContent() {
  const [status, setStatus] = useState('Loading…');

  useEffect(() => {
    fetch('/health')
      .then(res => res.json())
      .then(data => setStatus(data.status))
      .catch(() => setStatus('Error'));
  }, []);

  return (
    <Layout>
      <Routes>
        {/* Home / Health-check */}
        <Route
          path="/"
          element={
            <div style={{ textAlign: 'center' }}>
              <h1>Bourbon Tracker POC</h1>
              <p>
                Backend health: <strong>{status}</strong>
              </p>
            </div>
          }
        />

        {/* Login */}
        <Route path="/login" element={<Login />} />

        {/* Register */}
        <Route path="/register" element={<Register />} />

        {/* Admin (protected with role-based access) */}
        <Route
          path="/admin"
          element={
            <RoleBasedRedirect requiredRoles={['admin', 'power_user']}>
              <Admin />
            </RoleBasedRedirect>
          }
        />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}