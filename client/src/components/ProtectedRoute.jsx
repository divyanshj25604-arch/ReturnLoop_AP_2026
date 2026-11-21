import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, minRole }) {
  const { user, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-container session-loading">
        <div className="spinner" />
        <span>Checking your session…</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (minRole && !hasRole(minRole)) {
    return (
      <div className="not-allowed-card">
        <h2>You don't have access to this page</h2>
        <p>
          It needs the <strong>{minRole}</strong> role or higher.
        </p>
        <p>
          You're signed in as <strong>{user.app_role}</strong>.
        </p>
      </div>
    );
  }

  return children;
}
