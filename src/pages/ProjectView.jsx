import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ExternalLink, ShoppingCart, MessageSquare, CheckCircle, Loader, ArrowLeft, Star, User, ShoppingBag, Download } from 'lucide-react';
import { ref, get, push, set, update } from 'firebase/database';
import { useAuth } from '../context/AuthContext';
import ChatUI from '../components/ChatUI';
import ReviewModal from '../components/ReviewModal';
import NegotiationModal from '../components/NegotiationModal';
import PaymentModal from '../components/PaymentModal';
import { db } from '../firebase';
import { sendNotification } from '../utils/notificationUtils';
import { formatCurrency, getCurrencySymbol } from '../utils/currencyUtils';

export default function ProjectView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showNegotiation, setShowNegotiation] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showReview, setShowReview] = useState(null); // 'project' or 'developer'
  const [activeChat, setActiveChat] = useState(null);
  const [project, setProject] = useState(null);
  const [authorProfile, setAuthorProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  const [devStats, setDevStats] = useState({ rating: 0, reviewsCount: 0, projectsCount: 0 });
  const [projectStats, setProjectStats] = useState({ rating: 0, reviewsCount: 0 });
  const [projectReviews, setProjectReviews] = useState([]);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const projectRef = ref(db, `projects/${id}`);
        const snapshot = await get(projectRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          setProject({ id, ...data });

          if (data.authorId) {
            const authorRef = ref(db, `users/${data.authorId}`);
            const authorSnap = await get(authorRef);
            if (authorSnap.exists()) {
              setAuthorProfile(authorSnap.val());
            }

            const projectsRef = ref(db, 'projects');
            const projectsSnap = await get(projectsRef);
            if (projectsSnap.exists()) {
              const allProjects = projectsSnap.val();
              const count = Object.values(allProjects).filter(p => p.authorId === data.authorId).length;
              setDevStats(prev => ({ ...prev, projectsCount: count }));
            }

            const reviewsRef = ref(db, 'reviews');
            const reviewsSnap = await get(reviewsRef);
            if (reviewsSnap.exists()) {
              const allReviews = Object.entries(reviewsSnap.val()).map(([id, r]) => ({id, ...r}));
              const myDevReviews = allReviews.filter(r => r.sellerId === data.authorId && r.reviewType === 'developer');
              const devAvg = myDevReviews.length > 0 ? myDevReviews.reduce((acc, r) => acc + r.rating, 0) / myDevReviews.length : 0;
              setDevStats(prev => ({ ...prev, rating: devAvg, reviewsCount: myDevReviews.length }));
              const myProjReviews = allReviews.filter(r => r.projectId === id && (r.reviewType === 'project' || !r.reviewType));
              const projAvg = myProjReviews.length > 0 ? myProjReviews.reduce((acc, r) => acc + r.rating, 0) / myProjReviews.length : 0;
              setProjectStats({ rating: projAvg, reviewsCount: myProjReviews.length });
              setProjectReviews(myProjReviews.sort((a,b) => b.timestamp - a.timestamp));
            }
          }
        }
      } catch (error) {
        console.error('Error fetching project:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [id]);

  const initiatePurchase = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setShowPayment(true);
  };

  const handlePurchaseNow = async (paymentDetails) => {
    setPurchasing(true);
    setShowPayment(false);
    try {
      if (!paymentDetails.razorpay_payment_id) {
        alert("Payment was not completed. Please try again.");
        setPurchasing(false);
        return;
      }
      if (!project.downloadURL) {
        alert("This project link is missing. Contact the developer.");
        setPurchasing(false);
        return;
      }

      const netAmount = Number(project.price) * 0.92;
      const feeAmount = Number(project.price) * 0.08;

      const orderRef = ref(db, 'orders');
      const newOrderRef = push(orderRef);
      const now = new Date().toISOString();
      const orderData = {
        projectId: project.id,
        projectTitle: project.title,
        projectImage: project.image || null,
        buyerId: user.uid,
        buyerName: user.fullName || user.email.split('@')[0],
        sellerId: project.authorId,
        sellerName: project.authorName,
        amount: Number(project.price),
        currency: 'INR',
        paymentMethod: paymentDetails.method,
        razorpayPaymentId: paymentDetails.razorpay_payment_id || null,
        status: 'completed',
        orderType: 'direct',
        previewURL: project.liveLink || null,
        previewAt: now,
        deliveryURL: project.downloadURL || null,
        deliveredAt: now,
        createdAt: now
      };

      await set(newOrderRef, orderData);

      // Add to Developer Wallet
      const sellerRef = ref(db, `users/${project.authorId}`);
      const sellerSnap = await get(sellerRef);
      if (sellerSnap.exists()) {
        const sData = sellerSnap.val();
        await update(sellerRef, { 
           walletBalance: (sData.walletBalance || 0) + netAmount 
        });
      }

      // Record transaction for dev
      const transRef = ref(db, 'transactions');
      await push(transRef, {
        userId: project.authorId,
        amount: netAmount,
        type: 'earning',
        description: `Sale: ${project.title}`,
        timestamp: now
      });

      // Platform Stats
      const platformRef = ref(db, 'platform/stats');
      const pSnap = await get(platformRef);
      const pData = pSnap.exists() ? pSnap.val() : {};
      await update(platformRef, { collectedFees: (pData.collectedFees || 0) + feeAmount });

      // Notify the seller
      sendNotification(project.authorId, {
        title: '💰 New Sale!',
        message: `${user.fullName || user.email.split('@')[0]} purchased "${project.title}" for ₹${project.price}`,
        type: 'payment',
        link: '/dev/sales'
      });

      alert("Transaction Secure! Funds moved globally. Product now in 'My Purchases'.");
      navigate('/buyer/purchases');
    } catch (error) {
      alert("Payment failed connection or processing interruption.");
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '6rem', color: 'var(--text-muted)' }}>
        <Loader size={40} className="spin" style={{ margin: '0 auto', marginBottom: '1rem' }} />
        <p>Syncing Project Data...</p>
      </div>
    );
  }

  if (!project) return <div style={{ textAlign: 'center', padding: '6rem' }}><h2>Project not found</h2></div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <button className="btn-back" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} /> Back
      </button>
      <img src={project.image || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&h=600&fit=crop'} alt={project.title} style={{ width: '100%', height: '400px', objectFit: 'cover', borderRadius: '16px', marginBottom: '2rem' }} />
      
      <div className="layout-project-view" style={{ display: 'grid', gap: '3rem' }}>
        <div>
           <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{project.title}</h1>
           <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#f59e0b', fontSize: '1.2rem', fontWeight: 'bold' }}>
                <Star size={20} fill="#f59e0b" />
                <span>{projectStats.rating.toFixed(1)}</span>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>({projectStats.reviewsCount} reviews)</span>
              </div>
           </div>
           
           <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
             <span>By <strong style={{color: 'var(--text-main)'}}>{project.authorName || 'Unknown'}</strong></span>
            {authorProfile?.kycStatus === 'verified' && (
              <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>KYC Verified</span>
            )}
            <span>•</span>
            <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem' }}>{project.category}</span>
          </div>

          <p style={{ lineHeight: '1.7', marginBottom: '2rem', color: 'var(--text-muted)' }}>
            {project.description || 'No description provided.'}
          </p>
        </div>

        <div>
          <div className="card glass" style={{ padding: '2rem', position: 'sticky', top: '100px' }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--success)' }}>{getCurrencySymbol()}{project.price}</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Digital license included.</p>
            <button 
              className="btn-primary" 
              style={{ width: '100%', padding: '1rem', marginBottom: '1rem', fontSize: '1.1rem' }} 
              onClick={initiatePurchase} 
              disabled={purchasing || user?.uid === project.authorId}
            >
              <ShoppingCart size={20} /> 
              {user?.uid === project.authorId ? "You own this project" : (purchasing ? 'Verifying Gateway...' : 'Unlock Now')}
            </button>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                className="btn-outline" 
                style={{ flex: 1, padding: '1rem' }} 
                onClick={() => user?.uid === project.authorId ? alert("You cannot negotiate with yourself.") : setShowNegotiation(true)}
              >
                Negotiate
              </button>
              {project.liveLink && (
                <a 
                  href={project.liveLink} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn-outline" 
                  style={{ flex: 1, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none' }}
                >
                  <ExternalLink size={18} /> Demo
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Product Reviews Section */}
      <div style={{ marginTop: '4rem', borderTop: '1px solid var(--border-color)', paddingTop: '3rem' }}>
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <Star size={24} color="#f59e0b" /> Product Reviews
        </h2>
        {projectReviews.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', padding: '2rem', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '12px' }}>No reviews yet for this product.</p>
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {projectReviews.map(rev => (
              <div key={rev.id} className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
                      {rev.buyerName?.charAt(0) || 'U'}
                    </div>
                    <strong>{rev.buyerName}</strong>
                  </div>
                  <div style={{ display: 'flex', color: '#f59e0b' }}>
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} fill={i < rev.rating ? '#f59e0b' : 'none'} />
                    ))}
                  </div>
                </div>
                <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: '1.5' }}>{rev.comment || "No comment left."}</p>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'block' }}>
                  {new Date(rev.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Developer Profile Section */}
      <div style={{ marginTop: '4rem', borderTop: '1px solid var(--border-color)', paddingTop: '3rem', marginBottom: '4rem' }}>
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <User size={24} color="var(--primary)" /> About the Developer
        </h2>
        <div className="card" style={{ padding: '2.5rem', display: 'flex', gap: '2.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <img 
            src={authorProfile?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(project.authorName)}&background=random`} 
            style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--bg-hover)' }} 
            alt="developer" 
          />
          <div style={{ flex: 1, minWidth: '300px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.8rem', margin: 0 }}>{project.authorName}</h3>
              {authorProfile?.kycStatus === 'verified' && <span style={{ color: 'var(--success)', fontSize: '0.8rem', fontWeight: 'bold', background: 'rgba(16, 185, 129, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>Verified Pro</span>}
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '1.1rem' }}>{authorProfile?.email || 'Contact through NewbieHub'}</p>
            
            <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', fontSize: '1.4rem' }}>
                  <Star size={24} fill="#f59e0b" /> {devStats.rating.toFixed(1)}
                </div>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Seller Reputation</span>
              </div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '1.4rem', color: 'var(--text-main)' }}>{devStats.projectsCount}</div>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Published Lab</span>
              </div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '1.4rem', color: 'var(--text-main)' }}>{devStats.reviewsCount}</div>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Satisfied Clients</span>
              </div>
            </div>
          </div>
          <button 
            className="btn-primary" 
            onClick={() => user?.uid === project.authorId ? alert("This is your own profile.") : setActiveChat({ id: project.authorId, name: project.authorName })}
            style={{ padding: '1rem 2rem' }}
          >
            <MessageSquare size={18} /> Contact Developer
          </button>
        </div>
      </div>

      {showPayment && (
        <PaymentModal 
          amount={project.price} 
          currencySymbol={getCurrencySymbol()} 
          user={user} 
          onConfirm={handlePurchaseNow} 
          onClose={() => setShowPayment(false)}
          orderName={`Purchase: ${project.title}`}
          notes={{ projectId: project.id, sellerId: project.authorId, type: 'direct_purchase' }}
        />
      )}

      {showNegotiation && <NegotiationModal project={project} onClose={() => setShowNegotiation(false)} />}
      
      {activeChat && <ChatUI title={`Chat with ${activeChat.name}`} onClose={() => setActiveChat(null)} otherUserId={activeChat.id} />}
    </div>
  );
}
