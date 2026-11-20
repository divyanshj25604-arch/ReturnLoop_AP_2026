import React from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Returns from './pages/Returns';
import NewReturn from './pages/NewReturn';
import ReturnDetail from './pages/ReturnDetail';
import Admin from './pages/Admin';

function Navigation() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav
      style={{
        padding: '1rem',
        borderBottom: '1px solid #ccc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <strong>Return Loop</strong>
        <Link to="/">Dashboard</Link>
        <Link to="/returns">Returns</Link>
        <Link to="/returns/new">New Return</Link>
        <Link to="/returns/1">Return Detail</Link>
        <Link to="/admin">Admin</Link>
      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        {user ? (
          <>
            <span style={{ fontSize: '0.9rem', color: '#555' }}>
              {user.full_name} ({user.app_role})
            </span>
            <button
              onClick={handleLogout}
              style={{
                padding: '0.3rem 0.75rem',
                cursor: 'pointer',
                background: '#f44336',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <div className="app-container">
        <Navigation />
        <main style={{ padding: '1.5rem' }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/returns"
              element={
                <ProtectedRoute>
                  <Returns />
                </ProtectedRoute>
              }
            />
            <Route
              path="/returns/new"
              element={
                <ProtectedRoute>
                  <NewReturn />
                </ProtectedRoute>
              }
            />
            <Route
              path="/returns/:id"
              element={
                <ProtectedRoute>
                  <ReturnDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute minRole="ADMIN">
                  <Admin />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}
