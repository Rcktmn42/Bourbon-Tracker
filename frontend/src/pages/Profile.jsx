// frontend/src/pages/Profile.jsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MyProfile from '../components/MyProfile';
import './profile.css';

export default function Profile() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  // Profile fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(''); // read-only
  const [phoneNumber, setPhoneNumber] = useState(''); // standardized field name

  // Password change fields
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      setLoading(true);
      setLoadError('');
      try {
        const response = await fetch('/api/user/me', {
          method: 'GET',
          credentials: 'include'
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error || `HTTP ${response.status}`);
        }
        const data = await response.json();
        if (ignore) return;

        setFirstName(data.first_name ?? '');
        setLastName(data.last_name ?? '');
        setEmail(data.email ?? '');
        setPhoneNumber(data.phone_number ?? ''); // Backend sends formatted version
      } catch {
        if (!ignore) setLoadError('Could not load your profile. Please try again.');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadProfile();
    return () => { ignore = true; };
  }, []);

  function validateProfile() {
    if (!firstName.trim() || !lastName.trim()) {
      return 'First name and last name are required.';
    }
    
    // Let backend handle phone validation - just check if it's reasonable
    if (phoneNumber && phoneNumber.replace(/\D/g, '').length > 0 && phoneNumber.replace(/\D/g, '').length < 7) {
      return 'Phone number seems too short.';
    }

    return null;
  }

  function validatePassword() {
    const wantsPasswordChange = oldPassword || newPassword || confirmPassword;

    if (wantsPasswordChange) {
      if (!oldPassword || !newPassword || !confirmPassword) {
        return 'To change your password, please fill in all three password fields.';
      }
      if (newPassword !== confirmPassword) {
        return 'New password and confirmation do not match.';
      }
      if (newPassword.length < 8) {
        return 'New password must be at least 8 characters.';
      }
    }

    return null;
  }

  async function handleProfileSave(e) {
    e.preventDefault();
    setSaveError('');
    setSaveSuccess('');

    const validation = validateProfile();
    if (validation) {
      setSaveError(validation);
      return;
    }

    setSaving(true);
    try {
      const body = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phoneNumber?.trim() || null // Send raw input - backend will normalize
      };

      const response = await fetch('/api/user/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || `HTTP ${response.status}`);
      }

      setSaveSuccess('Profile updated successfully.');
      
      // Update with backend-normalized values (formatted phone)
      if (payload?.user) {
        setFirstName(payload.user.first_name ?? firstName);
        setLastName(payload.user.last_name ?? lastName);
        setPhoneNumber(payload.user.phone_number ?? phoneNumber);
      }
    } catch (err) {
      setSaveError(err.message || 'Profile update failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    setSaveError('');
    setSaveSuccess('');

    const validation = validatePassword();
    if (validation) {
      setSaveError(validation);
      return;
    }

    setSaving(true);
    try {
      const body = {
        old_password: oldPassword,
        new_password: newPassword
      };

      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || `HTTP ${response.status}`);
      }

      setSaveSuccess('Password changed successfully.');
      
      // Clear password fields after success
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setSaveError(err.message || 'Password change failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="profile-viewport">
        <div className="profile-panel">
          <div className="profile-header">
            <h1>My Profile</h1>
          </div>
          <div className="profile-body">
            <p>Loading your profile…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-viewport">
      <div className="profile-panel">
        <div className="profile-header">
          <h1>My Profile</h1>
          <p className="profile-subtitle">Manage your account settings and personal information.</p>
        </div>

        {/* Watchlist Navigation Notice */}
        <div className="profile-notice">
          <div className="notice-content">
            <h3>Looking for your Watchlist?</h3>
            <p>We've moved the watchlist to its own dedicated page for a better experience.</p>
            <Link to="/watchlist" className="watchlist-link-btn">
              Go to Watchlist →
            </Link>
          </div>
        </div>

        {/* Messages */}
        {(loadError || saveError || saveSuccess) && (
          <div className="profile-messages">
            {loadError && <div className="banner banner-error">{loadError}</div>}
            {saveError && <div className="banner banner-error">{saveError}</div>}
            {saveSuccess && <div className="banner banner-success">{saveSuccess}</div>}
          </div>
        )}

        {/* Profile Content */}
        <div className="profile-content">
          <MyProfile
            firstName={firstName}
            setFirstName={setFirstName}
            lastName={lastName}
            setLastName={setLastName}
            email={email}
            phoneNumber={phoneNumber}
            setPhoneNumber={setPhoneNumber}
            oldPassword={oldPassword}
            setOldPassword={setOldPassword}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            onProfileSave={handleProfileSave}
            onPasswordChange={handlePasswordChange}
            saving={saving}
          />
        </div>
      </div>
    </div>
  );
}