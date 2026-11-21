import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../api/client';
import { BrandMark } from '../components/Layout';

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
    <div className="login-screen">
      <section className="login-side">
        <div className="brand">
          <BrandMark />
          Return Loop
        </div>
        <div>
          <p className="login-statement">Every returned device gets its best next route.</p>
          <ul className="login-routes" aria-label="Disposition routes">
            {['Resell', 'Refurbish', 'Exchange', 'Donate', 'Recycle', 'Write-off'].map((d) => (
              <li key={d} data-disp={d}>
                <span className="disp-dot" />
                {d}
              </li>
            ))}
          </ul>
        </div>
        <p className="login-foot">For warehouse inspectors, supervisors and administrators.</p>
      </section>

      <section className="login-form-wrap">
        <div className="login-card">
          <h1>Sign in</h1>
          <p className="page-sub">Use your Return Loop work email.</p>

          {error && (
            <div role="alert" className="alert error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@returnloop.internal"
                required
                autoComplete="email"
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="form-control"
              />
            </div>

            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
