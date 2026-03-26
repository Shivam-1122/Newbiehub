import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Moon, Sun, Home, Compass, LogOut, User, Settings as SettingsIcon, Mail, Shield, ShieldCheck, MessageSquare, Loader } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { ref, onValue, get } from 'firebase/database';
import ChatUI from './ChatUI';

export default function Drawer({ isOpen, onClose }) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => {
    onClose();
    logout();
  };

  let dashLink = '/';
  if (user) {
    if (user.role === 'admin') dashLink = '/admin/dashboard';
    else if (user.role === 'developer') dashLink = '/dev/dashboard';
    else dashLink = '/buyer/dashboard';
  }

  return (
    <>
      <div 
        className={`drawer-overlay ${isOpen ? 'open' : ''}`} 
        onClick={onClose}
      />
      
      <div className={`drawer ${isOpen ? 'open' : ''}`}>
        <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--primary)' }}>Menu</h2>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: '1.5rem', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto' }}>
          
          {user ? (
            <div style={{ paddingBottom: '1rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem', wordBreak: 'break-all' }}>Account ID: {user.uid}</p>
              <Link to="/profile" onClick={onClose} className="btn-outline" style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '0.5rem' }}>
                <User size={20} /> My Profile
              </Link>
              <Link to="/messages" onClick={onClose} className="btn-outline" style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '0.5rem' }}>
                <MessageSquare size={20} /> Your Chats
              </Link>
              <Link to="/settings" onClick={onClose} className="btn-outline" style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '0.5rem' }}>
                <SettingsIcon size={20} /> Settings
              </Link>
              {user?.role === 'admin' && (
                <>
                  <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', marginTop: '1rem' }}>Admin Menu</h3>
                  <Link to="/admin/dashboard" onClick={onClose} className="btn-outline mobile-only" style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '0.5rem' }}>
                     <Shield size={20} /> Dashboard
                  </Link>
                  <Link to="/admin/queries" onClick={onClose} className="btn-outline mobile-only" style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '0.5rem' }}>
                     <Mail size={20} /> User Queries
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className="mobile-only" style={{ paddingBottom: '1rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
               <Link to="/login" onClick={onClose} className="btn-outline" style={{ justifyContent: 'center' }}>
                 Login
               </Link>
               <Link to="/signup" onClick={onClose} className="btn-primary" style={{ justifyContent: 'center' }}>
                 Sign Up
               </Link>
            </div>
          )}

          <Link to="/" onClick={onClose} className="btn-outline mobile-only" style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '0.5rem' }}>
            <Home size={20} /> Home
          </Link>

          {(!user || user?.role !== 'admin') && (
            <>
              <Link to="/about" onClick={onClose} className="btn-outline mobile-only" style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '0.5rem' }}>
                <Compass size={20} /> About Us
              </Link>
              <Link to="/contact" onClick={onClose} className="btn-outline mobile-only" style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '0.5rem' }}>
                <Mail size={20} /> Contact Us
              </Link>
            </>
          )}
          
          {user && user?.role !== 'admin' && (
            <Link to={dashLink} onClick={onClose} className="btn-outline mobile-only" style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent', padding: '0.5rem' }}>
              <Compass size={20} /> Dashboard
            </Link>
          )}

        </div>

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button 
            className="btn-outline" 
            style={{ width: '100%', justifyContent: 'center' }} 
            onClick={toggleTheme}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </button>
          
          <button 
            className="btn-outline" 
            style={{ width: '100%', justifyContent: 'center', border: 'none', background: 'transparent' }} 
            onClick={() => { navigate('/terms'); onClose(); }}
          >
            <ShieldCheck size={20} color="var(--primary)" /> Terms & Conditions
          </button>

          <button 
            className="btn-outline" 
            style={{ width: '100%', justifyContent: 'center', border: 'none', background: 'transparent' }} 
            onClick={() => { navigate('/privacy'); onClose(); }}
          >
            <Shield size={20} color="var(--primary)" /> Privacy Policy
          </button>

          {user && (
            <button 
              className="btn-primary" 
              style={{ width: '100%', justifyContent: 'center', background: 'var(--danger)', borderColor: 'var(--danger)' }} 
              onClick={handleLogout}
            >
              <LogOut size={20} /> Logout
            </button>
          )}
        </div>
      </div>
    </>
  );
}
