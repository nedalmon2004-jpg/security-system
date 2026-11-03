import { FormEvent, useEffect, useState } from 'react';
import {
  changePassword,
  getLoginHistory,
  getProfile,
  getToken,
  type LedgerBlock,
  type UserProfile
} from '../api';

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [history, setHistory] = useState<LedgerBlock[]>([]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    Promise.all([getProfile(token), getLoginHistory(token)])
      .then(([p, h]) => {
        setProfile(p);
        setHistory(h);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const token = getToken();
    if (!token) return;

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      const result = await changePassword(token, currentPassword, newPassword);
      setNotice(result.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change password');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <p className="loading"><span className="spinner" />Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="stack">
      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}

      <div className="two-col">
        <section className="card">
          <h1>Profile</h1>
          <dl className="details">
            <div>
              <dt>Username</dt>
              <dd>{profile?.username}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{profile?.email}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{profile?.role}</dd>
            </div>
            <div>
              <dt>Member since</dt>
              <dd>{profile ? new Date(profile.createdAt).toLocaleString() : '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="card">
          <h2>Change password</h2>
          <p className="muted">The new password is re-hashed with BCrypt before storage.</p>
          <form onSubmit={handleSubmit}>
            <label>
              Current password
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>
            <label>
              New password
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>
            <label>
              Confirm new password
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Updating...' : 'Update password'}
            </button>
          </form>
        </section>
      </div>

      <section className="card">
        <h2>Login history</h2>
        <p className="muted">Pulled from the audit ledger for your account.</p>
        {history.length === 0 ? (
          <p className="muted">No login events recorded yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Event</th>
                  <th>Block hash</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {history.map((block) => (
                  <tr key={block.id}>
                    <td>{block.blockIndex}</td>
                    <td>
                      <span className={block.eventType === 'LOGIN_SUCCESS' ? 'badge credit' : 'badge debit'}>
                        {block.eventType}
                      </span>
                    </td>
                    <td className="mono">
                      {block.blockHash.slice(0, 12)}...{block.blockHash.slice(-10)}
                    </td>
                    <td>{new Date(block.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
