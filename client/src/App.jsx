import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Returns from './pages/Returns';
import NewReturn from './pages/NewReturn';
import ReturnDetail from './pages/ReturnDetail';
import Admin from './pages/Admin';

function DashboardRoute() {
  const { user, hasRole } = useAuth();
  if (user && !hasRole('SUPERVISOR')) {
    return <Navigate to="/returns" replace />;
  }
  return <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <Layout>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardRoute />
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
      </Layout>
    </AuthProvider>
  );
}
