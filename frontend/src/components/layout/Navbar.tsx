import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { BeamLogo } from '../BeamLogo'; // Check path
import { useAuth } from '../../contexts/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleMobile = () => setMobileOpen((v) => !v);
  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <header className="header">
        <div className="header-inner container">
          <Link to="/" className="row">
            <BeamLogo size={24} />
          </Link>
          <nav className="nav">
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Dashboard</NavLink>
            <NavLink to="/products" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Products</NavLink>
            <NavLink to="/transactions" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Transactions</NavLink>
            <NavLink to="/marketing" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Marketing</NavLink>
            <NavLink to="/affiliate-tools" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Affiliate Tools</NavLink>
            <NavLink to="/reports" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Reports</NavLink>
            <NavLink to="/payouts" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Payouts</NavLink>
            <NavLink to="/profile" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>Profile</NavLink>
          </nav>
          <button className="mobile-nav-toggle" aria-label="Toggle navigation" onClick={toggleMobile}>
            <span></span>
            <span></span>
            <span></span>
          </button>
          <div className="row" style={{ gap: 20 }}>
            {user ? (
              <>
                <span style={{ fontSize: 14, color: '#334155' }}>{user.name}</span>
                <button onClick={logout} className="btn btn-ghost">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link">Login</Link>
                <Link to="/signup" className="btn btn-primary">Sign up</Link>
              </>
            )}
          </div>
        </div>
        <div className={mobileOpen ? 'mobile-nav open' : 'mobile-nav'}>
          <Link to="/dashboard" onClick={closeMobile}>Dashboard</Link>
          <Link to="/products" onClick={closeMobile}>Products</Link>
          <Link to="/transactions" onClick={closeMobile}>Transactions</Link>
          <Link to="/marketing" onClick={closeMobile}>Marketing</Link>
          <Link to="/affiliate-tools" onClick={closeMobile}>Affiliate Tools</Link>
          <Link to="/reports" onClick={closeMobile}>Reports</Link>
          <Link to="/payouts" onClick={closeMobile}>Payouts</Link>
          <Link to="/profile" onClick={closeMobile}>Profile</Link>
        </div>
      </header>
    </>
  );
}
