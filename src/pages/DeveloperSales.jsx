import React, { useState, useEffect } from 'react';
import { ShoppingBag, TrendingUp, Loader, ArrowLeft, CheckCircle, Clock, Calendar, CreditCard, ImageIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { formatFullDate } from '../utils/dateUtils';
import { getCurrencySymbol, formatCurrency } from '../utils/currencyUtils';

export default function DeveloperSales() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const [projectImages, setProjectImages] = useState({});

  useEffect(() => {
    if (!user) return;

    let offersData = {};
    let ordersData = {};
    let projectsData = {};

    const buildSales = () => {
      let allSales = [];

      // Custom project sales from offers
      Object.entries(offersData).forEach(([id, offer]) => {
        if (offer.sellerId === user.uid && (offer.status === 'delivered' || offer.status === 'in_progress')) {
          allSales.push({ id, ...offer, orderType: 'custom' });
        }
      });

      // Direct purchase sales from orders 
      Object.entries(ordersData).forEach(([id, order]) => {
        if (order.sellerId === user.uid && (order.status === 'completed' || order.status === 'funds_released')) {
          allSales.push({ id, ...order, orderType: order.orderType || 'direct' });
        }
      });

      // Fetch thumbnails
      const images = {};
      allSales.forEach(s => {
        if (s.projectId && projectsData[s.projectId]?.image) {
          images[s.projectId] = projectsData[s.projectId].image;
        }
      });
      setProjectImages(images);

      allSales.sort((a, b) => new Date(b.completedAt || b.deliveredAt || b.createdAt || 0) - new Date(a.completedAt || a.deliveredAt || a.createdAt || 0));
      setSales(allSales);
      setLoading(false);
    };

    const unsubOffers = onValue(ref(db, 'offers'), (snap) => {
      offersData = snap.exists() ? snap.val() : {};
      buildSales();
    });

    const unsubOrders = onValue(ref(db, 'orders'), (snap) => {
      ordersData = snap.exists() ? snap.val() : {};
      buildSales();
    });

    const unsubProjects = onValue(ref(db, 'projects'), (snap) => {
      projectsData = snap.exists() ? snap.val() : {};
      buildSales();
    });

    return () => { unsubOffers(); unsubOrders(); unsubProjects(); };
  }, [user]);

  const currencySymbol = getCurrencySymbol();
  const defaultThumb = 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=120&h=120&fit=crop';

  const completedSales = sales.filter(s => s.status === 'completed' || s.status === 'funds_released');
  const inProgressSales = sales.filter(s => s.status === 'in_progress' || s.status === 'delivered');

  const filteredSales = sales.filter(s => {
    const d = s.completedAt || s.deliveredAt || s.createdAt;
    if (!d) return false;
    const m = `${new Date(d).getFullYear()}-${String(new Date(d).getMonth() + 1).padStart(2, '0')}`;
    return m === selectedMonth;
  });

  const totalNet = completedSales.reduce((acc, s) => acc + ((s.amount || s.budget || s.counterBudget || 0) * 0.92), 0);
  const totalGross = completedSales.reduce((acc, s) => acc + (s.amount || s.budget || s.counterBudget || 0), 0);

  const getStatusBadge = (status) => {
    const config = {
      'completed': { label: 'COMPLETED', bg: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', border: 'var(--success)' },
      'funds_released': { label: 'PAID OUT', bg: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', border: 'var(--success)' },
      'in_progress': { label: 'IN PROGRESS', bg: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', border: 'var(--primary)' },
      'delivered': { label: 'DELIVERED', bg: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', border: 'var(--warning)' },
    };
    const c = config[status] || { label: status?.toUpperCase() || 'UNKNOWN', bg: 'var(--bg-hover)', color: 'var(--text-muted)', border: 'var(--border-color)' };
    return (
      <span style={{ 
        fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '20px', fontWeight: 'bold',
        background: c.bg, color: c.color, border: `1px solid ${c.border}`, whiteSpace: 'nowrap'
      }}>
        {c.label}
      </span>
    );
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '6rem' }}><Loader size={40} className="spin" /></div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '2rem auto' }}>
      <button className="btn-back" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} /> Back
      </button>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '2rem' }}>
        <ShoppingBag size={32} color="var(--primary)" /> All Sales & Projects
      </h1>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
         <div className="card" style={{ padding: '1.5rem', textAlign: 'center', border: '1px solid var(--success)', background: 'rgba(16, 185, 129, 0.05)' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--success)' }}>{completedSales.length}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Completed Sales</div>
         </div>
         <div className="card" style={{ padding: '1.5rem', textAlign: 'center', border: '1px solid var(--primary)', background: 'rgba(59, 130, 246, 0.05)' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--primary)' }}>{inProgressSales.length}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>In Progress</div>
         </div>
         <div className="card" style={{ padding: '1.5rem', textAlign: 'center', border: '1px solid var(--warning)', background: 'rgba(245, 158, 11, 0.05)' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--warning)' }}>{currencySymbol}{totalGross.toLocaleString()}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Lifetime Gross</div>
         </div>
         <div className="card" style={{ padding: '1.5rem', textAlign: 'center', border: '1px solid var(--success)', background: 'rgba(16, 185, 129, 0.05)' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--success)' }}>{currencySymbol}{totalNet.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Net Earnings</div>
         </div>
      </div>

      {/* Active / In-Progress Projects Section */}
      {inProgressSales.length > 0 && (
        <div className="card" style={{ padding: '2rem', marginBottom: '2rem', border: '1px solid var(--primary)' }}>
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Clock size={20} color="var(--primary)" /> Active Projects
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {inProgressSales.map(s => (
              <div key={s.id} style={{ 
                display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.2rem', 
                background: 'rgba(59, 130, 246, 0.03)', borderRadius: '12px', 
                border: '1px solid var(--border-color)' 
              }}>
                <img 
                  src={projectImages[s.projectId] || defaultThumb}
                  alt={s.projectTitle}
                  style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                  onError={(e) => { e.target.src = defaultThumb; }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                    <strong>{s.projectTitle || 'Custom Project'}</strong>
                    {getStatusBadge(s.status)}
                    <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', background: 'var(--bg-hover)', borderRadius: '4px', color: 'var(--text-muted)' }}>{s.orderType}</span>
                  </div>
                  <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Buyer: @{s.buyerName || 'user'} · {s.isFunded ? 'Escrow Funded' : 'Awaiting Funding'}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                    {currencySymbol}{(s.amount || s.budget || s.counterBudget || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Sales Table */}
      <div className="card" style={{ padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CheckCircle size={20} color="var(--success)" /> Completed Sales
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
             <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Month:</label>
             <input type="month" className="form-input" style={{ width: '180px' }} value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
          </div>
        </div>

        {filteredSales.filter(s => s.status === 'completed' || s.status === 'funds_released').length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-hover)', borderRadius: '12px', border: '2px dashed var(--border-color)' }}>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>No completed sales for this period.</p>
          </div>
        ) : (
          <div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '1rem' }}>Product</th>
                    <th style={{ padding: '1rem' }}>Buyer</th>
                    <th style={{ padding: '1rem' }}>Status</th>
                    <th style={{ padding: '1rem' }}>Date</th>
                    <th style={{ padding: '1rem' }}>Gross</th>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>Net (92%)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.filter(s => s.status === 'completed' || s.status === 'funds_released').map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                          <img 
                            src={projectImages[s.projectId] || defaultThumb}
                            alt={s.projectTitle}
                            style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                            onError={(e) => { e.target.src = defaultThumb; }}
                          />
                          <div>
                            <div style={{ fontWeight: 'bold' }}>{s.projectTitle || 'Custom Dev Work'}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'inline-block', padding: '0.1rem 0.4rem', background: 'var(--bg-hover)', borderRadius: '4px', marginTop: '0.2rem' }}>{s.orderType}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>@{s.buyerName}</td>
                      <td style={{ padding: '1rem' }}>{getStatusBadge(s.status)}</td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{formatFullDate(s.completedAt || s.deliveredAt || s.createdAt)}</td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{currencySymbol}{(s.amount || s.budget || s.counterBudget || 0).toLocaleString()}</td>
                      <td style={{ padding: '1rem', color: 'var(--success)', fontWeight: 'bold', textAlign: 'right' }}>+{currencySymbol}{((s.amount || s.budget || s.counterBudget || 0) * 0.92).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '2.5rem', padding: '2rem', background: 'var(--bg-hover)', borderRadius: '16px', display: 'flex', justifyContent: 'flex-end', gap: '3rem', border: '1px solid var(--border-color)' }}>
               <div style={{ textAlign: 'right' }}>
                 <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Monthly Net Sales</p>
                 <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--success)' }}>
                   {currencySymbol}{filteredSales.filter(s => s.status === 'completed' || s.status === 'funds_released').reduce((acc, s) => acc + ((s.amount || s.budget || s.counterBudget || 0) * 0.92), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                 </p>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
