import { useEffect, useState } from 'react';
import { PrivateRoute } from '../routes/PrivateRoute';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Loader } from '../components/ui/Loader';

type ReferralLink = {
  _id: string;
  code: string;
  name?: string;
  status: 'active' | 'paused';
  productId?: string | null;
  createdAt: string;
};

type Coupon = {
  _id: string;
  code: string;
  name?: string;
  status: 'active' | 'paused' | 'expired';
  discountType: 'percent' | 'fixed';
  discountValue: number;
  createdAt: string;
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

export default function AffiliateTools() {
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<ReferralLink[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [newLinkName, setNewLinkName] = useState('');
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState(10);

  const load = async () => {
    try {
      setError(null);
      setLoading(true);
      const [l, c] = await Promise.all([
        api.get('/reseller/referral-links'),
        api.get('/reseller/coupons'),
      ]);
      setLinks(l.data?.data ?? []);
      setCoupons(c.data?.data ?? []);
    } catch {
      setError('Unable to load affiliate tools');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createLink = async () => {
    await api.post('/reseller/referral-links', { name: newLinkName });
    setNewLinkName('');
    await load();
  };

  const toggleLink = async (id: string, status: string) => {
    await api.put(`/reseller/referral-links/${id}`, { status: status === 'active' ? 'paused' : 'active' });
    await load();
  };

  const createCoupon = async () => {
    await api.post('/reseller/coupons', { code: newCouponCode || undefined, discountType: 'percent', discountValue: newCouponDiscount });
    setNewCouponCode('');
    await load();
  };

  const toggleCoupon = async (id: string, status: string) => {
    await api.put(`/reseller/coupons/${id}`, { status: status === 'active' ? 'paused' : 'active' });
    await load();
  };

  if (loading) return <Loader text="Loading affiliate tools..." />;

  return (
    <PrivateRoute>
      <div className="stack">
        <div>
          <h1 className="title-xl">Affiliate Tools</h1>
          <div className="text-muted" style={{ fontSize: 14 }}>Create referral links and coupons for attribution.</div>
        </div>

        {error && <div className="text-muted" style={{ color: 'var(--error)' }}>{error}</div>}

        <div className="grid-2">
          <Card>
            <div className="row-between" style={{ marginBottom: 12 }}>
              <div className="title-lg">Referral Links</div>
              <button className="btn btn-primary" onClick={createLink} disabled={!newLinkName.trim()}>+ Create</button>
            </div>
            <div className="stack-sm" style={{ marginBottom: 12 }}>
              <div className="label">Name</div>
              <input style={inputStyle} value={newLinkName} onChange={(e) => setNewLinkName(e.target.value)} placeholder="e.g. Instagram Bio" />
            </div>
            <div className="stack-sm">
              {links.map((l) => (
                <div key={l._id} className="row-between" style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{l.name || 'Untitled'}</div>
                    <div className="text-muted" style={{ fontSize: 12 }}>
                      code: <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace' }}>{l.code}</span>
                    </div>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <button className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(l.code)}>Copy code</button>
                    <button className="btn btn-secondary" onClick={() => toggleLink(l._id, l.status)}>{l.status === 'active' ? 'Pause' : 'Activate'}</button>
                  </div>
                </div>
              ))}
              {links.length === 0 && <div className="text-muted" style={{ fontSize: 14 }}>No referral links yet.</div>}
            </div>
          </Card>

          <Card>
            <div className="row-between" style={{ marginBottom: 12 }}>
              <div className="title-lg">Coupons</div>
              <button className="btn btn-primary" onClick={createCoupon}>+ Create</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 10, marginBottom: 12 }}>
              <div>
                <div className="label">Coupon Code (optional)</div>
                <input style={inputStyle} value={newCouponCode} onChange={(e) => setNewCouponCode(e.target.value)} placeholder="Leave blank to auto-generate" />
              </div>
              <div>
                <div className="label">Discount %</div>
                <input style={inputStyle} type="number" min={0} value={newCouponDiscount} onChange={(e) => setNewCouponDiscount(Number(e.target.value))} />
              </div>
            </div>
            <div className="stack-sm">
              {coupons.map((c) => (
                <div key={c._id} className="row-between" style={{ padding: 10, border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{c.code}</div>
                    <div className="text-muted" style={{ fontSize: 12 }}>{c.discountType} {c.discountValue}{c.discountType === 'percent' ? '%' : ''} • {c.status}</div>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <button className="btn btn-secondary" onClick={() => navigator.clipboard.writeText(c.code)}>Copy</button>
                    <button className="btn btn-secondary" onClick={() => toggleCoupon(c._id, c.status)}>{c.status === 'active' ? 'Pause' : 'Activate'}</button>
                  </div>
                </div>
              ))}
              {coupons.length === 0 && <div className="text-muted" style={{ fontSize: 14 }}>No coupons yet.</div>}
            </div>
          </Card>
        </div>
      </div>
    </PrivateRoute>
  );
}

