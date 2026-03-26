import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { ref, onValue, update, remove } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { NOTIF_TYPES } from '../utils/notificationUtils';

let audioUnlocked = false;
const unlockAudio = () => {
  audioUnlocked = true;
  window.removeEventListener('click', unlockAudio);
  window.removeEventListener('touchstart', unlockAudio);
};
window.addEventListener('click', unlockAudio);
window.addEventListener('touchstart', unlockAudio);

const playNotificationSound = () => {
  if (!audioUnlocked) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {
    console.log("Audio play failed.");
  }
};

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [prefSound, setPrefSound] = useState(true);
  const dropdownRef = useRef(null);
  const prevHeadIdRef = useRef(null);
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    if (!user) return;
    const notifRef = ref(db, `notifications/${user.uid}`);
    const unsub = onValue(notifRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data)
          .map(([id, n]) => ({ id, ...n }))
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setNotifications(list);
      } else {
        setNotifications([]);
      }
    });

    // Also fetch sound preferences
    const prefsRef = ref(db, `users/${user.uid}/notificationPrefs`);
    const unsubPrefs = onValue(prefsRef, (snap) => {
      if (snap.exists()) {
        const prefs = snap.val();
        setPrefSound(prefs.sound !== false); // default to true
      } else {
        setPrefSound(true);
      }
    });

    return () => {
      unsub();
      unsubPrefs();
    };
  }, [user]);

  // Admin global notifications listener (Avoids scanning users)
  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    
    // Attach to the special global admin notification node
    const adminNotifRef = ref(db, `notifications/admin_global`);
    const unsubAdmin = onValue(adminNotifRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const globalList = Object.entries(data).map(([id, n]) => ({ id, ...n }));
        
        setNotifications(prev => {
           // Dedup to avoid duplicate sounds from multiple listeners
           const merged = [...prev];
           globalList.forEach(item => {
              if (!merged.find(m => m.id === item.id)) {
                 merged.push(item);
              }
           });
           return merged.sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        });
      }
    });

    return () => unsubAdmin();
  }, [user]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (notifications.length > 0) {
      const currentHeadId = notifications[0].id;
      
      // If this is the initial data load, don't ring (prevents old unread ringing on refresh)
      if (isFirstLoadRef.current) {
        prevHeadIdRef.current = currentHeadId;
        isFirstLoadRef.current = false;
        return;
      }

      // If head ID changed, a new notification arrived
      if (currentHeadId !== prevHeadIdRef.current && notifications[0].read === false) {
        if (prefSound) playNotificationSound();
        
        // Browser notification
        if ('Notification' in window) {
           if (Notification.permission === 'granted') {
             new Notification(notifications[0].title, { 
               body: notifications[0].message,
               icon: '/favicon.ico' 
             });
           }
        }
      }
      prevHeadIdRef.current = currentHeadId;
    } else {
      // If list was empty and stays empty, ensure we allow future ones to ring
      isFirstLoadRef.current = false;
    }
  }, [notifications, prefSound]);

  // Request notification permission on first mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const markAsRead = async (notifId) => {
    await update(ref(db, `notifications/${user.uid}/${notifId}`), { read: true });
  };

  const markAllRead = async () => {
    const updates = {};
    notifications.filter(n => !n.read).forEach(n => {
      updates[`notifications/${user.uid}/${n.id}/read`] = true;
    });
    if (Object.keys(updates).length > 0) {
      await update(ref(db), updates);
    }
  };

  const clearAll = async () => {
    if (notifications.length === 0) return;
    await remove(ref(db, `notifications/${user.uid}`));
  };

  const handleNotifClick = (notif) => {
    markAsRead(notif.id);
    if (notif.link) {
      navigate(notif.link);
      setIsOpen(false);
    }
  };

  const getTimeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  if (!user) return null;

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative', background: 'none', border: 'none',
          color: 'var(--text-main)', cursor: 'pointer', padding: '0.4rem',
          display: 'flex', alignItems: 'center'
        }}
        title="Notifications"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: '-2px', right: '-4px',
            background: 'var(--danger)', color: 'white', fontSize: '0.65rem',
            fontWeight: 'bold', borderRadius: '50%', width: '18px', height: '18px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'pulse 2s infinite'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="animate-fade-in" style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
          width: '360px', maxHeight: '480px', background: 'var(--bg-card)',
          borderRadius: '16px', boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-color)', overflow: 'hidden',
          zIndex: 2000, display: 'flex', flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            padding: '1rem 1.2rem', borderBottom: '1px solid var(--border-color)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🔔 Notifications
              {unreadCount > 0 && (
                <span style={{
                  background: 'var(--primary)', color: 'white', fontSize: '0.7rem',
                  padding: '0.15rem 0.5rem', borderRadius: '12px'
                }}>{unreadCount} new</span>
              )}
            </h3>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {unreadCount > 0 && (
                <button onClick={markAllRead} title="Mark all as read" style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--primary)', padding: '0.3rem'
                }}>
                  <CheckCheck size={16} />
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearAll} title="Clear all" style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', padding: '0.3rem'
                }}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Notification List */}
          <div style={{ overflowY: 'auto', maxHeight: '380px' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Bell size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                <p style={{ margin: 0, fontSize: '0.9rem' }}>No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 20).map(n => {
                const typeConfig = NOTIF_TYPES[n.type] || NOTIF_TYPES.system;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    style={{
                      padding: '0.8rem 1.2rem', cursor: n.link ? 'pointer' : 'default',
                      display: 'flex', gap: '0.8rem', alignItems: 'flex-start',
                      background: n.read ? 'transparent' : 'rgba(59, 130, 246, 0.04)',
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(59, 130, 246, 0.04)'}
                  >
                    {/* Icon */}
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `${typeConfig.color}15`, fontSize: '1.1rem'
                    }}>
                      {typeConfig.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <p style={{
                          margin: 0, fontSize: '0.85rem', fontWeight: n.read ? 'normal' : 'bold',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>
                          {n.title}
                        </p>
                        {!n.read && (
                          <div style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: 'var(--primary)', flexShrink: 0, marginTop: '0.3rem'
                          }} />
                        )}
                      </div>
                      <p style={{
                        margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {n.message}
                      </p>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'inline-block' }}>
                        {getTimeAgo(n.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
