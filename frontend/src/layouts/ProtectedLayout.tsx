import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { clearSession, getUsername, isAdmin, isLoggedIn } from '../api';

const LINKS = [
  { to: '/overview', label: 'Overview', icon: '🏠' },
  { to: '/transfer', label: 'Move money', icon: '💸' },
  { to: '/transactions', label: 'Transactions', icon: '🧾' },
  { to: '/cards', label: 'Cards', icon: '💳' },
  { to: '/ledger', label: 'Audit ledger', icon: '⛓' },
  { to: '/profile', label: 'Profile', icon: '👤' }
];

export default function ProtectedLayout() {
  const navigate = useNavigate();
  const username = getUsername();
  const admin = isAdmin();

  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  const links = admin
    ? [...LINKS, { to: '/admin', label: 'Admin panel', icon: '🛡' }]
    : LINKS;

  function handleLogout() {
    clearSession();
    navigate('/');
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="side-brand">
          <span className="brand-mark">⛓</span> SecureBank
        </div>
        <nav className="side-nav">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to}>
              <span aria-hidden>{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="side-footer">
          <div className="side-user">
            <span className="avatar">{username?.[0]?.toUpperCase() ?? '?'}</span>
            <div>
              <strong>{username}</strong>
              <small>{admin ? 'Administrator' : 'Personal account'}</small>
            </div>
          </div>
          <button className="link" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <span className="muted">Online banking</span>
          <span className="chip ok">Secure session</span>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
