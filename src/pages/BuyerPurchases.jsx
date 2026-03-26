import React, { useState, useEffect } from 'react';
import { ShoppingBag, CheckCircle, Download, Loader, ExternalLink, Star, Clock, ImageIcon, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { ref, onValue, update, push, get } from 'firebase/database';
import { Link, useNavigate } from 'react-router-dom';
import ReviewModal from '../components/ReviewModal';
import { formatFullDate } from '../utils/dateUtils';
import { formatCurrency, getCurrencySymbol } from '../utils/currencyUtils';

export default function BuyerPurchases() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeReview, setActiveReview] = useState(null);
  const [projectImages, setProjectImages] = useState({});

  useEffect(() => {
    if (!user) return;

    // Listen to orders in real-time
    const ordersRef = ref(db, 'orders');
    const unsubOrders = onValue(ordersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const myPurchases = Object.entries(data)
          .filter(([_, order]) => order.buyerId === user.uid)
          .map(([id, order]) => ({ id, ...order }))
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setPurchases(myPurchases);

        // Fetch project images for thumbnails
        const projectIds = [...new Set(myPurchases.map(p => p.projectId).filter(Boolean))];
        if (projectIds.length > 0) {
          const projectsRef = ref(db, 'projects');
          get(projectsRef).then(pSnap => {
            if (pSnap.exists()) {
              const allProjects = pSnap.val();
              const images = {};
              projectIds.forEach(pid => {
                if (allProjects[pid]?.image) {
                  images[pid] = allProjects[pid].image;
                }
              });
              setProjectImages(images);
            }
          });
        }
      } else {
        setPurchases([]);
      }
      setLoading(false);
    });

    return () => unsubOrders();
  }, [user]);

  const handleReleaseFunds = async (orderId, amount, sellerId, projectTitle) => {
    if (window.confirm("Are you sure? This will release the payment to the developer and you won't be able to dispute it later.")) {
      try {
        const netAmount = Number(amount) * 0.92;
        const feeAmount = Number(amount) * 0.08;

        await update(ref(db, `orders/${orderId}`), {
          status: 'funds_released',
          fundsReleasedAt: new Date().toISOString()
        });

        const sellerRef = ref(db, `users/${sellerId}`);
        const sellerSnap = await get(sellerRef);
        if (sellerSnap.exists()) {
          const sData = sellerSnap.val();
          await update(sellerRef, {
            walletBalance: (sData.walletBalance || 0) + netAmount
          });
        }

        const platformRef = ref(db, 'platform/stats');
        const pSnap = await get(platformRef);
        const pData = pSnap.exists() ? pSnap.val() : {};
        await update(platformRef, { 
           collectedFees: (pData.collectedFees || 0) + feeAmount 
        });

        const transRef = ref(db, 'transactions');
        await push(transRef, {
          userId: sellerId,
          amount: netAmount,
          type: 'earning',
          description: `Sale completion: ${projectTitle}`,
          timestamp: new Date().toISOString()
        });

        alert("Funds released successfully! Thank you for using NewbieHub.");
      } catch (e) {
        console.error(e);
        alert("Failed to release funds.");
      }
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '6rem', color: 'var(--text-muted)' }}>
        <Loader size={40} className="spin" style={{ margin: '0 auto', marginBottom: '1rem' }} />
        <p>Loading your purchases...</p>
      </div>
    );
  }

  const defaultThumb = 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=120&h=120&fit=crop';

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <button className="btn-back" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} /> Back
      </button>
      <h1 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
        <ShoppingBag size={32} color="var(--primary)" /> 
        My Purchase History
      </h1>

      {purchases.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginBottom: '1.5rem' }}>You haven't purchased any projects yet.</p>
          <a href="/" className="btn-primary" style={{ padding: '0.8rem 2rem', textDecoration: 'none', display: 'inline-block' }}>Explore Marketplace</a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {purchases.map(p => (
            <div key={p.id} className="card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
                {/* Left: Thumbnail + Info */}
                <div style={{ flex: 1, minWidth: '300px', display: 'flex', gap: '1.2rem' }}>
                  {/* Thumbnail */}
                  <Link to={p.projectId ? `/project/${p.projectId}` : '#'} style={{ flexShrink: 0 }}>
                    <img 
                      src={projectImages[p.projectId] || p.projectImage || defaultThumb} 
                      alt={p.projectTitle}
                      style={{ 
                        width: '80px', height: '80px', borderRadius: '12px', 
                        objectFit: 'cover', border: '1px solid var(--border-color)',
                        transition: 'transform 0.2s ease'
                      }}
                      onError={(e) => { e.target.src = defaultThumb; }}
                      onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                      onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                    />
                  </Link>

                  {/* Info */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                      <Link to={p.projectId ? `/project/${p.projectId}` : '#'} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <h2 style={{ fontSize: '1.4rem', margin: 0 }} className="hover-text-primary">{p.projectTitle}</h2>
                      </Link>
                      <span style={{ 
                        fontSize: '0.75rem', padding: '0.2rem 0.8rem', borderRadius: '20px', fontWeight: 'bold',
                        background: p.status === 'completed' || p.status === 'funds_released' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: p.status === 'completed' || p.status === 'funds_released' ? 'var(--success)' : 'var(--warning)',
                        border: `1px solid ${p.status === 'completed' || p.status === 'funds_released' ? 'var(--success)' : 'var(--warning)'}`
                      }}>
                        {p.status === 'funds_released' ? 'PAYMENT RELEASED' : (p.status === 'completed' ? 'READY TO DOWNLOAD' : p.status?.toUpperCase().replace('_', ' '))}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 0.5rem 0' }}>
                      Seller: <strong style={{color: 'var(--text-main)'}}>@{p.sellerName || 'developer'}</strong> | Completed: <strong style={{color: 'var(--text-main)'}}>{formatFullDate(p.completedAt || p.deliveredAt || p.createdAt)}</strong>
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: 0 }}>
                      {p.orderType === 'custom' ? 'Custom Project' : 'Direct Purchase'}
                      {p.razorpayPaymentId && <> · <span style={{ color: 'var(--primary)' }}>Razorpay Verified</span></>}
                    </p>
                    <h3 style={{ marginTop: '0.5rem', color: 'var(--success)', fontSize: '1.4rem' }}>{getCurrencySymbol()}{p.budget || p.amount}</h3>
                  </div>
                </div>

                {/* Right: Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', minWidth: '200px' }}>
                  {p.deliveryURL ? (
                    <a href={p.deliveryURL} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <Download size={18} /> Download Files
                    </a>
                  ) : (
                    <button className="btn-primary" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>Awaiting Files...</button>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn-outline" style={{ flex: 1 }} onClick={() => setActiveReview(p)}>
                      <Star size={18} /> Rate
                    </button>
                    {p.previewURL && (
                      <a href={p.previewURL} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ flex: 1, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ExternalLink size={18} /> Demo
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {(p.status === 'completed' || p.status === 'funds_released') ? (
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '0.9rem', color: 'var(--success)' }}>
                  <CheckCircle size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                  Verification: This project was delivered on time and verified by the system.
                </div>
              ) : (
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)', fontSize: '0.9rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={16} />
                  Your funds are safe in Escrow. The developer is currently working on your delivery.
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeReview && (
        <ReviewModal 
          project={activeReview} 
          onClose={() => setActiveReview(null)} 
        />
      )}
    </div>
  );
}
