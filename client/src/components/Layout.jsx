import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Loop-arrow mark used in the rail and on the sign-in screen.
export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="4" fill="#ffd84d" />
      <path
        d="M22.5 12.5a7 7 0 1 0 1.2 6"
        fill="none"
        stroke="#1d2733"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M24.8 7.6v6.2h-6.2" fill="none" stroke="#1d2733" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function Layout({ children }) {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Signed-out screens (sign-in, session check) use the full window.
  if (!user) {
    return <main className="bare-main">{children}</main>;
  }

  const navClass = ({ isActive }) => `nav-link ${isActive ? 'active' : ''}`;

  return (
    <div className="app-shell">
      <header className="rail">
        <Link to={user && !hasRole('SUPERVISOR') ? '/returns' : '/'} className="brand">
          <BrandMark />
          Return Loop
        </Link>

        <nav className="rail-nav" aria-label="Main">
          {hasRole('SUPERVISOR') && (
            <NavLink to="/" end className={navClass}>
              Dashboard
            </NavLink>
          )}
          <NavLink to="/returns" end className={navClass}>
            Returns
          </NavLink>
          <NavLink to="/returns/new" className={navClass}>
            New return
          </NavLink>
          {hasRole('ADMIN') && (
            <NavLink to="/admin" className={navClass}>
              Admin
            </NavLink>
          )}
        </nav>

        <div className="rail-user">
          <span className="rail-user-name">{user.full_name}</span>
          <div className="rail-user-row">
            <span className={`role-badge ${user.app_role}`}>{user.app_role}</span>
            <button onClick={handleLogout} className="logout-btn" type="button">
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">{children}</main>
    </div>
  );
}
