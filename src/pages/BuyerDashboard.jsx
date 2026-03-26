import React, { useState, useEffect } from 'react';
import { Download, MessageCircle, ShoppingBag, Clock, Loader, ArrowRight } from 'lucide-react';
import ChatUI from '../components/ChatUI';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { formatFullDate } from '../utils/dateUtils';
import { getCurrencySymbol, formatCurrency } from '../utils/currencyUtils';

export default function BuyerDashboard() {
  const [activeChat, setActiveChat] = useState(null);
  const [activeChatUserId, setActiveChatUserId] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const ordersRef = ref(db, 'orders');
    const unsubscribe = onValue(ordersRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const myOrders = Object.entries(data)
            .filter(([_, order]) => order && order.buyerId === user.uid)
            .map(([id, order]) => ({
              id,
              projectTitle: order.projectTitle || order.title || 'Untitled Project',
              sellerName: order.sellerName || 'Developer',
              sellerId: order.sellerId,
              amount: order.amount || 0,
              status: order.status || 'pending',
              deliveredAt: order.deliveredAt,
              createdAt: order.createdAt || 0,
              deliveryURL: order.deliveryURL
            }))
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
            .slice(0, 3);
          setRecentOrders(myOrders);
        } else {
          setRecentOrders([]);
        }
      } catch (err) {
        console.error("Dashboard data processing error:", err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [user]);

  const openChat = (sellerName, sellerId) => {
    setActiveChat(sellerName);
    setActiveChatUserId(sellerId);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem' }}>Buyer Dashboard</h1>
      
      {/* Quick Access Action Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <button className="card hoverable" onClick={() => navigate('/buyer/purchases')} style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', color: 'var(--success)' }}><ShoppingBag size={32} /></div>
          <h3>My Purchase History</h3>
        </button>
        <button className="card hoverable" onClick={() => navigate('/buyer/projects')} style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '50%', color: 'var(--warning)' }}><Clock size={32} /></div>
          <h3>Ongoing Project Tasks</h3>
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>Recent Activity</h2>
        {recentOrders.length > 0 && (
          <Link to="/buyer/purchases" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 'bold' }}>
            See All <ArrowRight size={16} />
          </Link>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <Loader size={24} className="spin" />
        </div>
      ) : recentOrders.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center', borderStyle: 'dashed' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Your shopping bag is empty. Explore 100+ premium templates!</p>
          <button className="btn-primary" onClick={() => navigate('/')}>Explore Marketplace</button>
        </div>
      ) : (
        recentOrders.map(order => (
          <div key={order.id} className="card" style={{ padding: '2rem', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: order.status === 'completed' ? 'var(--success)' : 'var(--warning)' }}></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '0.4rem' }}>{order.projectTitle || 'Project'}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                   <span>By <strong>@{order.sellerName}</strong></span>
                   <span>•</span>
                   <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>{getCurrencySymbol()}{order.amount}</span>
                   <span>•</span>
                   <span>{formatFullDate(order.completedAt || order.createdAt)}</span>
                </div>
              </div>
              <span style={{ 
                background: order.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                color: order.status === 'completed' ? 'var(--success)' : 'var(--warning)', 
                padding: '0.3rem 0.8rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase'
              }}>
                {order.status === 'completed' ? 'Delivered' : 'In Progress'}
              </span>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              {order.status === 'completed' && order.deliveryURL && (
                <a href={order.deliveryURL} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', fontSize: '0.9rem' }}>
                  <Download size={18} /> Download Package
                </a>
              )}
              <button className="btn-outline" onClick={() => openChat(order.sellerName, order.sellerId)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                <MessageCircle size={18} /> Discussion with Dev
              </button>
            </div>
          </div>
        ))
      )}

      {activeChat && (
        <ChatUI 
          title={`Support Chat: @${activeChat}`} 
          onClose={() => { setActiveChat(null); setActiveChatUserId(null); }}
          otherUserId={activeChatUserId}
        />
      )}
    </div>
  );
}
