import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './register.css';

const passwordChecks = [
  { label: 'At least 8 characters', test: pw => pw.length >= 8 },
  { label: 'A lowercase letter', test: pw => /[a-z]/.test(pw) },
  { label: 'An uppercase letter', test: pw => /[A-Z]/.test(pw) },
  { label: 'A number', test: pw => /\d/.test(pw) },
  { label: 'A symbol', test: pw => /\W/.test(pw) },
];

export default function Register() {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Password checks
  const passwordResults = passwordChecks.map(check => check.test(form.password));
  const allPasswordOk = passwordResults.every(Boolean);
  const passwordsMatch = form.password && form.confirmPassword && form.password === form.confirmPassword;

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({
      ...f,
      [name]: value,
    }));
    setError('');
    setSuccess('');
  };

  const canSubmit =
    form.first_name.trim() &&
    form.last_name.trim() &&
    form.email.trim() &&
    allPasswordOk &&
    passwordsMatch;

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-page">
      <form className="register-form" onSubmit={handleSubmit}>
        <h2>Create Account</h2>

        <div className="register-input-group">
          <label htmlFor="first_name">First Name</label>
          <input
            id="first_name"
            name="first_name"
            type="text"
            className="register-input"
            value={form.first_name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="register-input-group">
          <label htmlFor="last_name">Last Name</label>
          <input
            id="last_name"
            name="last_name"
            type="text"
            className="register-input"
            value={form.last_name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="register-input-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            className="register-input"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>

        {/* Password + confirm password with show/hide */}
        <div className="register-input-group password-toggle-group">
          <label htmlFor="password">Password</label>
          <div className="register-password-field">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              className="register-input"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="register-toggle-button"
              onClick={() => setShowPassword(s => !s)}
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
          <ul className="password-checklist">
            {passwordChecks.map((check, i) => (
              <li key={check.label} className={passwordResults[i] ? 'met' : 'unmet'}>
                {passwordResults[i] ? '✔' : '✗'} {check.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="register-input-group password-toggle-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <div className="register-password-field">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              className="register-input"
              value={form.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
          </div>
          {form.confirmPassword && (
            <div className={passwordsMatch ? "password-match met" : "password-match unmet"}>
              {passwordsMatch ? "✔ Passwords match" : "✗ Passwords do not match"}
            </div>
          )}
        </div>

        {/* Actionable feedback */}
        {error && <div className="register-error">{error}</div>}
        {success && <div className="register-success">{success}</div>}

        <button
          type="submit"
          className="register-button"
          disabled={!canSubmit || isLoading}
        >
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>

        {allPasswordOk && passwordsMatch && (
          <div className="password-strong-hint">Great, your password is strong!</div>
        )}
      </form>
    </div>
  );
}
