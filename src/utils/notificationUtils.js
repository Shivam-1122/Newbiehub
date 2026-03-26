import { db } from '../firebase';
import { ref, push, set, get } from 'firebase/database';

/**
 * Send an in-app notification to a user.
 * Stored at: notifications/{userId}/{notifId}
 * 
 * @param {string} toUserId - The recipient user ID
 * @param {object} options
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification body
 * @param {string} options.type - 'offer' | 'payment' | 'chat' | 'project' | 'system'
 * @param {string} [options.link] - Optional in-app link to navigate to
 */
export async function sendNotification(toUserId, { title, message, type = 'system', link = null }) {
  if (!toUserId) return;

  try {
    // Check if user has notifications enabled (default: true)
    const prefsRef = ref(db, `users/${toUserId}/notificationPrefs`);
    const prefsSnap = await get(prefsRef);
    const prefs = prefsSnap.exists() ? prefsSnap.val() : {};

    // If user disabled in-app notifications, skip
    if (prefs.inApp === false) return;

    const notifRef = ref(db, `notifications/${toUserId}`);
    const newNotif = push(notifRef);
    await set(newNotif, {
      title,
      message,
      type,
      link,
      read: false,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to send notification:', err);
  }
}

/**
 * Notification types and their configs
 */
export const NOTIF_TYPES = {
  offer: { icon: '📋', color: 'var(--primary)' },
  payment: { icon: '💰', color: 'var(--success)' },
  chat: { icon: '💬', color: '#8b5cf6' },
  project: { icon: '📦', color: 'var(--warning)' },
  system: { icon: '🔔', color: 'var(--text-muted)' }
};
