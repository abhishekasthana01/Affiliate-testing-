import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { api } from '../../lib/api';

export default function AdminInviteAccept() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const token = useMemo(() => params.get('token') || '', [params]);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token) return setError('Missing invite token.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    try {
      setLoading(true);
      await api.post('/admin-invite/accept', { token, password, name: name || 'Admin' });
      setDone(true);
      setTimeout(() => nav('/admin/login'), 800);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invite acceptance failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 60%, var(--charcoal) 100%)',
    }}>
      <Card style={{ width: '100%', maxWidth: 520 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>Accept Admin Invite</div>
          <div className="text-muted" style={{ fontSize: 13 }}>
            Set your password to activate your admin account.
          </div>
        </div>

        {error && <div style={{ marginTop: 12 }}><ErrorState message={error} /></div>}
        {done && (
          <div style={{ marginTop: 12, padding: 12, border: '1px solid var(--border)', borderRadius: 12, background: '#F9FAFB' }}>
            Invite accepted. Redirecting to login…
          </div>
        )}

        <form onSubmit={submit} className="stack-sm" style={{ marginTop: 14 }}>
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Input label="Confirm password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          <Button type="submit" loading={loading} style={{ width: '100%' }}>Activate account</Button>
        </form>
      </Card>
    </div>
  );
}

