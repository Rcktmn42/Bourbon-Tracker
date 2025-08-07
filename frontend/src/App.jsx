// frontend/src/App.jsx

import React, { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate
} from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Admin from './pages/Admin.jsx';
import Home from './pages/Home.jsx';     // ← import the new Home component
import './App.css';                      // your global styles

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
      <header className="main-header">
        <nav className="main-nav">
          <div className="nav-left">
            {/* Only show Home link if user is logged in */}
            {user && <Link to="/">Home</Link>}
            {user && (user.role === 'admin' || user.role === 'power_user') && (
              <Link to="/admin">Admin</Link>
            )}
          </div>
          <div className="nav-right">
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
          </div>
        </nav>
      </header>

      <main className="main-content">{children}</main>
    </>
  );
}

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
      <Layout>
        <Routes>
          {/* Home page */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Home status={status} />
              </ProtectedRoute>
            } 
          />

          {/* Authentication */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Admin (protected) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRoles={['admin', 'power_user']}>
                <Admin />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}