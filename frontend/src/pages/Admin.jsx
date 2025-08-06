// frontend/src/pages/Admin.jsx

import React, { useEffect, useState } from 'react';

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);

  // Fetch users on load — sends HTTP-only cookie
  useEffect(() => {
    fetch('/api/admin/users', { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error(`Error fetching users: ${res.status}`);
        return res.json();
      })
      .then(setUsers)
      .catch(err => setError(err.toString()));
  }, []);

  // Change user role
  const changeRole = (userId, newRole) => {
    fetch(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole })
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to update role');
        setUsers(us => us.map(u =>
          u.user_id === userId ? { ...u, role: newRole } : u
        ));
      })
      .catch(err => setError(err.toString()));
  };

  // Change user status (activate/disable)
  const changeStatus = (userId, newStatus) => {
    fetch(`/api/admin/users/${userId}/status`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to update status');
        setUsers(us => us.map(u =>
          u.user_id === userId ? { ...u, status: newStatus } : u
        ));
      })
      .catch(err => setError(err.toString()));
  };

  if (error) {
    return <p style={{ color: 'red' }}>Error: {error}</p>;
  }

  const pendingCount = users.filter(u => u.status === 'pending').length;

  return (
    <div className="p-4">
      <h1 className="text-xl mb-4">Admin: Manage Users</h1>

      {pendingCount > 0 && (
        <div style={{ marginBottom: '1rem', color: 'orange' }}>
          You have {pendingCount} user
          {pendingCount > 1 ? 's' : ''} pending activation.
        </div>
      )}

      <table className="w-full table-auto">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Status</th>
            <th>Role</th>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
