// frontend/src/App.jsx

import React, { useEffect, useState } from 'react';
import './App.css';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate
} from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Admin from './pages/Admin.jsx';

function Layout({ children }) {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login', { replace: true });
  };

  return (
    <>
      <header style={{ padding: '1rem', background: '#f0e6d2' }}>
        <nav style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/">Home</Link>

          {!token ? (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          ) : (
            <button className="nav-button" onClick={handleLogout}>
              Logout
            </button>
          )}

          <Link to="/admin">Admin</Link>
        </nav>
      </header>

      <main style={{ padding: '2rem' }}>{children}</main>
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

          {/* Admin (protected) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
