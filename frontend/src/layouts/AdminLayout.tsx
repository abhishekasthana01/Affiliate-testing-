import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from './AdminLayout.module.css';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { path: '/admin', icon: '📊', label: 'Dashboard' },
  { path: '/admin/users', icon: '👥', label: 'Users' },
  { path: '/admin/products', icon: '📦', label: 'Products' },
  { path: '/admin/orders', icon: '🛒', label: 'Orders' },
  { path: '/admin/affiliates', icon: '🤝', label: 'Affiliates' },
  { path: '/admin/payouts', icon: '💰', label: 'Payouts' },
  { path: '/admin/analytics', icon: '📈', label: 'Analytics' },
  { path: '/admin/campaigns', icon: '📧', label: 'Campaigns' },
  { path: '/admin/segments', icon: '🧩', label: 'Segments' },
  { path: '/admin/leaderboard', icon: '🏆', label: 'Leaderboard' },
  { path: '/admin/invites', icon: '✉️', label: 'Admin Invites' },
  { path: '/admin/fraud', icon: '🔒', label: 'Fraud Detection' },
  { path: '/admin/settings', icon: '⚙️', label: 'Settings' },
  { path: '/admin/audit-logs', icon: '📋', label: 'Audit Logs' },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeLabel =
    menuItems.find((i) => location.pathname === i.path || (i.path !== '/admin' && location.pathname.startsWith(i.path)))
      ?.label || 'Admin';

  return (
    <div className={styles.shell}>
      <aside className={`${styles.sidebar} ${!sidebarOpen ? styles.sidebarCollapsed : ''}`}>
        <div className={styles.brand}>
          {sidebarOpen ? (
            <div className={styles.brandTitle}>
              <strong>Admin Panel</strong>
              <span>Beam Affiliate Platform</span>
            </div>
          ) : (
            <strong>AP</strong>
          )}
          <button className={styles.collapseBtn} onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle sidebar">
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className={styles.nav}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.path !== '/admin' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              >
                <span className={styles.icon} aria-hidden="true">{item.icon}</span>
                {sidebarOpen && <span className={styles.label}>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={styles.footer}>
          {sidebarOpen && (
            <div className={styles.user}>
              <div className={styles.userName}>{user?.name || 'Admin'}</div>
              <div className={styles.userEmail}>{user?.email || ''}</div>
            </div>
          )}
          <div className={styles.footerActions}>
            <Link to="/dashboard" className={styles.actionLink}>Reseller</Link>
            <button onClick={logout} className={`${styles.actionBtn} ${styles.logoutBtn}`}>Logout</button>
          </div>
        </div>
      </aside>

      <main className={`${styles.main} ${!sidebarOpen ? styles.mainCollapsed : ''}`}>
        <div className={styles.topbar}>
          <div>
            <div className={styles.crumbs}>{activeLabel}</div>
            <div className={styles.subtle}>Admin workspace • secure access</div>
          </div>
          <div className={styles.subtle}>{user?.email}</div>
        </div>
        {children}
      </main>
    </div>
  );
}
