import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Rocket, Menu } from 'lucide-react';
import Drawer from './Drawer';
import NotificationBell from './NotificationBell';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const location = useLocation();
  const path = location.pathname;
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { user } = useAuth();

  let dashboardLink = '/';
  if (user) {
    if (user.role === 'admin') dashboardLink = '/admin/dashboard';
    else if (user.role === 'developer') dashboardLink = '/dev/dashboard';
    else dashboardLink = '/buyer/dashboard';
  }

  return (
    <>
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => setIsDrawerOpen(true)} style={{ color: 'var(--text-main)', marginTop: '4px' }}>
            <Menu size={24} />
          </button>
          <Link to="/" className="nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <img src="/logo.png" alt="NewbieHub" style={{ height: '38px', width: 'auto', borderRadius: '4px' }} />
            <span style={{ 
              fontWeight: '900', 
              fontSize: '1.6rem', 
              letterSpacing: '-1px', 
              color: 'var(--text-main)',
              fontFamily: "'Outfit', sans-serif"
            }}>NEWBIEHUB</span>
          </Link>
        </div>
        
        <div className="nav-links">
          <div className="nav-desktop-only" style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <Link to="/" className={`nav-link ${path === '/' ? 'active' : ''}`}>Home</Link>
            {user?.role !== 'admin' && (
              <>
                <Link to="/about" className={`nav-link ${path === '/about' ? 'active' : ''}`}>About Us</Link>
                <Link to="/contact" className={`nav-link ${path === '/contact' ? 'active' : ''}`}>Contact Us</Link>
              </>
            )}
            
            {user ? (
              <>
                {user.role === 'admin' ? (
                  <>
                    <Link to="/admin/dashboard" className={`nav-link ${location.pathname === '/admin/dashboard' ? 'active' : ''}`}>Dashboard</Link>
                    <Link to="/admin/queries" className={`nav-link ${location.pathname === '/admin/queries' ? 'active' : ''}`}>Support Queries</Link>
                  </>
                ) : (
                  <Link to={dashboardLink} className={`nav-link ${path.includes('dashboard') ? 'active' : ''}`}>
                    Dashboard
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link to="/login" className="btn-outline">
                  Login
                </Link>
                <Link to="/signup" className="btn-primary">
                  Sign Up
                </Link>
              </>
            )}
          </div>
          
          {user && <NotificationBell />}
        </div>
      </nav>
      
      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </>
  );
}
