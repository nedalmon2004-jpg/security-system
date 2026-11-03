import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  formatMoney,
  getAccount,
  getToken,
  getTransactions,
  getUsername,
  verifyLedger,
  type Account,
  type Transaction,
  type TransactionType,
  type VerifyResponse
} from '../api';

const TX_LABEL: Record<TransactionType, string> = {
  DEPOSIT: 'Deposit',
  WITHDRAW: 'Withdrawal',
  TRANSFER: 'Transfer',
  TRANSFER_IN: 'Transfer in',
  TRANSFER_OUT: 'Transfer out'
};

function isCredit(type: TransactionType): boolean {
  return type === 'DEPOSIT' || type === 'TRANSFER_IN';
}

export default function Overview() {
  const username = getUsername();
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [verification, setVerification] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    Promise.all([getAccount(token), getTransactions(token), verifyLedger(token)])
      .then(([acc, txs, verify]) => {
        setAccount(acc);
        setTransactions(txs);
        setVerification(verify);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load account'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="card">
        <p className="loading"><span className="spinner" />Loading your accounts...</p>
      </div>
    );
  }

  const recent = transactions.slice(0, 5);

  return (
    <div className="stack">
      {error && <div className="alert error">{error}</div>}
      {account?.frozen && (
        <div className="alert error">
          Your account is frozen. Deposits, withdrawals and transfers are blocked until an
          administrator reactivates it.
        </div>
      )}

      <div className="page-head">
        <div>
          <p className="muted">Welcome back</p>
          <h1>Hello, {username}</h1>
        </div>
        <span className="chip neutral">{new Date().toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
      </div>

      <div className="balance-grid">
        <section className="card balance-card">
          <p className="muted">Total available balance</p>
          <h1 className="balance">{account ? formatMoney(account.balance) : '—'}</h1>
          <div className="account-row">
            <span className="muted">Account number</span>
            <code className="mono">{account?.accountNumber ?? '—'}</code>
          </div>
        </section>

        <section className="card">
          <h2>Quick actions</h2>
          <p className="muted">Move money in seconds. Every action is written to the audit chain.</p>
          <div className="quick-actions">
            <Link className="quick-action" to="/transfer?tab=transfer">
              <span className="qa-icon">📤</span>
              <strong>Send money</strong>
              <span>Transfer to any account</span>
            </Link>
            <Link className="quick-action" to="/transfer?tab=deposit">
              <span className="qa-icon">📥</span>
              <strong>Add funds</strong>
              <span>Top up your balance</span>
            </Link>
            <Link className="quick-action" to="/transfer?tab=withdraw">
              <span className="qa-icon">🏧</span>
              <strong>Withdraw</strong>
              <span>Take money out</span>
            </Link>
          </div>
        </section>
      </div>

      <div className="two-col">
        <section className="card">
          <div className="section-title">
            <h2>Recent activity</h2>
            <Link className="link-inline" to="/transactions">
              View all
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="empty">No transactions yet. Use “Add funds” to get started.</p>
          ) : (
            <ul className="activity">
              {recent.map((tx) => {
                const credit = isCredit(tx.type);
                return (
                  <li key={tx.id}>
                    <span className={credit ? 'activity-icon credit' : 'activity-icon debit'}>
                      {credit ? '↓' : '↑'}
                    </span>
                    <div className="activity-main">
                      <strong>{TX_LABEL[tx.type]}</strong>
                      <small>{new Date(tx.createdAt).toLocaleString()}</small>
                    </div>
                    <span className={credit ? 'money credit-text' : 'money debit-text'}>
                      {credit ? '+' : '-'}
                      {formatMoney(tx.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="section-title">
            <h2>Security status</h2>
            {verification && (
              <span className={verification.valid ? 'chip ok' : 'chip bad'}>
                {verification.valid ? 'Verified' : 'Tampered'}
              </span>
            )}
          </div>
          <p className="muted">
            Every login and transaction is linked into a SHA-256 hash chain. If any record is
            altered, verification fails.
          </p>
          {verification && (
            <dl className="details">
              <div>
                <dt>Ledger blocks</dt>
                <dd>{verification.blocks}</dd>
              </div>
              <div>
                <dt>Chain integrity</dt>
                <dd className={verification.valid ? 'ok' : 'error'}>{verification.message}</dd>
              </div>
              <div>
                <dt>Account opened</dt>
                <dd>{account ? new Date(account.createdAt).toLocaleDateString() : '—'}</dd>
              </div>
            </dl>
          )}
          <Link className="link-inline" to="/ledger">
            Open audit ledger →
          </Link>
        </section>
      </div>
    </div>
  );
}
