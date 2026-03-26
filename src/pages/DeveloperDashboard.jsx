import React, { useState, useEffect } from 'react';
import { Upload, ShieldAlert, DollarSign, ShoppingBag, Clock, Loader, MessageCircle, Star, ArrowLeft, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import ChatUI from '../components/ChatUI';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { ref, onValue, update, remove, get } from 'firebase/database';
import { sendNotification } from '../utils/notificationUtils';
import { formatFullDate } from '../utils/dateUtils';
import { getCurrencySymbol, formatCurrency } from '../utils/currencyUtils';

export default function DeveloperDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [kycStatus, setKycStatus] = useState('pending');
  const [offers, setOffers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState(null);
  const [activeChatUserId, setActiveChatUserId] = useState(null);

  const openChat = (buyerName, buyerId) => {
    setActiveChat(buyerName);
    setActiveChatUserId(buyerId);
  };

  useEffect(() => {
    if (!user) return;
    setKycStatus(user.kycStatus || 'pending');
    
    // Sync latest user profile data (roles/wallet)
    const userRef = ref(db, `users/${user.uid}`);
    const unsubscribeUser = onValue(userRef, (snap) => {
      if (snap.exists()) {
        const u = snap.val();
        setKycStatus(u.kycStatus || 'pending');
      }
    });

    // Fetch Offers
    const offersRef = ref(db, 'offers');
    const unsubscribeOffers = onValue(offersRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const myOffers = Object.entries(data)
            .filter(([_, offer]) => offer && offer.sellerId === user.uid)
            .map(([id, offer]) => ({ id, ...offer }))
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          setOffers(myOffers);
        } else {
          setOffers([]);
        }
      } catch (err) {
        console.error("Offers fetch error:", err);
      }
    });

    const projectsRef = ref(db, 'projects');
    const unsubscribeProjects = onValue(projectsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const myProjects = Object.entries(data)
          .filter(([_, p]) => p.authorId === user.uid)
          .map(([id, p]) => ({ id, ...p }));
        setProjects(myProjects);
      } else {
        setProjects([]);
      }
      setLoading(false);
    });

    const reviewsRef = ref(db, 'reviews');
    const unsubscribeReviews = onValue(reviewsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const myReviews = Object.entries(data)
          .filter(([_, r]) => r.sellerId === user.uid)
          .map(([id, r]) => ({ id, ...r }))
          .sort((a, b) => b.timestamp - a.timestamp);
        setReviews(myReviews);
      }
    });

    const transRef = ref(db, 'transactions');
    const unsubscribeTrans = onValue(transRef, (snapshot) => {
      const myTrans = snapshot.exists() ? Object.entries(snapshot.val())
        .filter(([_, t]) => t.userId === user.uid && (t.type === 'earning' || t.type === 'escrow'))
        .map(([id, t]) => ({ id, ...t })) : [];

      // Synthesis from offers
      const synth = offers
        .filter(o => o.status === 'completed' || o.isFunded)
        .map(o => ({
           id: 'sh_' + o.id,
           timestamp: o.fundedAt || o.createdAt,
           description: `Project: ${o.projectTitle}`,
           amount: Number(o.budget) * 0.92,
           type: o.status === 'completed' ? 'earning' : 'escrow'
        }));

      const merged = [...myTrans];
      synth.forEach(st => {
         if (!myTrans.some(mt => mt.description?.includes(st.description.split(':')[1]?.trim() || 'NOMATCH'))) {
           merged.push(st);
         }
      });
      setTransactions(merged.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)));
    });

    return () => { unsubscribeOffers(); unsubscribeProjects(); unsubscribeReviews(); unsubscribeTrans(); };
  }, [user]);

  const handleAcceptOffer = async (offerId) => {
    try { 
      await update(ref(db, `offers/${offerId}`), { status: 'accepted' });
      const snap = await get(ref(db, `offers/${offerId}`));
      if (snap.exists()) {
        const o = snap.val();
        sendNotification(o.buyerId, {
          title: '✅ Offer Accepted!',
          message: `Developer ${user.fullName || 'developer'} accepted your offer for "${o.projectTitle}". Fund escrow to start!`,
          type: 'offer',
          link: '/buyer/projects'
        });
      }
    } catch (error) { console.error(error); }
  };

  const handleDeclineOffer = async (offerId) => {
    try { 
      const snap = await get(ref(db, `offers/${offerId}`));
      await update(ref(db, `offers/${offerId}`), { status: 'declined' });
      if (snap.exists()) {
        const o = snap.val();
        sendNotification(o.buyerId, {
          title: '❌ Offer Declined',
          message: `Developer ${user.fullName || 'developer'} declined your offer for "${o.projectTitle}".`,
          type: 'offer',
          link: '/buyer/projects'
        });
      }
    } catch (error) { console.error(error); }
  };

  const [counterInputs, setCounterInputs] = useState({});

  const handleCounterOffer = async (offerId) => {
    const counterBudget = counterInputs[offerId];
    if (counterBudget) {
      try {
        await update(ref(db, `offers/${offerId}`), { status: 'countered', counterBudget: Number(counterBudget) });
        const snap = await get(ref(db, `offers/${offerId}`));
        if (snap.exists()) {
          const o = snap.val();
          sendNotification(o.buyerId, {
            title: '🔄 Counter Offer!',
            message: `Developer ${user.fullName || 'developer'} countered with ₹${counterBudget} for "${o.projectTitle}".`,
            type: 'offer',
            link: '/buyer/projects'
          });
        }
        setCounterInputs({ ...counterInputs, [offerId]: '' });
      } catch (error) { console.error(error); }
    }
  };

  const handleUnlistProject = async (projectId) => {
    if (offers.some(o => o.projectId === projectId && (o.status === 'accepted' || o.status === 'in_progress'))) {
      alert("Project locked due to ongoing order."); return;
    }
    if (window.confirm('Permanently unlist this project?')) {
      try { await remove(ref(db, `projects/${projectId}`)); } catch (error) { console.error(error); }
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem' }}>Developer Dashboard</h1>

      {kycStatus === 'pending' && (
        <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--warning)', background: 'rgba(245, 158, 11, 0.1)', marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <ShieldAlert size={24} color="var(--warning)" style={{ flexShrink: 0 }} />
          <div>
            <h3 style={{ color: 'var(--warning)', marginBottom: '0.5rem' }}>Action Required: Identity Verification</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Complete mandatory KYC to enable cross-border withdrawals in INR (₹).</p>
            <button className="btn-primary" onClick={() => navigate('/dev/kyc')}>Complete KYC Now</button>
          </div>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--primary)' }}>{projects.length}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Showcase Projects</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--success)' }}>{offers.filter(o => o.status === 'completed').length}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Transactions Complete</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#f59e0b' }}>{reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : '0.0'}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Average Rating</div>
        </div>
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--warning)' }}>{offers.filter(o => o.status === 'accepted' || o.status === 'in_progress' || o.status === 'delivered').length}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Jobs</div>
        </div>
      </div>

      <div className="layout-dashboard" style={{ display: 'grid', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Active Offers/Requests */}
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}><Clock size={20} color="var(--primary)" /> Pending Requests</h2>
            {offers.filter(o => o.status === 'pending' || o.status === 'countered').length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No new offer requests currently.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {offers.filter(o => o.status === 'pending' || o.status === 'countered').map(offer => (
                    <div key={offer.id} style={{ padding: '1.2rem', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <strong>{offer.projectTitle}</strong>
                        <span style={{ color: 'var(--warning)', fontWeight: 'bold' }}>{getCurrencySymbol()}{offer.status === 'countered' ? offer.counterBudget : offer.budget}</span>
                      </div>
                      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>Buyer: @{offer.buyerName || 'user'} | {offer.deadlineDays} Days</p>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button className="btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={() => handleAcceptOffer(offer.id)}>Accept</button>
                        <button className="btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={() => setCounterInputs({ ...counterInputs, [offer.id + '_show']: true })}>Counter</button>
                        <button className="btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }} onClick={() => openChat(`@${offer.buyerName}`, offer.buyerId)}>Discuss</button>
                        <button className="btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleDeclineOffer(offer.id)}>Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
            )}
          </div>

          {/* Recent Completed Transactions */}
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}><CheckCircle size={20} color="var(--success)" /> Recent Completed Sales</h2>
            {transactions.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No completed transactions yet.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {transactions.slice(0, 3).map(t => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(16, 185, 129, 0.03)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{t.description}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{formatFullDate(t.timestamp)}</div>
                      </div>
                      <div style={{ color: t.type === 'escrow' ? 'var(--warning)' : 'var(--success)', fontWeight: 'bold' }}>
                        {t.type === 'escrow' ? '(Escrow) ' : '+'}{getCurrencySymbol()}{Number(t.amount).toLocaleString()}
                      </div>
                    </div>
                  ))}
                  <button className="btn-outline" style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.85rem' }} onClick={() => navigate('/dev/earnings')}>View Full History</button>
                </div>
            )}
          </div>

          {/* Uploaded Projects Management */}
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>My Portfolio</h2>
              <button className="btn-primary" onClick={() => navigate('/dev/upload')} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Upload size={16} /> New Project
              </button>
            </div>
            {projects.length === 0 ? (
               <div style={{ textAlign: 'center', padding: '2rem', border: '2px dashed var(--border-color)', borderRadius: '12px' }}>
                 <p style={{ color: 'var(--text-muted)' }}>No projects listed yet. Start by uploading your first masterpiece.</p>
               </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                   {projects.map(p => (
                     <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-hover)', borderRadius: '12px' }}>
                        <div>
                           <div style={{ fontWeight: 'bold' }}>{p.title}</div>
                           <div style={{ color: 'var(--success)', fontSize: '0.9rem' }}>{getCurrencySymbol()}{p.price}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                           <Link to={`/dev/edit/${p.id}`} className="btn-outline" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}>Update</Link>
                           <button className="btn-outline" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleUnlistProject(p.id)}>Unlist</button>
                        </div>
                     </div>
                   ))}
                </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
           <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
              <div style={{ padding: '1.5rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '50%', width: 'fit-content', margin: '0 auto 1rem', color: 'var(--primary)' }}>
                 <DollarSign size={32} />
              </div>
              <h3 style={{ marginBottom: '0.5rem' }}>Secure Wallet</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Balance: {getCurrencySymbol()}{user.walletBalance || 0}</p>
              <button className="btn-primary" style={{ width: '100%' }} onClick={() => navigate('/dev/earnings')}>Manage Payouts</button>
           </div>
           
           <div className="card hoverable" style={{ padding: '2rem', textAlign: 'center' }} onClick={() => navigate('/dev/projects')}>
              <div style={{ padding: '1.5rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '50%', width: 'fit-content', margin: '0 auto 1rem', color: 'var(--warning)' }}>
                 <Clock size={32} />
              </div>
              <h3 style={{ marginBottom: '0.5rem' }}>Ongoing Jobs</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Active: {offers.filter(o => o.status === 'accepted' || o.status === 'in_progress' || o.status === 'delivered').length}</p>
              <button className="btn-primary" style={{ width: '100%' }}>Portfolio Jobs</button>
           </div>

           <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
              <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Star size={20} color="#f59e0b" fill="#f59e0b" /> Reviews</h2>
              {reviews.slice(0, 3).map(r => (
                <div key={r.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', marginBottom: '0.8rem', fontSize: '0.85rem', border: '1px solid var(--border-color)' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <strong>@{r.buyerName}</strong>
                      <span style={{ color: '#f59e0b' }}>★{r.rating}</span>
                   </div>
                   <p style={{ color: 'var(--text-muted)', margin: 0 }}>"{r.comment?.slice(0, 60)}..."</p>
                </div>
              ))}
              <button className="btn-outline" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => navigate('/dev/sales')}>View All Feedback</button>
           </div>
        </div>
      </div>

      {activeChat && <ChatUI title={`Chat: ${activeChat}`} onClose={() => { setActiveChat(null); setActiveChatUserId(null); }} otherUserId={activeChatUserId} />}
    </div>
  );
}
