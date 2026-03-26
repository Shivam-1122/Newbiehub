import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle, MessageCircle, Loader, ArrowLeft, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import ChatUI from '../components/ChatUI';
import DeliveryModal from '../components/DeliveryModal';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { ref, onValue, get, update, push, set } from 'firebase/database';
import { getCurrencySymbol, formatCurrency } from '../utils/currencyUtils';

export default function DeveloperProjects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeChat, setActiveChat] = useState(null);
  const [activeChatUserId, setActiveChatUserId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [allProjectsCache, setAllProjectsCache] = useState({});
  const [loading, setLoading] = useState(true);
  const [deliveryTarget, setDeliveryTarget] = useState(null);
  const [deliveryMode, setDeliveryMode] = useState('final'); // 'preview' or 'final'
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    const offersRef = ref(db, 'offers');
    const unsubscribeOffers = onValue(offersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const activeOffers = Object.entries(data)
          .filter(([_, offer]) => offer.sellerId === user.uid && (offer.status === 'accepted' || offer.status === 'in_progress' || offer.status === 'delivered'))
          .map(([id, offer]) => ({ id, ...offer }));
        setProjects(activeOffers);
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

  const openChat = (buyerName, buyerId) => {
    setActiveChat(buyerName);
    setActiveChatUserId(buyerId);
  };

  const releaseFunds = async (offer) => {
    try {
       const amount = Number(offer.budget || offer.counterBudget);
       const fee = amount * 0.08;
       const netAmount = amount - fee;

       const devRef = ref(db, `users/${user.uid}`);
       const devSnap = await get(devRef);
       if (devSnap.exists()) {
          const devData = devSnap.val();
          await update(devRef, {
             walletBalance: (devData.walletBalance || 0) + netAmount,
             pendingEarnings: Math.max(0, (devData.pendingEarnings || 0) - netAmount)
          });
       }

       const transRef = ref(db, 'transactions');
       await push(transRef, {
          userId: user.uid,
          amount: netAmount,
          type: 'earning',
          status: 'completed',
          currency: 'INR',
          description: `Sale: ${offer.projectTitle || 'Custom Project'} (Auto-release)`,
          timestamp: new Date().toISOString()
       });

       await update(ref(db, `offers/${offer.id}`), {
          status: 'completed',
          fundsReleasedAt: new Date().toISOString()
       });

       setSuccessMsg('Funds auto-released successfully after 3 days!');
       setShowSuccess(true);
       setTimeout(() => setShowSuccess(false), 5000);
    } catch (error) {
       console.error("Auto-release error:", error);
    }
  };

  useEffect(() => {
    if (projects.length > 0) {
       projects.forEach(p => {
          if (p.status === 'delivered' && !p.isFundsReleased && p.deliveredAt) {
             const diff = new Date().getTime() - new Date(p.deliveredAt).getTime();
             if (diff >= 3 * 24 * 60 * 60 * 1000) releaseFunds(p);
          }
       });
    }
  }, [projects]);

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
    return <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Auto-release: {d > 0 && `${d}d `}{h}h {m}m {s}s</span>;
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '6rem' }}><Loader className="spin" /></div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '2rem auto' }}>
      <button className="btn-back" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} /> Back
      </button>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
        <Clock size={32} color="var(--primary)" /> Portfolio Jobs
      </h1>

      {projects.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>No active projects to work on.</div>
      ) : (
        projects.map(p => {
          const projectDetails = p.projectId ? allProjectsCache[p.projectId] : null;
          const thumbnail = projectDetails?.image;
          
          return (
            <div key={p.id} className="card" style={{ padding: '2rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <Link to={`/project/${p.projectId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <h2 style={{ marginBottom: '0.5rem' }} className="hover-text-primary">{p.projectTitle || 'Custom Project'}</h2>
                </Link>
                <p style={{ color: 'var(--text-muted)' }}>Buyer: @{p.buyerName} | Budget: {getCurrencySymbol()}{p.budget || p.counterBudget}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>Deadline: {p.deadlineDays} Days</p>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button className="btn-primary" onClick={() => openChat(`@${p.buyerName}`, p.buyerId)}><MessageCircle size={16} /> Chat</button>
                  <button className="btn-outline" style={{ opacity: p.isFunded ? 1 : 0.5, cursor: p.isFunded ? 'pointer' : 'not-allowed' }} onClick={() => { if(!p.isFunded) return; if(!p.previewURL) { setDeliveryTarget(p); setDeliveryMode('preview'); } else { navigator.clipboard.writeText(p.previewURL); alert('Preview copied!'); } }} disabled={!p.isFunded}>
                    {p.previewURL ? 'Share Preview Link' : 'Send Preview Link'}
                  </button>
                  {p.previewURL && (
                    <button className="btn-primary" style={{ opacity: p.isApprovedByBuyer ? 1 : 0.6, cursor: p.isApprovedByBuyer ? 'pointer' : 'not-allowed', background: p.status === 'delivered' ? 'var(--success)' : (p.isApprovedByBuyer ? 'var(--primary)' : 'var(--bg-hover)') }} onClick={() => { if(p.isApprovedByBuyer && p.status !== 'delivered') { setDeliveryTarget(p); setDeliveryMode('final'); } }} disabled={!p.isApprovedByBuyer || p.status === 'delivered'}>
                      {p.status === 'delivered' ? 'Final delivered' : (p.isApprovedByBuyer ? 'Deliver Final ZIP' : 'Awaiting Approval')}
                    </button>
                  )}
                </div>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <span style={{ 
                    padding: '0.4rem 1rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold',
                    background: p.status === 'delivered' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                    color: p.status === 'delivered' ? 'var(--success)' : 'var(--primary)',
                    border: `1px solid ${p.status === 'delivered' ? 'var(--success)' : 'var(--primary)'}`
                }}>
                  {p.status === 'delivered' ? 'DELIVERED (PENDING RELEASE)' : (p.isFunded ? 'IN PROGRESS' : 'AWAITING FUNDING')}
                </span>
                {p.status === 'delivered' && (
                  <div style={{ marginTop: '0.8rem' }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0.2rem 0' }}>Funds on local hold</p>
                    <ExpiryTimer startTime={p.deliveredAt} onExpire={() => {}} />
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}

      {deliveryTarget && <DeliveryModal offer={deliveryTarget} mode={deliveryMode} onClose={() => setDeliveryTarget(null)} onShowSuccess={() => { setSuccessMsg(deliveryMode === 'preview' ? 'Preview link sent!' : 'Delivery complete!'); setShowSuccess(true); setTimeout(() => setShowSuccess(false), 5000); }} />}
      {showSuccess && (
        <div className="card" style={{ position: 'fixed', bottom: '2rem', right: '2rem', padding: '1.5rem', background: 'var(--success)', color: 'white', zIndex: 100, display: 'flex', gap: '1rem' }}>
          <CheckCircle size={24} />
          <div><strong>Success!</strong><p style={{ fontSize: '0.8rem', margin: 0 }}>{successMsg}</p></div>
        </div>
      )}
      {activeChat && <ChatUI title={`Chat with ${activeChat}`} onClose={() => { setActiveChat(null); setActiveChatUserId(null); }} otherUserId={activeChatUserId} />}
    </div>
  );
}
