import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../api/client';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Compute target destination based on user role
  const getDestination = (loggedInUser) => {
    const fromPath = location.state?.from?.pathname;
    if (fromPath && fromPath !== '/login') {
      // If inspector tried to access dashboard or admin, redirect to returns
      if (loggedInUser.app_role === 'INSPECTOR' && (fromPath === '/' || fromPath.startsWith('/admin'))) {
        return '/returns';
      }
      return fromPath;
    }
    // Step 14: supervisors and admins land on / (dashboard); inspectors land on /returns
    return loggedInUser.app_role === 'INSPECTOR' ? '/returns' : '/';
  };

  useEffect(() => {
    if (user) {
      navigate(getDestination(user), { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Email and password are required');
      return;
    }

    setSubmitting(true);
    try {
      const loggedInUser = await login(email.trim(), password);
      navigate(getDestination(loggedInUser), { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-login" style={{ maxWidth: '400px', margin: '2rem auto' }}>
      <h1>Sign In</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        Return Loop Operator Portal
      </p>

      {error && (
        <div
          role="alert"
          style={{
            padding: '0.75rem',
            background: '#ffebee',
            color: '#c62828',
            borderRadius: '4px',
            marginBottom: '1rem',
            border: '1px solid #ef9a9a',
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label htmlFor="login-email" style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
            Email
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="operator@returnloop.internal"
            required
            autoComplete="email"
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label htmlFor="login-password" style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>
            Password
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: '0.65rem 1rem',
            backgroundColor: submitting ? '#9e9e9e' : '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: submitting ? 'not-allowed' : 'pointer',
            fontWeight: 600,
          }}
        >
          {submitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
