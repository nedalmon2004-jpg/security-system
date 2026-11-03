import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  deleteAdminUser,
  formatMoney,
  getAdminStats,
  getAdminTransactions,
  getAdminUsers,
  getToken,
  getUsername,
  isAdmin,
  setAccountFrozen,
  setUserRole,
  updateAdminUser,
  type AdminStats,
  type AdminUser,
  type Transaction,
  type TransactionType
} from '../api';

const TX_LABEL: Record<TransactionType, string> = {
  DEPOSIT: 'Deposit',
  WITHDRAW: 'Withdrawal',
  TRANSFER: 'Transfer',
  TRANSFER_IN: 'Transfer in',
  TRANSFER_OUT: 'Transfer out'
};

type Tab = 'overview' | 'users' | 'transactions';
type TxFilter = 'ALL' | 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER';

export default function Admin() {
  const currentAdmin = getUsername();
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [txSearch, setTxSearch] = useState('');
  const [txFilter, setTxFilter] = useState<TxFilter>('ALL');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyUser, setBusyUser] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('ROLE_USER');

  function loadAll() {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    Promise.all([getAdminStats(token), getAdminUsers(token), getAdminTransactions(token)])
      .then(([s, u, t]) => {
        setStats(s);
        setUsers(u);
        setTransactions(t);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load admin data'))
      .finally(() => setLoading(false));
  }

  useEffect(loadAll, []);

  const filteredUsers = useMemo(() => {
    const term = userSearch.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) =>
      [u.username, u.email, u.accountNumber ?? '', u.role].join(' ').toLowerCase().includes(term)
    );
  }, [users, userSearch]);

  const filteredTransactions = useMemo(() => {
    const term = txSearch.trim().toLowerCase();
    return transactions.filter((tx) => {
      const typeMatches = txFilter === 'ALL' || tx.type === txFilter;
      if (!typeMatches) return false;
      if (!term) return true;
      return [
        TX_LABEL[tx.type],
        tx.description ?? '',
        tx.fromAccountNumber ?? '',
        tx.toAccountNumber ?? '',
        String(tx.amount)
      ]
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [transactions, txFilter, txSearch]);

  const totalVolume = useMemo(
    () => transactions.reduce((sum, tx) => sum + tx.amount, 0),
    [transactions]
  );

  const activity = useMemo(() => {
    const days: { key: string; label: string; total: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push({
        key: d.toDateString(),
        label: d.toLocaleDateString(undefined, { weekday: 'short' }),
        total: 0
      });
    }
    const buckets = new Map(days.map((d) => [d.key, d]));
    transactions.forEach((tx) => {
      const d = new Date(tx.createdAt);
      d.setHours(0, 0, 0, 0);
      const bucket = buckets.get(d.toDateString());
      if (bucket) bucket.total += tx.amount;
    });
    return days;
  }, [transactions]);

  const maxActivity = Math.max(1, ...activity.map((d) => d.total));

  const recentUsers = useMemo(
    () =>
      [...users]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [users]
  );

  if (!isAdmin()) {
    return <Navigate to="/overview" replace />;
  }

  function openEdit(user: AdminUser) {
    setEditing(user);
    setEditUsername(user.username);
    setEditEmail(user.email);
    setEditRole(user.role);
    setError('');
    setNotice('');
  }

  async function handleSaveEdit(event: FormEvent) {
    event.preventDefault();
    const token = getToken();
    if (!token || !editing) return;
    if (!editUsername.trim() || !editEmail.trim()) {
      setError('Username and email are required');
      return;
    }

    setError('');
    setNotice('');
    setSaving(true);
    try {
      const updated = await updateAdminUser(token, editing.id, {
        username: editUsername.trim(),
        email: editEmail.trim(),
        role: editRole
      });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setNotice(`Saved changes for ${updated.username}.`);
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update user');
    } finally {
      setSaving(false);
    }
  }

  async function handleRole(user: AdminUser) {
    const token = getToken();
    if (!token) return;
    const nextRole = user.role === 'ROLE_ADMIN' ? 'ROLE_USER' : 'ROLE_ADMIN';
    setError('');
    setNotice('');
    setBusyUser(user.id);
    try {
      const updated = await setUserRole(token, user.id, nextRole);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setNotice(`${updated.username} is now ${nextRole === 'ROLE_ADMIN' ? 'an administrator' : 'a regular user'}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change role');
    } finally {
      setBusyUser(null);
    }
  }

  async function handleFreeze(user: AdminUser) {
    const token = getToken();
    if (!token) return;
    setError('');
    setNotice('');
    setBusyUser(user.id);
    try {
      const updated = await setAccountFrozen(token, user.id, !user.frozen);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setNotice(`${updated.username}'s account is now ${updated.frozen ? 'frozen' : 'active'}.`);
      setStats(await getAdminStats(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update account');
    } finally {
      setBusyUser(null);
    }
  }

  async function handleDelete(user: AdminUser) {
    const token = getToken();
    if (!token) return;
    const confirmed = window.confirm(
      `Delete ${user.username}?\n\nThis removes their login and account. The audit ledger keeps a permanent record.`
    );
    if (!confirmed) return;

    setError('');
    setNotice('');
    setBusyUser(user.id);
    try {
      await deleteAdminUser(token, user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setStats(await getAdminStats(token));
      setNotice(`Deleted ${user.username}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete user');
    } finally {
      setBusyUser(null);
    }
  }

  function exportTransactions() {
    const header = 'Date,Type,From,To,Description,Amount';
    const rows = filteredTransactions.map((tx) =>
      [
        new Date(tx.createdAt).toISOString(),
        tx.type,
        tx.fromAccountNumber ?? '',
        tx.toAccountNumber ?? '',
        `"${(tx.description ?? '').replace(/"/g, '""')}"`,
        tx.amount.toFixed(2)
      ].join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'securebank-all-transactions.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Admin panel</h1>
          <p className="muted">Manage users, accounts, and every transaction on the platform.</p>
        </div>
        <span className="chip neutral">Administrator</span>
      </div>

      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}

      <div className="tabs">
        <button type="button" className={tab === 'overview' ? 'tab active' : 'tab'} onClick={() => setTab('overview')}>
          Dashboard
        </button>
        <button type="button" className={tab === 'users' ? 'tab active' : 'tab'} onClick={() => setTab('users')}>
          Users ({users.length})
        </button>
        <button type="button" className={tab === 'transactions' ? 'tab active' : 'tab'} onClick={() => setTab('transactions')}>
          Transactions ({transactions.length})
        </button>
      </div>

      {loading ? (
        <div className="card">
          <p className="loading"><span className="spinner" />Loading admin data...</p>
        </div>
      ) : tab === 'overview' && stats ? (
        <>
          <div className="stat-grid">
            <div className="card stat">
              <span className="stat-label">Users</span>
              <strong className="stat-value">{stats.users}</strong>
            </div>
            <div className="card stat">
              <span className="stat-label">Accounts</span>
              <strong className="stat-value">{stats.accounts}</strong>
            </div>
            <div className="card stat">
              <span className="stat-label">Total deposits</span>
              <strong className="stat-value">{formatMoney(stats.totalBalance)}</strong>
            </div>
            <div className="card stat">
              <span className="stat-label">Transaction volume</span>
              <strong className="stat-value">{formatMoney(totalVolume)}</strong>
            </div>
            <div className="card stat">
              <span className="stat-label">Ledger blocks</span>
              <strong className="stat-value">{stats.ledgerBlocks}</strong>
            </div>
            <div className="card stat">
              <span className="stat-label">Frozen accounts</span>
              <strong className="stat-value">{stats.frozenAccounts}</strong>
            </div>
          </div>

          <section className="card">
            <div className="section-title">
              <h2>Activity — last 7 days</h2>
              <span className="muted">{formatMoney(totalVolume)} total volume</span>
            </div>
            <div className="bar-chart">
              {activity.map((day) => (
                <div className="bar-col" key={day.key}>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        height: `${day.total > 0 ? Math.max(6, (day.total / maxActivity) * 100) : 2}%`
                      }}
                      title={formatMoney(day.total)}
                    />
                  </div>
                  <span className="bar-label">{day.label}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="two-col">
            <section className="card">
              <div className="section-title">
                <h2>Chain integrity</h2>
                <span className={stats.chainValid ? 'chip ok' : 'chip bad'}>
                  {stats.chainValid ? 'Verified' : 'Tampered'}
                </span>
              </div>
              <p className="muted">{stats.chainMessage}</p>
              <Link className="link-inline" to="/ledger">
                Inspect audit ledger →
              </Link>
            </section>

            <section className="card">
              <div className="section-title">
                <h2>Recent signups</h2>
                <button type="button" className="link-inline" onClick={() => setTab('users')}>
                  Manage users
                </button>
              </div>
              <ul className="activity">
                {recentUsers.map((user) => (
                  <li key={user.id}>
                    <span className="activity-icon debit">
                      {(user.username[0] ?? '?').toUpperCase()}
                    </span>
                    <div className="activity-main">
                      <strong>{user.username}</strong>
                      <small>{new Date(user.createdAt).toLocaleString()}</small>
                    </div>
                    <span className={user.role === 'ROLE_ADMIN' ? 'badge credit' : 'badge neutral'}>
                      {user.role === 'ROLE_ADMIN' ? 'Admin' : 'User'}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      ) : tab === 'users' ? (
        <section className="card">
          <div className="filters">
            <input
              placeholder="Search users by name, email or account number..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
            <span className="muted tablet-count">{filteredUsers.length} shown</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Account</th>
                  <th className="right">Balance</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.username}</strong>
                      <div className="muted tiny">{user.email}</div>
                    </td>
                    <td className="mono">{user.accountNumber ?? '—'}</td>
                    <td className="right">{formatMoney(user.balance)}</td>
                    <td>
                      <span className={user.role === 'ROLE_ADMIN' ? 'badge credit' : 'badge neutral'}>
                        {user.role === 'ROLE_ADMIN' ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td>
                      <span className={user.frozen ? 'badge debit' : 'badge neutral'}>
                        {user.frozen ? 'Frozen' : 'Active'}
                      </span>
                    </td>
                    <td className="right">
                      <div className="admin-actions">
                        <button
                          type="button"
                          className="btn ghost small-btn"
                          disabled={busyUser === user.id}
                          onClick={() => openEdit(user)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn ghost small-btn"
                          disabled={busyUser === user.id}
                          onClick={() => handleRole(user)}
                        >
                          {user.role === 'ROLE_ADMIN' ? 'Make user' : 'Make admin'}
                        </button>
                        <button
                          type="button"
                          className="btn ghost small-btn"
                          disabled={busyUser === user.id}
                          onClick={() => handleFreeze(user)}
                        >
                          {user.frozen ? 'Unfreeze' : 'Freeze'}
                        </button>
                        <button
                          type="button"
                          className="btn ghost small-btn danger"
                          disabled={busyUser === user.id || user.username === currentAdmin}
                          title={user.username === currentAdmin ? 'You cannot delete yourself' : 'Delete user'}
                          onClick={() => handleDelete(user)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredUsers.length === 0 && <p className="empty">No users match your search.</p>}
        </section>
      ) : (
        <section className="card">
          <div className="filters">
            <input
              placeholder="Search by type, account, description or amount..."
              value={txSearch}
              onChange={(e) => setTxSearch(e.target.value)}
            />
            <select value={txFilter} onChange={(e) => setTxFilter(e.target.value as TxFilter)}>
              <option value="ALL">All types</option>
              <option value="DEPOSIT">Deposits</option>
              <option value="WITHDRAW">Withdrawals</option>
              <option value="TRANSFER">Transfers</option>
            </select>
            <button type="button" className="btn ghost" onClick={exportTransactions}>
              Export CSV
            </button>
          </div>
          <p className="muted tiny">
            Showing {filteredTransactions.length} of {transactions.length} transactions. Ledger entries
            are append-only and cannot be edited or deleted.
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Description</th>
                  <th className="right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{new Date(tx.createdAt).toLocaleString()}</td>
                    <td>
                      <span className="badge neutral">{TX_LABEL[tx.type]}</span>
                    </td>
                    <td className="mono">{tx.fromAccountNumber ?? '—'}</td>
                    <td className="mono">{tx.toAccountNumber ?? '—'}</td>
                    <td>{tx.description ?? '—'}</td>
                    <td className="right money">{formatMoney(tx.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredTransactions.length === 0 && <p className="empty">No transactions match your search.</p>}
        </section>
      )}

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2>Edit user</h2>
              <button type="button" className="icon-btn" onClick={() => setEditing(null)} aria-label="Close">
                ×
              </button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <label>
                Username
                <input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
              </label>
              <label>
                Email
                <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </label>
              <label>
                Role
                <select value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                  <option value="ROLE_USER">User</option>
                  <option value="ROLE_ADMIN">Administrator</option>
                </select>
              </label>
              <div className="modal-actions">
                <button type="button" className="btn ghost" onClick={() => setEditing(null)}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
