import { useEffect, useState } from 'react';
import {
  getLedger,
  getToken,
  verifyLedger,
  type LedgerBlock,
  type VerifyResponse
} from '../api';

function shorten(hash: string): string {
  return `${hash.slice(0, 12)}...${hash.slice(-10)}`;
}

const EVENT_CLASS: Record<string, string> = {
  REGISTER: 'badge neutral',
  LOGIN_SUCCESS: 'badge credit',
  LOGIN_FAILED: 'badge debit',
  DEPOSIT: 'badge credit',
  WITHDRAW: 'badge debit',
  TRANSFER: 'badge neutral',
  ACCOUNT_CREATED: 'badge neutral',
  PASSWORD_CHANGED: 'badge credit',
  PASSWORD_CHANGE_FAILED: 'badge debit'
};

export default function Ledger() {
  const [blocks, setBlocks] = useState<LedgerBlock[]>([]);
  const [verification, setVerification] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    Promise.all([getLedger(token), verifyLedger(token)])
      .then(([chain, verify]) => {
        setBlocks(chain);
        setVerification(verify);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load ledger'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="stack">
      <section className="card">
        <div className="section-head">
          <div>
            <h1>Audit ledger</h1>
            <p className="muted">
              A blockchain-style chain where each block stores the SHA-256 hash of the previous one.
            </p>
          </div>
          {verification && (
            <span className={verification.valid ? 'chip ok' : 'chip bad'}>
              {verification.valid ? 'Chain valid' : 'Chain tampered'}
            </span>
          )}
        </div>
        {verification && (
          <p className={verification.valid ? 'ok' : 'error'}>
            {verification.blocks} block(s) — {verification.message}
          </p>
        )}
        {loading && <p className="loading"><span className="spinner" />Loading chain...</p>}
        {error && <p className="error">{error}</p>}
      </section>

      {blocks.length > 0 && (
        <section className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Event</th>
                  <th>User</th>
                  <th>Prev hash</th>
                  <th>Block hash</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {blocks.map((block) => (
                  <tr key={block.id}>
                    <td>{block.blockIndex}</td>
                    <td>
                      <span className={EVENT_CLASS[block.eventType] ?? 'badge neutral'}>
                        {block.eventType}
                      </span>
                    </td>
                    <td>{block.userId ?? '—'}</td>
                    <td className="mono">{shorten(block.prevHash)}</td>
                    <td className="mono">{shorten(block.blockHash)}</td>
                    <td>{new Date(block.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
