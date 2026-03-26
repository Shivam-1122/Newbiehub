import React, { useState } from 'react';
import { X, Send, DollarSign, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { ref, push, set } from 'firebase/database';
import { sendNotification } from '../utils/notificationUtils';

export default function NegotiationModal({ project, onClose }) {
  const { user } = useAuth();
  const [budget, setBudget] = useState(project.price ? project.price + 50 : 100);
  const [deadline, setDeadline] = useState(7);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSendOffer = async () => {
    if (!message.trim() || !budget || !user) return;
    if (!project || !project.authorId) {
       alert("Error: Developer information is missing for this project. Please refresh.");
       return;
    }

    setIsSending(true);
    try {
      const offersRef = ref(db, 'offers');
      const newOfferRef = push(offersRef);

      await set(newOfferRef, {
        projectId: project.id,
        projectTitle: project.title,
        buyerId: user.uid,
        buyerName: user.fullName || user.email.split('@')[0],
        sellerId: project.authorId,
        sellerName: project.authorName || 'Developer',
        message: message.trim(),
        budget: Number(budget),
        deadlineDays: Number(deadline),
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      setSent(true);

      // Notify the developer about the new offer
      sendNotification(project.authorId, {
        title: '📋 New Offer Received!',
        message: `${user.fullName || 'A buyer'} sent you an offer of ₹${budget} for "${project.title}"`,
        type: 'offer',
        link: '/dev/dashboard'
      });
    } catch (error) {
      console.error('Error sending offer:', error);
      alert('Failed to send offer. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 100
    }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '600px', padding: '2rem' }}>
        {sent ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h2 style={{ marginBottom: '0.5rem', color: 'var(--success)' }}>Offer Sent!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Your offer of ${budget} has been sent to {project.authorName || 'the developer'}. They will respond shortly.
            </p>
            <button className="btn-primary" onClick={onClose} style={{ padding: '0.8rem 2rem' }}>Close</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Request Changes for {project.title}</h2>
              <button onClick={onClose} className="btn-outline" style={{ padding: '0.5rem', border: 'none' }}><X /></button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Describe the changes you need:</label>
              <textarea 
                rows="5"
                className="form-input"
                style={{ width: '100%', resize: 'vertical' }}
                placeholder="E.g. I need you to add a Stripe payment gateway and change the primary color scheme to red..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isSending}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Proposed Budget (₹ INR):</label>
                <div style={{ position: 'relative' }}>
                  <DollarSign style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
                  <input 
                    type="number" 
                    className="form-input"
                    style={{ width: '100%', paddingLeft: '3rem', fontSize: '1.2rem' }}
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    disabled={isSending}
                    min="1"
                  />
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Timeperiod / Deadline (Days):</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="number" 
                    className="form-input"
                    style={{ width: '100%', fontSize: '1.2rem' }}
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    disabled={isSending}
                    min="1"
                  />
                </div>
              </div>
            </div>

            <button 
              className="btn-primary" 
              style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} 
              onClick={handleSendOffer}
              disabled={isSending || !message.trim()}
            >
              {isSending ? <><Loader size={20} className="spin" /> Sending...</> : <><Send size={20} /> Send Offer</>}
            </button>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '1rem' }}>
              Escrow System: Platform will hold the funds if accepted.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
