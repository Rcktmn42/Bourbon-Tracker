// frontend/src/pages/Admin.jsx

import React, { useEffect, useState } from 'react';
import './admin.css';

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [resetLoading, setResetLoading] = useState({});

  useEffect(() => {
    fetch('/api/admin/users', { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error(`Error fetching users: ${res.status}`);
        return res.json();
      })
      .then(setUsers)
      .catch(err => setError(err.toString()));
  }, []);

  const changeRole = (userId, newRole) => {
    fetch(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole })
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to update role');
        setUsers(us =>
          us.map(u => (u.user_id === userId ? { ...u, role: newRole } : u))
        );
      })
      .catch(err => setError(err.toString()));
  };

  const changeStatus = (userId, newStatus) => {
    fetch(`/api/admin/users/${userId}/status`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to update status');
        setUsers(us =>
          us.map(u => (u.user_id === userId ? { ...u, status: newStatus } : u))
        );
      })
      .catch(err => setError(err.toString()));
  };

  const initiatePasswordReset = async (userId, userFirstName, userEmail) => {
    if (!window.confirm(`Are you sure you want to send a password reset email to ${userFirstName} (${userEmail})?`)) {
      return;
    }

    setResetLoading(prev => ({ ...prev, [userId]: true }));
    
    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert(`✅ ${data.message}`);
      } else {
        throw new Error(data.error || 'Failed to send password reset email');
      }
    } catch (err) {
      console.error('Password reset error:', err);
      alert(`❌ Error: ${err.message}`);
    } finally {
      setResetLoading(prev => ({ ...prev, [userId]: false }));
    }
  };

  if (error) {
    return <p style={{ color: 'red' }}>Error: {error}</p>;
  }

  return (
    <div className="admin-page">
      <div className="admin-container">
        <h1 style={{ color: '#3D2B1F', marginBottom: '1rem' }}>
          Admin: Manage Users
        </h1>

        <table className="user-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.user_id}>
                <td>{u.user_id}</td>
                <td>{u.first_name} {u.last_name}</td>
                <td>{u.email}</td>
                <td>
                  {(u.status === 'pending' || u.status === 'disabled') ? (
                    <button onClick={() => changeStatus(u.user_id, 'active')}>
                      Activate
                    </button>
                  ) : u.status === 'active' ? (
                    <button onClick={() => changeStatus(u.user_id, 'disabled')}>
                      Disable
                    </button>
                  ) : (
                    u.status
                  )}
                </td>
                <td>
                  <select
                    value={u.role}
                    onChange={e => changeRole(u.user_id, e.target.value)}
                  >
                    <option value="user">user</option>
                    <option value="power_user">power_user</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td>
                  <button 
                    className="reset-password-btn"
                    onClick={() => initiatePasswordReset(u.user_id, u.first_name, u.email)}
                    disabled={resetLoading[u.user_id] || u.status !== 'active'}
                    title={u.status !== 'active' ? 'User must be active to reset password' : 'Send password reset email to user'}
                  >
                    {resetLoading[u.user_id] ? 'Sending...' : '🔐 Reset Password'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
