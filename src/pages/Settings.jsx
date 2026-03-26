import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Bell, Shield, Moon, Sun, Trash2, AlertTriangle, UserCheck, CheckCircle, AlertCircle, Loader, ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { deleteUser, sendPasswordResetEmail, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { ref, remove, update, get } from 'firebase/database';

export default function Settings() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  const [notifications, setNotifications] = useState({ inApp: true, sound: true, email: true, chat: true, offers: true, payments: true });
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  
  const kycStatus = user?.kycStatus || 'pending';
  const [deletePassword, setDeletePassword] = useState('');

  // Load notification preferences from Firebase
  useEffect(() => {
    if (!user) return;
    const loadPrefs = async () => {
      try {
        const prefsSnap = await get(ref(db, `users/${user.uid}/notificationPrefs`));
        if (prefsSnap.exists()) {
          setNotifications({ ...notifications, ...prefsSnap.val() });
        }
      } catch (err) {
        console.error('Error loading notification prefs:', err);
      } finally {
        setNotifLoading(false);
      }
    };
    loadPrefs();
  }, [user]);

  // Save notification preferences to Firebase
  const saveNotificationPrefs = async () => {
    setNotifSaving(true);
    try {
      await update(ref(db, `users/${user.uid}`), {
        notificationPrefs: notifications
      });
      alert('Notification preferences saved!');
    } catch (err) {
      alert('Failed to save preferences.');
      console.error(err);
    } finally {
      setNotifSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      alert("Please enter your current password to confirm deletion.");
      return;
    }
    
    if (window.confirm("Are you absolutely sure you want to delete your account? This action is irreversible.")) {
      setIsDeleting(true);
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const credential = EmailAuthProvider.credential(currentUser.email, deletePassword);
          await reauthenticateWithCredential(currentUser, credential);
          await remove(ref(db, `users/${currentUser.uid}`));
          await remove(ref(db, `notifications/${currentUser.uid}`));
          await deleteUser(currentUser);
        }
        logout();
      } catch (error) {
        console.error('Delete error:', error);
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          alert('Incorrect password. Please try again.');
        } else {
          alert('Failed to delete account. Please authenticate again or contact support.');
        }
        setIsDeleting(false);
      }
    }
  };

  const handleSendPasswordReset = async () => {
    setChangingPassword(true);
    setPasswordMsg('');
    try {
      await sendPasswordResetEmail(auth, user.email);
      setPasswordMsg('Password reset email sent! Check your inbox.');
    } catch (error) {
      setPasswordMsg('Failed to send reset email. Please try again.');
    } finally {
      setChangingPassword(false);
    }
  };

  const NotifToggle = ({ label, description, checked, onChange, disabled }) => (
    <div style={{ 
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
      padding: '1rem', background: 'var(--bg-hover)', borderRadius: '10px',
      opacity: disabled ? 0.5 : 1
    }}>
      <div style={{ flex: 1 }}>
        <strong style={{ fontSize: '0.95rem' }}>{label}</strong>
        <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{description}</p>
      </div>
      <label style={{ 
        position: 'relative', display: 'inline-block', width: '48px', height: '26px', flexShrink: 0, marginLeft: '1rem'
      }}>
        <input 
          type="checkbox" 
          checked={checked} 
          onChange={onChange}
          disabled={disabled}
          style={{ opacity: 0, width: 0, height: 0 }} 
        />
        <span style={{
          position: 'absolute', cursor: disabled ? 'not-allowed' : 'pointer', 
          top: 0, left: 0, right: 0, bottom: 0,
          background: checked ? 'var(--primary)' : 'var(--border-color)',
          borderRadius: '26px', transition: 'all 0.3s ease'
        }}>
          <span style={{
            position: 'absolute', content: '""', height: '20px', width: '20px',
            left: checked ? '24px' : '3px', bottom: '3px',
            background: 'white', borderRadius: '50%', transition: 'all 0.3s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }} />
        </span>
      </label>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '2rem auto' }}>
      <button className="btn-back" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} /> Back
      </button>
      <h1 style={{ marginBottom: '2rem' }}>Account Settings</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Verification Status (For Developers) */}
        {user?.role === 'developer' && (
          <div className="card" style={{ padding: '2rem', border: kycStatus === 'verified' ? '1px solid var(--success)' : '1px solid var(--warning)' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <UserCheck size={20} color="var(--primary)" /> Identity Verification (KYC)
            </h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Status: <span style={{ color: kycStatus === 'verified' ? 'var(--success)' : 'var(--warning)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  {kycStatus === 'verified' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  {kycStatus === 'verified' ? 'Verified' : 'Pending Action'}
                </span></strong>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                  {kycStatus === 'verified' 
                    ? 'Your identity has been fully verified. You can withdraw funds and access all platform tools.' 
                    : 'A verified identity is required to withdraw funds and rank higher securely.'}
                </p>
              </div>
              {kycStatus !== 'verified' && (
                <button className="btn-primary" onClick={() => navigate('/dev/kyc')}>
                  Complete KYC
                </button>
              )}
            </div>
          </div>
        )}

        {/* Appearance & Preferences */}
        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Sun size={20} color="var(--primary)" /> Preferences
          </h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
            <div>
              <strong>Theme Mode</strong>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Toggle between Light and Dark mode.</p>
            </div>
            <button className="btn-outline" onClick={toggleTheme}>
               {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />} {theme === 'light' ? 'Switch to Dark' : 'Switch to Light'}
            </button>
          </div>
        </div>

        {/* Notifications - Now Functional */}
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Bell size={20} color="var(--primary)" /> Notifications
            </h2>
            <button 
              className="btn-primary" 
              onClick={saveNotificationPrefs} 
              disabled={notifSaving || notifLoading}
              style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              {notifSaving ? <Loader size={14} className="spin" /> : <Save size={14} />}
              {notifSaving ? 'Saving...' : 'Save'}
            </button>
          </div>

          {notifLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <Loader size={24} className="spin" />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <NotifToggle 
                label="In-App Notifications" 
                description="Show notification badge and dropdown alerts" 
                checked={notifications.inApp} 
                onChange={e => setNotifications({...notifications, inApp: e.target.checked})}
              />
              <NotifToggle 
                label="Notification Sounds" 
                description="Play a sound when you receive a new in-app notification" 
                checked={notifications.sound !== false} 
                onChange={e => setNotifications({...notifications, sound: e.target.checked})}
                disabled={!notifications.inApp}
              />
              <NotifToggle 
                label="New Chat Messages" 
                description="Get notified when someone sends you a message" 
                checked={notifications.chat} 
                onChange={e => setNotifications({...notifications, chat: e.target.checked})}
                disabled={!notifications.inApp}
              />
              <NotifToggle 
                label="Offers & Projects" 
                description="Alerts for new offers, acceptances, and project updates" 
                checked={notifications.offers} 
                onChange={e => setNotifications({...notifications, offers: e.target.checked})}
                disabled={!notifications.inApp}
              />
              <NotifToggle 
                label="Payments & Earnings" 
                description="Notifications for payments received, escrow funded, and withdrawals" 
                checked={notifications.payments} 
                onChange={e => setNotifications({...notifications, payments: e.target.checked})}
                disabled={!notifications.inApp}
              />
              <NotifToggle 
                label="Email Notifications" 
                description="Receive important updates via email (coming soon)" 
                checked={notifications.email} 
                onChange={e => setNotifications({...notifications, email: e.target.checked})}
              />

              {!notifications.inApp && (
                <p style={{ fontSize: '0.8rem', color: 'var(--warning)', textAlign: 'center', margin: '0.5rem 0 0' }}>
                  ⚠️ In-App notifications are off. You won't receive chat, offer, or payment alerts.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Security & Danger Zone */}
        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Shield size={20} color="var(--primary)" /> Security
          </h2>
          
          <div style={{ marginBottom: '2rem' }}>
            <p className="form-label">Password Reset</p>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button className="btn-outline" onClick={handleSendPasswordReset} disabled={changingPassword}>
                {changingPassword ? <Loader size={18} className="spin" /> : 'Send Password Reset Email'}
              </button>
            </div>
            {passwordMsg && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: passwordMsg.includes('sent') ? 'var(--success)' : 'var(--danger)' }}>
                {passwordMsg}
              </p>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--danger)', paddingTop: '2rem', marginTop: '1rem' }}>
            <h3 style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <AlertTriangle size={20} /> Danger Zone
            </h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Once you delete your account, there is no going back. Please be certain and enter your password to confirm.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input 
                type="password" 
                className="form-input" 
                placeholder="Confirm your password" 
                value={deletePassword} 
                onChange={e => setDeletePassword(e.target.value)}
                style={{ flex: 1 }}
                title="Your current password is required to delete the account"
              />
            </div>
            <button 
              onClick={handleDeleteAccount}
              disabled={isDeleting || !deletePassword}
              style={{ background: 'var(--danger)', color: 'white', padding: '0.8rem 1.5rem', borderRadius: 'var(--border-radius)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
              {isDeleting ? <Loader size={18} className="spin" /> : <Trash2 size={18} />} Delete Account
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
