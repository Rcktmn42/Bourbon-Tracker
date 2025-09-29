// frontend/src/components/MyProfile.jsx
import React, { useState } from 'react';

const MyProfile = ({
  firstName, setFirstName,
  lastName, setLastName,
  email,
  phoneNumber, setPhoneNumber,
  oldPassword, setOldPassword,
  newPassword, setNewPassword,
  confirmPassword, setConfirmPassword,
  onProfileSave,
  onPasswordChange,
  saving
}) => {
  return (
    <div className="my-profile-content">
      {/* Profile Update Form */}
      <form className="profile-form" onSubmit={onProfileSave} noValidate>
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
      <form className="profile-form" onSubmit={onPasswordChange} noValidate>
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
  );
};

export default MyProfile;