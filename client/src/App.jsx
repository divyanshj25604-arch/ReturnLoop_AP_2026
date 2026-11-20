import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Returns from './pages/Returns';
import NewReturn from './pages/NewReturn';
import ReturnDetail from './pages/ReturnDetail';
import Admin from './pages/Admin';

export default function App() {
  return (
    <div className="app-container">
      <nav style={{ padding: '1rem', borderBottom: '1px solid #ccc', display: 'flex', gap: '1rem' }}>
        <Link to="/">Dashboard</Link>
        <Link to="/returns">Returns</Link>
        <Link to="/returns/new">New Return</Link>
        <Link to="/returns/1">Return Detail</Link>
        <Link to="/admin">Admin</Link>
        <Link to="/login">Login</Link>
      </nav>
      <main style={{ padding: '1.5rem' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/returns/new" element={<NewReturn />} />
          <Route path="/returns/:id" element={<ReturnDetail />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
    </div>
  );
}
