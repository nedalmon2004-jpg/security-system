import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, saveSession } from '../api';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const auth = await login(username, password);
      saveSession(auth);
      navigate(auth.role === 'ROLE_ADMIN' ? '/admin' : '/overview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card">
      <h1>Sign in</h1>
      <p className="muted">Your password is verified against a BCrypt hash.</p>
      <form onSubmit={handleSubmit}>
        <label>
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner small dark" />
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>
    </section>
  );
}
