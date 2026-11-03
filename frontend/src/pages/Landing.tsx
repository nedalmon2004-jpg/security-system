import { Link } from 'react-router-dom';
import { isLoggedIn } from '../api';

export default function Landing() {
  const loggedIn = isLoggedIn();

  return (
    <div className="landing">
      <section className="hero">
        <span className="pill">Blockchain-secured banking</span>
        <h1>
          Your bank account, <span className="accent">tamper-evident</span> by design.
        </h1>
        <p className="lead">
          SecureBank verifies your password against a salted BCrypt hash and records every login and
          transaction in an immutable SHA-256 hash chain stored in MySQL.
        </p>
        <div className="hero-actions">
          {loggedIn ? (
            <Link className="btn" to="/dashboard">
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link className="btn" to="/register">
                Open an account
              </Link>
              <Link className="btn ghost" to="/login">
                Sign in
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="features">
        <article className="feature">
          <div className="feature-icon">🔐</div>
          <h3>BCrypt password hashing</h3>
          <p>Passwords are never stored. We keep only a salted, deliberately slow BCrypt hash.</p>
        </article>
        <article className="feature">
          <div className="feature-icon">⛓</div>
          <h3>Hash-chained audit ledger</h3>
          <p>Each event links to the previous block by SHA-256, so any tampering breaks the chain.</p>
        </article>
        <article className="feature">
          <div className="feature-icon">💸</div>
          <h3>Secure transactions</h3>
          <p>Deposit, withdraw and transfer funds while every movement is cryptographically logged.</p>
        </article>
        <article className="feature">
          <div className="feature-icon">🛡</div>
          <h3>JWT sessions</h3>
          <p>Stateless authentication with signed tokens and protected API endpoints.</p>
        </article>
      </section>

      <section className="how">
        <h2>How it works</h2>
        <ol className="steps">
          <li>
            <span className="step-num">1</span>
            <div>
              <strong>Register</strong>
              <p>Your password is hashed with BCrypt (strength 12) before it ever touches the database.</p>
            </div>
          </li>
          <li>
            <span className="step-num">2</span>
            <div>
              <strong>Sign in</strong>
              <p>The server verifies your password against the stored hash and issues a signed JWT.</p>
            </div>
          </li>
          <li>
            <span className="step-num">3</span>
            <div>
              <strong>Transact</strong>
              <p>Deposits, withdrawals and transfers are recorded as linked blocks in the audit ledger.</p>
            </div>
          </li>
          <li>
            <span className="step-num">4</span>
            <div>
              <strong>Verify</strong>
              <p>The ledger can be re-hashed at any time to prove no historical record was altered.</p>
            </div>
          </li>
        </ol>
      </section>
    </div>
  );
}
