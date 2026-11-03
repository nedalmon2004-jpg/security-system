import { useEffect, useState } from 'react';
import { formatMoney, getAccount, getToken, getUsername, type Account } from '../api';

function groupNumber(value: string): string {
  const padded = value.padEnd(16, '0').slice(0, 16);
  return padded.replace(/(.{4})/g, '$1 ').trim();
}

export default function Cards() {
  const username = getUsername() ?? 'CARDHOLDER';
  const [account, setAccount] = useState<Account | null>(null);
  const [frozen, setFrozen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    getAccount(token)
      .then(setAccount)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load card'));
  }, []);

  const cardNumber = account ? groupNumber(account.accountNumber) : '•••• •••• •••• ••••';

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Cards</h1>
          <p className="muted">Your virtual debit card, linked to your account.</p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="two-col">
        <section className="card">
          <div className={frozen ? 'bank-card frozen' : 'bank-card'}>
            <div className="card-top">
              <span className="card-brand">SecureBank</span>
              <span className="card-network">DEBIT</span>
            </div>
            <div className="card-chip" />
            <div className="card-number">{showDetails ? cardNumber : '•••• •••• •••• ••••'}</div>
            <div className="card-bottom">
              <div>
                <small>Card holder</small>
                <span>{username.toUpperCase()}</span>
              </div>
              <div>
                <small>Expires</small>
                <span>12/29</span>
              </div>
              <div>
                <small>CVV</small>
                <span>{showDetails ? '482' : '•••'}</span>
              </div>
            </div>
          </div>

          <div className="card-actions">
            <button type="button" className="btn ghost" onClick={() => setShowDetails((v) => !v)}>
              {showDetails ? 'Hide details' : 'Show details'}
            </button>
            <button
              type="button"
              className={frozen ? 'btn' : 'btn ghost'}
              onClick={() => setFrozen((v) => !v)}
            >
              {frozen ? 'Unfreeze card' : 'Freeze card'}
            </button>
          </div>
          {frozen && <p className="error small-note">Card is frozen — payments are blocked.</p>}
        </section>

        <section className="card">
          <h2>Card overview</h2>
          {account ? (
            <dl className="details">
              <div>
                <dt>Linked account</dt>
                <dd className="mono">{account.accountNumber}</dd>
              </div>
              <div>
                <dt>Available balance</dt>
                <dd>{formatMoney(account.balance)}</dd>
              </div>
              <div>
                <dt>Card type</dt>
                <dd>Virtual debit</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd className={frozen ? 'error' : 'ok'}>{frozen ? 'Frozen' : 'Active'}</dd>
              </div>
            </dl>
          ) : (
            <p className="loading"><span className="spinner" />Loading card details...</p>
          )}
          <p className="muted small-note">
            Demo card. The number is derived from your account; no real payment network is connected.
          </p>
        </section>
      </div>
    </div>
  );
}
