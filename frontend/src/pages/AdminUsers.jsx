// frontend/src/pages/AdminUsers.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiFetch from '../utils/api';
import './AdminUsers.css';

const AdminUsers = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingUser, setUpdatingUser] = useState(null);

  // Check if user has admin privileges
  useEffect(() => {
    if (user && !['admin', 'power_user'].includes(user.role)) {
      setError('Access denied. Admin or Power User privileges required.');
      setLoading(false);
      return;
    }
    
    fetchUsers();
  }, [user]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users', {
        credentials: 'include',
        headers: {
          'X-Requested-With': 'XMLHttpRequest' // CSRF protection
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setUsers(data.users);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch users');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      setUpdatingUser(userId);
      const response = await apiFetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole })
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        setUsers(users.map(u => 
          u.id === userId ? { ...u, role: newRole } : u
        ));
        setError(null);
      } else {
        setError(data.error || 'Failed to update user role');
      }
    } catch (err) {
      console.error('Error updating user role:', err);
      setError(err.message || 'Failed to update user role');
    } finally {
      setUpdatingUser(null);
    }
  };

  const updateUserStatus = async (userId, isActive) => {
    try {
      setUpdatingUser(userId);
      const response = await apiFetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive })
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        setUsers(users.map(u => 
          u.id === userId ? { ...u, is_active: isActive } : u
        ));
        setError(null);
      } else {
        setError(data.error || 'Failed to update user status');
      }
    } catch (err) {
      console.error('Error updating user status:', err);
      setError(err.message || 'Failed to update user status');
    } finally {
      setUpdatingUser(null);
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin': return 'role-admin';
      case 'power_user': return 'role-power-user';
      case 'user': return 'role-user';
      default: return 'role-unknown';
    }
  };

  const getStatusBadgeClass = (isActive, isVerified) => {
    if (!isVerified) return 'status-unverified';
    return isActive ? 'status-active' : 'status-inactive';
  };

  const getStatusText = (isActive, isVerified) => {
    if (!isVerified) return 'Unverified';
    return isActive ? 'Active' : 'Inactive';
  };

  if (loading) {
    return (
      <div className="admin-users">
        <div className="admin-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading users...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-users">
        <div className="admin-container">
          <div className="error-state">
            <h2>Error</h2>
            <p>{error}</p>
            {!error.includes('Access denied') && (
              <button onClick={fetchUsers} className="retry-button">
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-users">
      <div className="admin-container">
        <div className="admin-header">
          <h1>User Management</h1>
          <p>Manage user roles and account status</p>
          <div className="admin-stats">
            <span className="stat">
              Total Users: <strong>{users.length}</strong>
            </span>
            <span className="stat">
              Active: <strong>{users.filter(u => u.is_active && u.is_verified).length}</strong>
            </span>
            <span className="stat">
              Admins: <strong>{users.filter(u => u.role === 'admin').length}</strong>
            </span>
          </div>
        </div>

        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className={updatingUser === user.id ? 'updating' : ''}>
                  <td>
                    <div className="user-info">
                      <div className="user-id">#{user.id}</div>
                    </div>
                  </td>
                  <td>
                    <div className="user-email">
                      {user.email}
                      {!user.is_verified && (
                        <span className="verification-badge">Unverified</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <select
                      className={`role-select ${getRoleBadgeClass(user.role)}`}
                      value={user.role}
                      onChange={(e) => updateUserRole(user.id, e.target.value)}
                      disabled={updatingUser === user.id}
                    >
                      <option value="user">User</option>
                      <option value="power_user">Power User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(user.is_active, user.is_verified)}`}>
                      {getStatusText(user.is_active, user.is_verified)}
                    </span>
                  </td>
                  <td>
                    <div className="date-info">
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td>
                    <div className="user-actions">
                      {user.is_verified && (
                        <button
                          className={`status-toggle ${user.is_active ? 'deactivate' : 'activate'}`}
                          onClick={() => updateUserStatus(user.id, !user.is_active)}
                          disabled={updatingUser === user.id}
                        >
                          {user.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="empty-state">
            <p>No users found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;