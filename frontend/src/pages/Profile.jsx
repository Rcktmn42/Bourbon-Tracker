// frontend/src/pages/Profile.jsx
import React, { useEffect, useState } from 'react';
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
      } catch (err) {
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
          <p className="profile-subtitle">Manage your account details and password.</p>
        </div>

        {(loadError || saveError || saveSuccess) && (
          <div className="profile-messages">
            {loadError && <div className="banner banner-error">{loadError}</div>}
            {saveError && <div className="banner banner-error">{saveError}</div>}
            {saveSuccess && <div className="banner banner-success">{saveSuccess}</div>}
          </div>
        )}

        {/* Profile Update Form */}
        <form className="profile-form" onSubmit={handleProfileSave} noValidate>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="firstName">First name</label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                autoComplete="given-name"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="lastName">Last name</label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                autoComplete="family-name"
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                disabled
                readOnly
                className="readonly"
                autoComplete="email"
              />
              <small className="hint">Email is managed by the system.</small>
            </div>

            <div className="form-field">
              <label htmlFor="phoneNumber">Phone number</label>
              <input
                id="phoneNumber"
                type="tel"
                placeholder="(919) 555-1234 or 919-555-1234"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                autoComplete="tel"
              />
              <small className="hint">
                Enter 10-digit US phone number. We'll format it automatically.
              </small>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        </form>

        {/* Password Change Form */}
        <form className="profile-form" onSubmit={handlePasswordChange} noValidate>
          <fieldset className="password-section">
            <legend>Change password (optional)</legend>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="oldPassword">Current password</label>
                <input
                  id="oldPassword"
                  type="password"
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              <div className="form-field">
                <label htmlFor="newPassword">New password</label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <small className="hint">
                  Use 8+ characters with a mix of upper/lowercase, numbers & symbols.
                </small>
              </div>

              <div className="form-field">
                <label htmlFor="confirmPassword">Confirm new password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="form-actions">
              <button className="btn-primary" type="submit" disabled={saving}>
                {saving ? 'Changing…' : 'Change Password'}
              </button>
            </div>
          </fieldset>
        </form>
      </div>
    </div>
  );
}