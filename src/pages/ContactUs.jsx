import React, { useState, useEffect } from 'react';
import { Mail, Send, Clock, CheckCircle, Loader, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { ref, push, set, onValue, get } from 'firebase/database';
import { sendNotification } from '../utils/notificationUtils';

export default function ContactUs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({ name: user?.fullName || '', email: user?.email || '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [myQueries, setMyQueries] = useState([]);

  useEffect(() => {
    if (!user) return;
    const queriesRef = ref(db, 'queries');
    const unsubscribe = onValue(queriesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const queriesList = Object.entries(data)
          .filter(([_, q]) => q.userId === user.uid)
          .map(([id, q]) => ({ id, ...q }))
          .sort((a, b) => b.timestamp - a.timestamp);
        setMyQueries(queriesList);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;

    setIsSubmitting(true);
    try {
      const queriesRef = ref(db, 'queries');
      const newQueryRef = push(queriesRef);
      await set(newQueryRef, {
        userId: user ? user.uid : 'guest',
        name: formData.name,
        email: formData.email,
        message: formData.message,
        timestamp: Date.now(),
        status: 'pending' // pending, resolved
      });
      setSuccess(true);
      
      // Secondary logic after query is safely saved
      try {
        if (user) {
          // Notify the user themselves
          sendNotification(user.uid, {
            title: 'Query Submitted',
            message: 'Your query has been received. Our support team will get back to you shortly.',
            type: 'system'
          });
          
          // Notify any admins via the Global Admin Channel. 
          // This avoids the need to scan all users (and permissions issues).
          sendNotification('admin_global', {
            title: 'New Support Query',
            message: `A new query has been submitted by ${formData.name}.`,
            type: 'offer',
            link: '/admin/queries'
          });
        }
      } catch (e) {
        console.warn("Notification triggers failed but query was saved:", e);
      }
      
      setFormData({ ...formData, message: '' });
      setTimeout(() => setSuccess(false), 5000);
    } catch (error) {
      console.error('Error submitting query:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '4rem auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '1rem' }}>Contact Support</h1>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Need help? Reach out to us directly at <strong>support@newbiehub.com</strong> or fill out the form below.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        <div className="card" style={{ padding: '2rem' }}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <CheckCircle size={64} color="var(--success)" style={{ margin: '0 auto', marginBottom: '1rem' }} />
              <h2 style={{ color: 'var(--success)', marginBottom: '1rem' }}>Message Sent!</h2>
              <p style={{ color: 'var(--text-muted)' }}>We have received your query and will respond to your email shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Your Name</label>
                <input type="text" className="form-input" placeholder="John Doe" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input type="email" className="form-input" placeholder="you@example.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea className="form-input" rows="5" placeholder="How can we help?" value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} required></textarea>
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem' }} disabled={isSubmitting}>
                {isSubmitting ? <><Loader size={20} className="spin" /> Sending...</> : <><Send size={20} /> Send Message</>}
              </button>
            </form>
          )}
        </div>

        {user && myQueries.length > 0 && (
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={24} color="var(--primary)" /> My Sent Queries
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {myQueries.map((q) => (
                <div key={q.id} style={{ padding: '1rem', background: 'var(--bg-hover)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      {new Date(q.timestamp).toLocaleString()}
                    </strong>
                    <span style={{ 
                      fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: 'bold',
                      background: q.status === 'resolved' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: q.status === 'resolved' ? 'var(--success)' : 'var(--warning)'
                    }}>
                      {q.status === 'resolved' ? 'Resolved' : 'Pending'}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-main)' }}>{q.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
