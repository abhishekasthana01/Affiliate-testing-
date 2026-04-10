import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Loader } from '../components/ui/Loader';
import { ErrorState } from '../components/ui/ErrorState';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

type Payout = { id: string; date: string; amount: number; status: 'processing'|'paid'|'failed' };

export default function Payouts() {
  const [items, setItems] = useState<Payout[]>([]);
  const [ledger, setLedger] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/reseller/payouts'),
      api.get('/reseller/wallet/ledger'),
    ])
      .then(([p, l]) => {
        setItems(p.data?.data ?? []);
        setLedger(l.data?.data ?? null);
      })
      .catch(() => setError('Unable to load payouts'))
      .finally(() => setLoading(false));
  }, []);

  const requestPayout = async () => {
    try {
      setRequesting(true);
      setError(null);
      await api.post('/reseller/payouts', { amount, method: 'beam_wallet' });
      const [p, l] = await Promise.all([
        api.get('/reseller/payouts'),
        api.get('/reseller/wallet/ledger'),
      ]);
      setItems(p.data?.data ?? []);
      setLedger(l.data?.data ?? null);
      setAmount(0);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Payout request failed');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div>
      {loading && <Loader text="Loading payouts..." />}
      {error && <ErrorState message={error} />}
      {!loading && !error && (
        <Card style={{ marginBottom: 12 }}>
          <div className="row-between">
            <div>
              <div className="text-muted" style={{ fontSize: 12 }}>Available balance</div>
              <div style={{ fontSize: 20, fontWeight: 800 }}>
                {ledger?.wallet?.currency || 'USD'} {Number(ledger?.wallet?.availableBalance || 0).toLocaleString()}
              </div>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <input
                className="input"
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="Amount"
                style={{ width: 160 }}
              />
              <Button variant="primary" loading={requesting} onClick={requestPayout}>
                Request payout
              </Button>
            </div>
          </div>
        </Card>
      )}
      {!loading && !error && items.length === 0 && (
        <div className="text-muted" style={{ fontSize: 14 }}>No payouts yet.</div>
      )}
      <div className="stack-sm">
        {items.map((p) => (
          <Card key={p.id}>
            <div className="row-between">
              <div className="text-muted" style={{ fontSize: 14 }}>{new Date(p.date).toLocaleString()}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>€{p.amount.toLocaleString()}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: p.status==='paid' ? 'var(--success)' : p.status==='failed' ? 'var(--error)' : 'var(--warning)' }}>{p.status}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}