import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  deposit,
  formatMoney,
  getAccount,
  getToken,
  getTransactions,
  transfer,
  withdraw,
  type Account,
  type Transaction
} from '../api';

type Mode = 'transfer' | 'deposit' | 'withdraw';

const MODE_LABEL: Record<Mode, string> = {
  transfer: 'Send money',
  deposit: 'Add funds',
  withdraw: 'Withdraw'
};

export default function Transfer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = (searchParams.get('tab') as Mode) ?? 'transfer';
  const [mode, setMode] = useState<Mode>(
    initial === 'deposit' || initial === 'withdraw' ? initial : 'transfer'
  );
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [target, setTarget] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    Promise.all([getAccount(token), getTransactions(token)])
      .then(([acc, txs]) => {
        setAccount(acc);
        setTransactions(txs);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load account'));
  }, []);

  const recipients = useMemo(() => {
    const own = account?.accountNumber;
    const set = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.fromAccountNumber && tx.fromAccountNumber !== own) set.add(tx.fromAccountNumber);
      if (tx.toAccountNumber && tx.toAccountNumber !== own) set.add(tx.toAccountNumber);
    });
    return Array.from(set).slice(0, 6);
  }, [transactions, account]);

  function selectMode(next: Mode) {
    setMode(next);
    setError('');
    setNotice('');
    setSearchParams({ tab: next });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const token = getToken();
    if (!token) return;

    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter an amount greater than zero');
      return;
    }
    if (mode === 'transfer' && !target.trim()) {
      setError('Enter a destination account number');
      return;
    }

    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      let updated: Account;
      if (mode === 'deposit') {
        updated = await deposit(token, value, description);
      } else if (mode === 'withdraw') {
        updated = await withdraw(token, value, description);
      } else {
        updated = await transfer(token, target.trim(), value, description);
      }
      setAccount(updated);
      const txs = await getTransactions(token);
      setTransactions(txs);
      setNotice(`${MODE_LABEL[mode]} of ${formatMoney(value)} completed and recorded in the ledger.`);
      setAmount('');
      setTarget('');
      setDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Move money</h1>
          <p className="muted">Send, add, or withdraw funds. Balance {account ? formatMoney(account.balance) : '—'}.</p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}
      {account?.frozen && (
        <div className="alert error">
          This account is frozen. Ask an administrator to reactivate it before moving money.
        </div>
      )}

      <div className="two-col">
        <section className="card">
          <div className="tabs">
            {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                className={m === mode ? 'tab active' : 'tab'}
                onClick={() => selectMode(m)}
              >
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {mode === 'transfer' && (
              <label>
                Destination account
                <input
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="12-digit account number"
                  inputMode="numeric"
                />
              </label>
            )}
            {mode === 'transfer' && recipients.length > 0 && (
              <div className="recipients">
                <span className="muted">Recent recipients</span>
                <div className="chips">
                  {recipients.map((r) => (
                    <button key={r} type="button" className="chip-btn" onClick={() => setTarget(r)}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <label>
              Amount
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                inputMode="decimal"
              />
            </label>
            <label>
              Description (optional)
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this for?"
                maxLength={150}
              />
            </label>
            <button type="submit" disabled={submitting || Boolean(account?.frozen)}>
              {submitting ? 'Processing...' : MODE_LABEL[mode]}
            </button>
          </form>
        </section>

        <section className="card">
          <h2>Balance</h2>
          <p className="balance-small">{account ? formatMoney(account.balance) : '—'}</p>
          <div className="account-row">
            <span className="muted">Your account</span>
            <code className="mono">{account?.accountNumber ?? '—'}</code>
          </div>
          <p className="muted small-note">
            Transfers are instant in this demo. Every movement is permanently linked into the
            tamper-evident audit ledger.
          </p>
        </section>
      </div>
    </div>
  );
}
