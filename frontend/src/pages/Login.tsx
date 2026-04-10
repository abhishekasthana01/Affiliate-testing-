import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Link, useNavigate } from 'react-router-dom';
import { ErrorState } from '../components/ui/ErrorState';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      nav('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <h2 className="title-lg">Login</h2>
      {error && <ErrorState message={error} />}
      <form onSubmit={onSubmit} className="stack" style={{ marginTop: 16 }}>
        <Input label="Email or Beam Number" type="text" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <div className="stack">
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <div style={{ textAlign: 'right', marginTop: -12 }}>
            <Link to="/forgot-password" style={{ fontSize: 12, color: 'var(--pink)', textDecoration: 'none' }}>
              Forgot password?
            </Link>
          </div>
        </div>
        <Button type="submit" loading={loading} style={{ width: '100%' }}>Login</Button>
      </form>
      <p className="text-muted" style={{ marginTop: 16, fontSize: 14 }}>Don't have an account? <Link to="/signup" className="nav-link" style={{ color: 'var(--pink)' }}>Sign up</Link></p>
      <p style={{ marginTop: 16, fontSize: 14, textAlign: 'center' }}>
        <Link to="/admin/login" style={{ color: 'var(--merchant)', textDecoration: 'none', fontWeight: 600 }}>
          🛡️ Admin Login
        </Link>
      </p>
    </div>
  );
}