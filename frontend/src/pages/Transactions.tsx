import { useEffect, useMemo, useState } from 'react';
import {
  formatMoney,
  getToken,
  getTransactions,
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

const FILTERS: Array<'ALL' | 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER'> = [
  'ALL',
  'DEPOSIT',
  'WITHDRAW',
  'TRANSFER'
];

function isCredit(type: TransactionType): boolean {
  return type === 'DEPOSIT' || type === 'TRANSFER_IN';
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('ALL');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    getTransactions(token)
      .then(setTransactions)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load transactions'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const typeMatches =
        filter === 'ALL' ||
        tx.type === filter ||
        (filter === 'TRANSFER' && (tx.type === 'TRANSFER_IN' || tx.type === 'TRANSFER_OUT'));
      if (!typeMatches) return false;
      if (!search.trim()) return true;
      const haystack = [
        TX_LABEL[tx.type],
        tx.description ?? '',
        tx.fromAccountNumber ?? '',
        tx.toAccountNumber ?? '',
        String(tx.amount)
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(search.trim().toLowerCase());
    });
  }, [transactions, filter, search]);

  function exportCsv() {
    const header = 'Date,Type,Description,From,To,Amount';
    const rows = filtered.map((tx) =>
      [
        new Date(tx.createdAt).toISOString(),
        tx.type,
        `"${(tx.description ?? '').replace(/"/g, '""')}"`,
        tx.fromAccountNumber ?? '',
        tx.toAccountNumber ?? '',
        tx.amount.toFixed(2)
      ].join(',')
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'securebank-statement.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Transactions</h1>
          <p className="muted">Your complete account activity.</p>
        </div>
        <button className="btn ghost" onClick={exportCsv} type="button">
          Download statement
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}

      <section className="card">
        <div className="filters">
          <input
            placeholder="Search description, account or amount..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
            {FILTERS.map((f) => (
              <option key={f} value={f}>
                {f === 'ALL' ? 'All types' : f.charAt(0) + f.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="loading"><span className="spinner" />Loading transactions...</p>
        ) : filtered.length === 0 ? (
          <p className="empty">No matching transactions.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Details</th>
                  <th className="right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => {
                  const credit = isCredit(tx.type);
                  const counterparty =
                    tx.type === 'TRANSFER_OUT'
                      ? `to ${tx.toAccountNumber}`
                      : tx.type === 'TRANSFER_IN'
                        ? `from ${tx.fromAccountNumber}`
                        : tx.description ?? '—';
                  return (
                    <tr key={tx.id}>
                      <td>{new Date(tx.createdAt).toLocaleString()}</td>
                      <td>
                        <span className={credit ? 'badge credit' : 'badge debit'}>
                          {TX_LABEL[tx.type]}
                        </span>
                      </td>
                      <td>{counterparty}</td>
                      <td className={credit ? 'right money credit-text' : 'right money debit-text'}>
                        {credit ? '+' : '-'}
                        {formatMoney(tx.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted small-note">
          Showing {filtered.length} of {transactions.length} transactions
        </p>
      </section>
    </div>
  );
}
