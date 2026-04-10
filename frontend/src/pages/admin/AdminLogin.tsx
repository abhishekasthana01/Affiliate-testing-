import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import styles from './AdminLogin.module.css';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') {
      navigate('/admin');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      navigate('/admin');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.scope}>
        <Card className={styles.card}>
          <div className={styles.header}>
            <div className={styles.headerRow}>
              <div className={styles.badge} aria-hidden="true">
                <span style={{ fontSize: 22 }}>🛡️</span>
              </div>
              <div>
                <h1 className={styles.title}>Admin Portal</h1>
                <div className={styles.subtitle}>Beam Affiliate Platform • Secure access</div>
              </div>
            </div>
          </div>

          {error && <div className={styles.errorBox}>{error}</div>}

          <div className={styles.content}>
            <h2 className={styles.welcome}>Welcome back</h2>
            <div className={styles.hint}>Sign in to manage affiliates, payouts, analytics, and fraud controls.</div>

            <form onSubmit={handleSubmit} className={`stack-sm ${styles.form}`}>
              <Input
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="admin@beamwallet.com"
              />
              <Input
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                placeholder="Enter your password"
              />

              <div className={styles.ctaRow}>
                <Button type="submit" loading={loading} style={{ width: '100%' }}>
                  Sign In
                </Button>
              </div>
              <div className={styles.secureNote}>
                <span aria-hidden="true">🔒</span>
                <span>Protected by JWT + role-based access control.</span>
              </div>
            </form>

            <div className={styles.divider}>
              <Link to="/login" className={styles.backLink}>
                ← Back to Reseller Login
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
