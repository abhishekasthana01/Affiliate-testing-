import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import CustomerNavBar from '../components/layout/CustomerNavBar';
import Footer from '../components/layout/Footer';
import { RealtimeNotifications } from '../components/RealtimeNotifications';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { setTheme } = useTheme();
  const location = useLocation();
  const isCustomer = location.pathname.startsWith('/customer');
  const isAdmin = location.pathname.startsWith('/admin');

  // Sync theme with user role
  useEffect(() => {
    if (isCustomer) {
      setTheme('user');
    } else if (isAdmin) {
      // Admin UI uses the primary (pink) palette for consistency.
      setTheme('user');
    } else if (user?.role === 'reseller') {
      setTheme('partner');
    } else if (user?.role === 'admin') {
      setTheme('merchant');
    } else {
      setTheme('user');
    }
  }, [user, isCustomer, isAdmin, setTheme]);

  // Admin area uses its own full-screen layout (AdminLayout) and should not be wrapped
  // with the normal navbar/footer/container constraints.
  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div style={{ minHeight: '100%' }}>
      {isCustomer ? (
        <CustomerNavBar />
      ) : (
        <Navbar />
      )}
      <main className="container section">{children}</main>
      <Footer />
      {!isCustomer && <RealtimeNotifications />}
    </div>
  );
}
