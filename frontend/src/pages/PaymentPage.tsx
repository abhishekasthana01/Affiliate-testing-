import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { ErrorState } from '../components/ui/ErrorState';
import { Button } from '../components/ui/Button';

type State = { productId?: string; resellerId?: string | null };

export default function PaymentPage() {
  const nav = useNavigate();
  const { state } = useLocation();
  const { productId } = (state || {}) as State;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) setError('Missing product');
  }, [productId]);

  const startPayment = async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/checkout/start', { productId });
      const { redirectUrl } = res.data?.data || {};
      if (redirectUrl) {
        window.location.href = redirectUrl; // backend decides payment gateway
      } else {
        // If gateway returns immediately, route to success/failure based on backend response
        const status = res.data?.data?.status as 'success'|'failure'|undefined;
        nav(status === 'success' ? '/customer/payment/success' : '/customer/payment/failure');
      }
    } catch (err: any) {
      const devMock = String(import.meta.env.VITE_DEV_MOCK_API || '').toLowerCase() === 'true';
      if (devMock) {
        nav('/customer/payment/success');
      } else {
        setError(err?.response?.data?.message || 'Unable to start payment');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480 }}>
      <h2 className="title-lg">Checkout</h2>
      <p className="text-muted" style={{ marginTop: 8, fontSize: 14 }}>You will be redirected to our secure payment gateway.</p>
      {error && <div style={{ marginTop: 12 }}><ErrorState message={error} /></div>}
      <div style={{ marginTop: 24 }}>
        <Button onClick={startPayment} loading={loading}>Pay now</Button>
      </div>
    </div>
  );
}
