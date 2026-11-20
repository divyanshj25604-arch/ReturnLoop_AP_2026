import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, minRole }) {
  const { user, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (minRole && !hasRole(minRole)) {
    return (
      <div className="not-allowed-card" style={{ padding: '2rem', color: '#c00' }}>
        <h2>Access Restricted</h2>
        <p>
          This section requires the <strong>{minRole}</strong> role or higher.
        </p>
        <p>
          Your current role is: <strong>{user.app_role}</strong>.
        </p>
      </div>
    );
  }

  return children;
}
