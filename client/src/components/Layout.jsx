import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Link to={user && !hasRole('SUPERVISOR') ? '/returns' : '/'} className="brand">
            ReturnLoop
          </Link>
          <nav className="nav-links">
            {user && (
              <>
                {hasRole('SUPERVISOR') && (
                  <NavLink
                    to="/"
                    end
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  >
                    Dashboard
                  </NavLink>
                )}
                <NavLink
                  to="/returns"
                  end
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Returns
                </NavLink>
                <NavLink
                  to="/returns/new"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  New return
                </NavLink>
                {hasRole('ADMIN') && (
                  <NavLink
                    to="/admin"
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  >
                    Admin
                  </NavLink>
                )}
              </>
            )}
          </nav>
        </div>

        <div className="header-user-section">
          {user ? (
            <div className="user-chip">
              <span className="user-name">{user.full_name}</span>
              <span className={`role-badge ${user.app_role}`}>{user.app_role}</span>
              <button onClick={handleLogout} className="logout-btn" type="button">
                Logout
              </button>
            </div>
          ) : (
            <Link to="/login" className="nav-link">
              Login
            </Link>
          )}
        </div>
      </header>

      <main className="main-content">{children}</main>
    </div>
  );
}
