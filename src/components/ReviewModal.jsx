import React, { useState } from 'react';
import { Star, X, Send, Loader } from 'lucide-react';
import { db } from '../firebase';
import { ref, push, set, get } from 'firebase/database';

export default function ReviewModal({ project, onClose, onReviewSubmitted }) {
  const [projRating, setProjRating] = useState(0);
  const [devRating, setDevRating] = useState(0);
  const [hoverProj, setHoverProj] = useState(0);
  const [hoverDev, setHoverDev] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(true);

  React.useEffect(() => {
    const reviewsRef = ref(db, 'reviews');
    get(reviewsRef).then(snap => {
      if (snap.exists()) {
        const data = snap.val();
        const existing = Object.values(data).find(r => r.transactionId === project.id);
        if (existing) setAlreadyRated(true);
      }
      setLoadingCheck(false);
    });
  }, [project.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (alreadyRated) return;
    if (projRating === 0 || devRating === 0) {
      alert("Please provide ratings for both the product and the developer.");
      return;
    }

    setIsSubmitting(true);
    try {
      const reviewRef = ref(db, 'reviews');
      
      // 1. Submit Product Review
      const projReviewRef = push(reviewRef);
      await set(projReviewRef, {
        transactionId: project.id,
        projectId: project.projectId,
        projectTitle: project.projectTitle,
        buyerId: project.buyerId,
        buyerName: project.buyerName,
        sellerId: project.sellerId,
        rating: projRating,
        comment: comment,
        reviewType: 'project',
        timestamp: Date.now()
      });

      // 2. Submit Developer Review
      const devReviewRef = push(reviewRef);
      await set(devReviewRef, {
        transactionId: project.id,
        projectId: project.projectId,
        projectTitle: project.projectTitle,
        buyerId: project.buyerId,
        buyerName: project.buyerName,
        sellerId: project.sellerId,
        rating: devRating,
        comment: `Feedback for developer: ${comment}`,
        reviewType: 'developer',
        timestamp: Date.now()
      });

      if (onReviewSubmitted) onReviewSubmitted();
      onClose();
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Failed to submit review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(8px)'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '550px', padding: '2.5rem', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={24} />
        </button>

        <h2 style={{ marginBottom: '0.5rem', textAlign: 'center' }}>Rate your Experience</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', textAlign: 'center' }}>
          Your feedback helps our community thrive.
        </p>

        <form onSubmit={handleSubmit}>
          {/* Product Rating */}
          <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
            <h4 style={{ marginBottom: '0.8rem' }}>How is the product "{project.projectTitle}"?</h4>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setProjRating(star)}
                  onMouseEnter={() => setHoverProj(star)}
                  onMouseLeave={() => setHoverProj(0)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem' }}
                >
                  <Star 
                    size={32} 
                    fill={(hoverProj || projRating) >= star ? '#f59e0b' : 'none'} 
                    color={(hoverProj || projRating) >= star ? '#f59e0b' : 'var(--text-muted)'} 
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Developer Rating */}
          <div style={{ marginBottom: '2rem', textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <h4 style={{ marginBottom: '0.8rem' }}>How was the developer's service/delivery?</h4>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setDevRating(star)}
                  onMouseEnter={() => setHoverDev(star)}
                  onMouseLeave={() => setHoverDev(0)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem' }}
                >
                  <Star 
                    size={32} 
                    fill={(hoverDev || devRating) >= star ? '#10b981' : 'none'} 
                    color={(hoverDev || devRating) >= star ? '#10b981' : 'var(--text-muted)'} 
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <label className="form-label">Review Comment (Optional)</label>
            <textarea 
              className="form-input" 
              rows="3" 
              placeholder="What did you like or dislike?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              style={{ borderRadius: '12px' }}
            ></textarea>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ 
               width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
               marginTop: '1rem',
               background: alreadyRated ? 'var(--bg-hover)' : 'var(--primary)',
               color: alreadyRated ? 'var(--text-muted)' : '#fff',
               borderColor: alreadyRated ? 'var(--border-color)' : 'var(--primary)',
               fontSize: '1.1rem'
            }}
            disabled={isSubmitting || alreadyRated || loadingCheck}
          >
            {loadingCheck ? <Loader size={18} className="spin" /> : 
             (alreadyRated ? 'Experience Already Recorded' : (isSubmitting ? <><Loader size={18} className="spin" /> Syncing Feedback...</> : <><Send size={18} /> Submit Experience</>))}
          </button>
        </form>
      </div>
    </div>
  );
}
