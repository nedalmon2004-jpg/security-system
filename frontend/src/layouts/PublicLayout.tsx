import { Link, NavLink, Outlet } from 'react-router-dom';
import { isLoggedIn } from '../api';

export default function PublicLayout() {
  const loggedIn = isLoggedIn();

  return (
    <div className="app">
      <header className="nav">
        <Link to="/" className="brand">
          <span className="brand-mark">⛓</span> SecureBank
        </Link>
        <nav>
          <NavLink to="/" end>
            Home
          </NavLink>
          {loggedIn ? (
            <NavLink to="/overview" className="btn-link">
              Open banking
            </NavLink>
          ) : (
            <>
              <NavLink to="/login">Login</NavLink>
              <NavLink to="/register" className="btn-link">
                Get started
              </NavLink>
            </>
          )}
        </nav>
      </header>

      <main className="container">
        <Outlet />
      </main>

      <footer className="footer">
        SecureBank demo · passwords hashed with BCrypt · every action recorded in a SHA-256 hash chain
      </footer>
    </div>
  );
}
