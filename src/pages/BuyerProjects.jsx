import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle, MessageCircle, Loader, ArrowLeft, Download, ExternalLink, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import ChatUI from '../components/ChatUI';
import ReviewModal from '../components/ReviewModal';
import PaymentModal from '../components/PaymentModal';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { ref, onValue, update, push, set, get } from 'firebase/database';
import { getCurrencySymbol, formatCurrency } from '../utils/currencyUtils';
import { sendNotification } from '../utils/notificationUtils';

export default function BuyerProjects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeChat, setActiveChat] = useState(null);
  const [activeChatUserId, setActiveChatUserId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [allProjectsCache, setAllProjectsCache] = useState({});
  const [loading, setLoading] = useState(true);
  const [reviewProject, setReviewProject] = useState(null);
  
  const [showPayment, setShowPayment] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null);

  useEffect(() => {
    if (!user) return;
    const offersRef = ref(db, 'offers');
    const unsubscribeOffers = onValue(offersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const myProjects = Object.entries(data)
          .filter(([_, offer]) => offer.buyerId === user.uid && (offer.status === 'pending' || offer.status === 'accepted' || offer.status === 'countered' || offer.status === 'in_progress' || offer.status === 'delivered'))
          .map(([id, offer]) => ({ id, ...offer }));
        setProjects(myProjects);
      } else {
        setProjects([]);
      }
      setLoading(false);
    });

    const projectsRef = ref(db, 'projects');
    const unsubscribeProjects = onValue(projectsRef, (snapshot) => {
      if (snapshot.exists()) {
        setAllProjectsCache(snapshot.val());
      }
    });
    
    return () => { unsubscribeOffers(); unsubscribeProjects(); };
  }, [user]);

  const handleAcceptCounter = async (offerId, counterBudget) => {
    try {
      await update(ref(db, `offers/${offerId}`), { 
        status: 'accepted',
        budget: Number(counterBudget)
      });
    } catch (error) {
      console.error('Error accepting counter:', error);
    }
  };

  const handleDeclineOffer = async (offerId) => {
    try {
      await update(ref(db, `offers/${offerId}`), { status: 'declined' });
    } catch (error) {
      console.error('Error declining:', error);
    }
  };

  const initiatePay = (offerId, amount, sellerId) => {
    setPaymentTarget({ offerId, amount, sellerId });
    setShowPayment(true);
  };

  const handlePayNow = async (paymentDetails) => {
    const { offerId, amount, sellerId } = paymentTarget;
    setShowPayment(false);
    try {
      if (!paymentDetails.razorpay_payment_id) {
        alert("Payment was not completed. Please try again.");
        return;
      }
      await update(ref(db, `offers/${offerId}`), { 
        isFunded: true,
        fundedAt: new Date().toISOString(),
        status: 'in_progress',
        paymentMethod: paymentDetails.method,
        razorpayPaymentId: paymentDetails.razorpay_payment_id || null,
        currency: 'INR'
      });
      
      const netAmount = Number(amount) * 0.92;
      const feeAmount = Number(amount) * 0.08;

      // Add net amount to developer's pending earnings
      const sellerRef = ref(db, `users/${sellerId}`);
      const sSnap = await get(sellerRef);
      if (sSnap.exists()) {
        const sData = sSnap.val();
        await update(sellerRef, { pendingEarnings: (sData.pendingEarnings || 0) + netAmount });
      }

      // Platform pending fees
      const platformRef = ref(db, 'platform/stats');
      const pSnap = await get(platformRef);
      const pData = pSnap.exists() ? pSnap.val() : {};
      await update(platformRef, { pendingFees: (pData.pendingFees || 0) + feeAmount });

      // Record initial escrow transaction
      const transRef = ref(db, 'transactions');
      await push(transRef, {
        userId: sellerId,
        amount: netAmount,
        type: 'escrow',
        description: `Escrow Funded: ${paymentTarget.projectTitle || 'Custom Project'}`,
        timestamp: new Date().toISOString()
      });

      // Notify the developer
      sendNotification(sellerId, {
        title: '💰 Escrow Funded!',
        message: `${user.fullName || 'Buyer'} funded ₹${amount} for "${paymentTarget.projectTitle || 'Custom Project'}". Start work now!`,
        type: 'payment',
        link: '/dev/projects'
      });

      alert("Escrow funded successfully! The developer has been notified to start work immediately.");
    } catch (error) {
      alert("Payment verification failed.");
    }
  };

  const handleApproveProject = async (offerId) => {
    if (window.confirm("Approve this preview? This will enable the developer to submit the final product.")) {
      try {
        await update(ref(db, `offers/${offerId}`), { isApprovedByBuyer: true });
        // Notify developer about approval
        const offerSnap = await get(ref(db, `offers/${offerId}`));
        if (offerSnap.exists()) {
          const o = offerSnap.val();
          sendNotification(o.sellerId, {
            title: '✅ Preview Approved!',
            message: `Buyer approved the preview for "${o.projectTitle || 'project'}". You can now submit the final delivery.`,
            type: 'project',
            link: '/dev/projects'
          });
        }
      } catch (error) {
        console.error('Approval error:', error);
      }
    }
  };

  const handleCompleteOrder = async (offerId, amount, sellerId) => {
    if (window.confirm("Complete project? This releases escrow funds to the developer.")) {
      try {
        const now = new Date().toISOString();
        await update(ref(db, `offers/${offerId}`), { status: 'completed', completedAt: now });
        
        const netAmount = Number(amount) * 0.92;
        const totalFee = Number(amount) * 0.08;

        // Release funds
        const sellerRef = ref(db, `users/${sellerId}`);
        const sSnap = await get(sellerRef);
        if (sSnap.exists()) {
           const sData = sSnap.val();
           await update(sellerRef, {
             pendingEarnings: Math.max(0, (sData.pendingEarnings || 0) - netAmount),
             walletBalance: (sData.walletBalance || 0) + netAmount
           });
        }

        // Platform fee migration
        const platformRef = ref(db, 'platform/stats');
        const pSnap = await get(platformRef);
        const pData = pSnap.exists() ? pSnap.val() : {};
        await update(platformRef, {
          pendingFees: Math.max(0, (pData.pendingFees || 0) - totalFee),
          collectedFees: (pData.collectedFees || 0) + totalFee
        });
        // Record central transaction
        // First get the offer data for the description
        const offerSnap = await get(ref(db, `offers/${offerId}`));
        const offerData = offerSnap.exists() ? offerSnap.val() : {};

        const transRef = ref(db, 'transactions');
        await push(transRef, {
           userId: sellerId,
           amount: netAmount,
           type: 'earning',
           description: `Completed: ${offerData.projectTitle || 'Custom Project'}`,
           timestamp: now
        });

        // Record permanent order
        if (offerSnap.exists()) {
          await set(push(ref(db, 'orders')), {
            ...offerData,
            amount: Number(offerData.budget || 0),
            status: 'completed',
            completedAt: now,
            orderType: 'custom'
          });
        }

        // Notify developer about completion
        sendNotification(sellerId, {
          title: '🎉 Project Completed!',
          message: `Funds for "${offerData.projectTitle || 'Custom Project'}" have been released to your wallet. +₹${netAmount.toFixed(0)}`,
          type: 'payment',
          link: '/dev/earnings'
        });

        alert("Project completed! Developer has been paid.");
      } catch (error) {
        console.error("Completion error:", error);
      }
    }
  };

  const openChat = (sellerName, sellerId) => {
    setActiveChat(sellerName);
    setActiveChatUserId(sellerId);
  };

  const handleExpiry = async (offerId, linkField) => {
    try {
      await update(ref(db, `offers/${offerId}`), { [linkField]: null });
    } catch (error) {
      console.error('Expiry error:', error);
    }
  };

  const ExpiryTimer = ({ startTime, onExpire }) => {
    const [timeLeft, setTimeLeft] = useState(null);
    useEffect(() => {
      const calc = () => {
        const diff = (new Date(startTime).getTime() + (3 * 24 * 60 * 60 * 1000)) - new Date().getTime();
        if (diff <= 0) { onExpire(); return 0; }
        return diff;
      };
      setTimeLeft(calc());
      const t = setInterval(() => { const v = calc(); setTimeLeft(v); if(v===0) clearInterval(t); }, 1000);
      return () => clearInterval(t);
    }, [startTime]);
    if (!timeLeft) return null;
    const d = Math.floor(timeLeft / 86400000);
    const h = Math.floor((timeLeft % 86400000) / 3600000);
    const m = Math.floor((timeLeft % 3600000) / 60000);
    const s = Math.floor((timeLeft % 60000) / 1000);
    return <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 'bold' }}>{d > 0 && `${d}d `}{h}h {m}m {s}s</span>;
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '6rem' }}><Loader className="spin" /></div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '2rem auto' }}>
      <button className="btn-back" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} /> Back
      </button>
      <h1 style={{ marginBottom: '2rem' }}>Ongoing Projects</h1>

      {projects.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>No active project requests.</div>
      ) : (
        projects.map(p => (
          <div key={p.id} className="card" style={{ padding: '2rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <Link to={`/project/${p.projectId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <h2 style={{ marginBottom: '0.5rem' }} className="hover-text-primary">{p.projectTitle || 'Custom Project'}</h2>
              </Link>
              <p style={{ color: 'var(--text-muted)' }}>Seller: @{p.sellerName} | Amount: {getCurrencySymbol()}{p.status === 'countered' ? p.counterBudget : p.budget}</p>
              
              <div style={{ margin: '1.5rem 0', display: 'flex', gap: '1rem' }}>
                <button className="btn-outline" onClick={() => openChat(p.sellerName, p.sellerId)}><MessageCircle size={16} /> Chat</button>
                
                {p.status === 'countered' && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn-primary" onClick={() => handleAcceptCounter(p.id, p.counterBudget)}>Accept</button>
                    <button className="btn-outline" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleDeclineOffer(p.id)}>Decline</button>
                  </div>
                )}

                {(p.status === 'accepted' || (p.status === 'in_progress' && !p.isFunded)) && (
                  <button className="btn-primary" onClick={() => initiatePay(p.id, p.budget, p.sellerId)}>
                    Fund Escrow ({getCurrencySymbol()}{p.budget})
                  </button>
                )}
              </div>

              {p.previewURL && !p.isApprovedByBuyer && (
                <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--primary)', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <strong>Developer shared a preview!</strong>
                    <ExpiryTimer startTime={p.previewAt} onExpire={() => handleExpiry(p.id, 'previewURL')} />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <a href={p.previewURL} target="_blank" rel="noopener noreferrer" className="btn-outline">View Preview</a>
                    <button className="btn-primary" onClick={() => handleApproveProject(p.id)}>Approve & Request Final</button>
                  </div>
                </div>
              )}

              {p.deliveryURL && (
                <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--success)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <strong>Final Delivery Received!</strong>
                    <ExpiryTimer startTime={p.deliveredAt} onExpire={() => handleExpiry(p.id, 'deliveryURL')} />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <a href={p.deliveryURL} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ flex: 1 }}>Download Files</a>
                    {p.status !== 'completed' && (
                      <button className="btn-primary" onClick={() => handleCompleteOrder(p.id, p.budget, p.sellerId)} style={{ flex: 1.5 }}>Release Funds & Complete</button>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <span style={{ 
                padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold',
                background: p.isFunded ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                color: p.isFunded ? 'var(--success)' : 'var(--warning)',
                border: `1px solid ${p.isFunded ? 'var(--success)' : 'var(--warning)'}`
              }}>
                {p.status === 'completed' ? 'COMPLETED' : (p.isFunded ? 'WORK IN PROGRESS' : 'AWAITING PAYMENT')}
              </span>
            </div>
          </div>
        ))
      )}

      {showPayment && paymentTarget && (
        <PaymentModal 
          amount={paymentTarget.amount} 
          currencySymbol={getCurrencySymbol()} 
          user={user} 
          onConfirm={handlePayNow} 
          onClose={() => setShowPayment(false)}
          orderName={`Escrow: ${paymentTarget.projectTitle || 'Custom Project'}`}
          notes={{ offerId: paymentTarget.offerId, sellerId: paymentTarget.sellerId, type: 'escrow_funding' }}
        />
      )}

      {reviewProject && <ReviewModal project={reviewProject} onClose={() => setReviewProject(null)} onReviewSubmitted={() => update(ref(db, `offers/${reviewProject.id}`), { reviewed: true })} />}
      {activeChat && <ChatUI title={`Discussion with @${activeChat}`} onClose={() => { setActiveChat(null); setActiveChatUserId(null); }} otherUserId={activeChatUserId} />}
    </div>
  );
}
