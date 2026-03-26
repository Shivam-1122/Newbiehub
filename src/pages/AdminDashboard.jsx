import React, { useState, useEffect } from 'react';
import { Search, Activity, Shield, AlertTriangle, Users, Loader, ArrowLeft, UserX, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { ref, get, onValue, update } from 'firebase/database';
import { formatFullDate } from '../utils/dateUtils';
import { getCurrencySymbol } from '../utils/currencyUtils';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedUser, setSearchedUser] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [stats, setStats] = useState({ totalUsers: 0, activeOffers: 0, totalVolume: 0, pendingFees: 0, collectedFees: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);

  useEffect(() => {
    // Load platform stats
    const usersRef = ref(db, 'users');
    const offersRef = ref(db, 'offers');
    const ordersRef = ref(db, 'orders');

    const fetchAndMergeTransactions = async () => {
      const ordersSnap = await get(ordersRef);
      const offersSnap = await get(offersRef);
      
      let transMap = new Map();
      let totalVol = 0;
      let activeDealCount = 0;

      if (ordersSnap.exists()) {
        Object.entries(ordersSnap.val()).forEach(([id, o]) => {
          const amt = Number(o.amount || o.budget || 0);
          if (amt > 0) {
            totalVol += amt;
            const timeKey = Math.floor(new Date(o.createdAt || o.completedAt || 0).getTime() / 60000);
            const uniqueKey = `${o.projectTitle || o.title}_${amt}_${timeKey}`;
            transMap.set(uniqueKey, { id, ...o, type: o.orderType === 'custom' ? 'Custom' : 'Direct', amount: amt, createdAt: o.completedAt || o.deliveredAt || o.createdAt });
          }
        });
      }

      if (offersSnap.exists()) {
        Object.entries(offersSnap.val()).forEach(([id, o]) => {
          if (o.status === 'pending' || o.status === 'countered') activeDealCount++;
          
          if (o.status === 'completed') {
            const amt = Number(o.budget || o.amount);
            if (amt > 0) {
              const timeKey = Math.floor(new Date(o.createdAt || o.completedAt || 0).getTime() / 60000);
              const uniqueKey = `${o.projectTitle || o.title}_${amt}_${timeKey}`;
              if (!transMap.has(uniqueKey)) {
                totalVol += amt;
                transMap.set(uniqueKey, { id, ...o, type: 'Custom', amount: amt, createdAt: o.completedAt || o.fundedAt || o.createdAt });
              }
            }
          }
        });
      }

      const allTrans = Array.from(transMap.values()).sort((a,b) => new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0));
      
      setTransactions(allTrans);
      
      // Real-time synchronization of stats based on merging
      const calculatedCollected = allTrans.reduce((sum, t) => sum + (t.amount * 0.08), 0);
      setStats(prev => ({ 
        ...prev, 
        totalVolume: totalVol, 
        activeOffers: activeDealCount,
        collectedFees: calculatedCollected
      }));
    };

    const unsubUsers = onValue(usersRef, (snapshot) => {
      const count = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
      setStats(prev => ({ ...prev, totalUsers: count }));
    });

    const unsubOrders = onValue(ordersRef, (snapshot) => {
       fetchAndMergeTransactions();
    });

    const unsubOffers = onValue(offersRef, (snapshot) => {
       fetchAndMergeTransactions();
    });

    const platformRef = ref(db, 'platform/stats');
    const unsubPlatform = onValue(platformRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setStats(prev => ({ 
          ...prev, 
          pendingFees: Number(data.pendingFees || 0), 
          collectedFees: Number(data.collectedFees || 0) 
        }));
      } else {
        // Seed if missing
        update(platformRef, { pendingFees: 0, collectedFees: 0 });
      }
      setLoadingStats(false);
    });

    return () => { unsubUsers(); unsubOffers(); unsubOrders(); unsubPlatform(); };
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    setSearchError('');
    setSearchedUser(null);
    
    try {
      const userRef = ref(db, `users/${searchQuery.trim()}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        
        // Get user's activity from orders
        const ordersRef = ref(db, 'orders');
        const ordersSnap = await get(ordersRef);
        let orderActivity = [];
        if (ordersSnap.exists()) {
          orderActivity = Object.values(ordersSnap.val())
            .filter(o => o.buyerId === searchQuery.trim() || o.sellerId === searchQuery.trim())
            .map(o => ({
              text: o.buyerId === searchQuery.trim() ? `Purchased "${o.projectTitle}" for ${getCurrencySymbol()}${o.amount}` : `Sold "${o.projectTitle}" for ${getCurrencySymbol()}${o.amount}`,
              timestamp: o.createdAt ? new Date(o.createdAt).getTime() : 0
            }));
        }

        // Get user's activity from offers
        const offersRef = ref(db, 'offers');
        const offersSnap = await get(offersRef);
        let offerActivity = [];
        if (offersSnap.exists()) {
          offerActivity = Object.values(offersSnap.val())
            .filter(o => o.buyerId === searchQuery.trim() || o.sellerId === searchQuery.trim())
            .map(o => {
              const role = o.buyerId === searchQuery.trim() ? 'Buyer' : 'Seller';
              let text = `${role} deal on "${o.projectTitle}" - Status: ${o.status.toUpperCase()}`;
              if (o.isFunded) text += ` | FUNDED`;
              if (o.previewURL) text += ` | Preview: ${o.previewURL}`;
              if (o.deliveryURL) text += ` | Final: ${o.deliveryURL}`;
              if (o.status === 'completed') text += ` | COMPLETED`;
              
              return { text, timestamp: o.fundedAt ? new Date(o.fundedAt).getTime() : (o.createdAt ? new Date(o.createdAt).getTime() : 0) };
            });
        }

        // Get user's uploaded projects
        const projectsRef = ref(db, 'projects');
        const projectsSnap = await get(projectsRef);
        let userProjects = [];
        if (projectsSnap.exists()) {
          userProjects = Object.entries(projectsSnap.val())
            .filter(([_, p]) => p.authorId === searchQuery.trim())
            .map(([id, p]) => ({ id, ...p }));
        }

        const activity = [...orderActivity, ...offerActivity]
          .sort((a, b) => b.timestamp - a.timestamp)
          .map(a => a.text)
          .slice(0, 10);

        setSearchedUser({
          id: searchQuery.trim(),
          name: userData.fullName || 'Unknown',
          email: userData.email,
          role: userData.role,
          status: userData.isSuspended ? 'Suspended' : 'Active',
          isSuspended: userData.isSuspended || false,
          kycStatus: userData.kycStatus || 'pending',
          recentActivity: activity.length > 0 ? activity : ['No recent activity found'],
          projects: userProjects,
          createdAt: userData.createdAt
        });
      } else {
        setSearchError('No user found with this ID. Try copying the exact User ID from their profile.');
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchError('Error searching for user. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleToggleSuspense = async () => {
    if (!searchedUser) return;
    const newSuspendedState = !searchedUser.isSuspended;
    const action = newSuspendedState ? "SUSPEND" : "UNSUSPEND";
    
    if (window.confirm(`Are you sure you want to ${action} this user?`)) {
      try {
        await update(ref(db, `users/${searchedUser.id}`), { isSuspended: newSuspendedState });
        setSearchedUser({ 
          ...searchedUser, 
          isSuspended: newSuspendedState, 
          status: newSuspendedState ? 'Suspended' : 'Active' 
        });
      } catch (error) {
        console.error("Error toggling suspension:", error);
        alert("Failed to update user status.");
      }
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Shield size={32} color="var(--primary)" />
        <h1>Platform Admin Control Panel</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '2rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Total Users</p>
          <h2 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={28} color="var(--primary)" /> 
            {loadingStats ? <Loader size={20} className="spin" /> : stats.totalUsers.toLocaleString()}
          </h2>
        </div>
        <div className="card" style={{ padding: '2rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Active Offers</p>
          <h2 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={28} color="var(--warning)" /> 
            {loadingStats ? <Loader size={20} className="spin" /> : stats.activeOffers}
          </h2>
        </div>
        <div className="card" style={{ padding: '2rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Total Platform Earnings (8% Fee)</p>
          <h2 style={{ fontSize: '1.8rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <span style={{ color: 'var(--success)' }}>
              {getCurrencySymbol()}{loadingStats ? <Loader size={20} className="spin" /> : (stats.collectedFees || 0).toLocaleString()}
              <span style={{ fontSize: '0.8rem', marginLeft: '0.5rem' }}>(Collected Commission)</span>
            </span>
            <span style={{ fontSize: '0.9rem', color: 'var(--warning)' }}>
              + {getCurrencySymbol()}{loadingStats ? '...' : (stats.pendingFees || 0).toLocaleString()} (Pending in Escrow)
            </span>
          </h2>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>User Directory Search (Track Activity)</h2>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem' }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Search by Unique User ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn-primary" disabled={searching}>
            {searching ? <Loader size={20} className="spin" /> : <Search size={20} />} Track User
          </button>
        </form>
        {searchError && <p style={{ color: 'var(--danger)', marginTop: '1rem', fontSize: '0.9rem' }}>{searchError}</p>}
      </div>

      <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
             <Activity size={24} color="var(--primary)" /> Platform Transaction History
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
             <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Filter by Month:</label>
             <input 
               type="month" 
               className="form-input" 
               style={{ width: '180px' }}
               value={selectedMonth}
               onChange={(e) => setSelectedMonth(e.target.value)}
             />
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
              <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Date</th>
              <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Project</th>
              <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Type</th>
              <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Amount</th>
              <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Fee (8%)</th>
            </tr>
          </thead>
          <tbody>
            {transactions
              .filter(t => {
                const rawDate = t.createdAt || t.timestamp || new Date().toISOString();
                const tDate = new Date(rawDate);
                if (isNaN(tDate.getTime())) return false;
                const tMonth = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
                return tMonth === selectedMonth;
              })
              .map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatFullDate(t.createdAt || t.timestamp)}</td>
                  <td style={{ padding: '1rem', fontWeight: '500' }}>{t.projectTitle || 'Custom Project'}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>{t.type}</span>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--success)', fontWeight: 'bold' }}>{getCurrencySymbol()}{Number(t.amount).toLocaleString()}</td>
                  <td style={{ padding: '1rem', color: 'var(--warning)' }}>{getCurrencySymbol()}{(Number(t.amount) * 0.08).toFixed(2)}</td>
                </tr>
              ))}
            {transactions.filter(t => {
                if (!t.createdAt) return false;
                const tDate = new Date(t.createdAt);
                const tMonth = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
                return tMonth === selectedMonth;
              }).length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No transactions found for this month.</td>
              </tr>
            )}
          </tbody>
        </table>
        
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', display: 'flex', justifyContent: 'flex-end', gap: '2rem', alignItems: 'center' }}>
           <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
             Monthly Revenue: 
             <span style={{ color: 'var(--success)', marginLeft: '0.5rem' }}>
               {getCurrencySymbol()}{transactions.reduce((acc, t) => {
                  if (!t.createdAt) return acc;
                  const d = new Date(t.createdAt);
                  const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                  return m === selectedMonth ? acc + (Number(t.amount) * 0.08) : acc;
               }, 0).toFixed(2)}
             </span>
           </span>
        </div>
      </div>

      {searchedUser && (
        <div className="card" style={{ padding: '2rem', borderLeft: searchedUser.isSuspended ? '4px solid var(--danger)' : '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <img src={`https://ui-avatars.com/api/?name=${searchedUser.name}&background=random`} alt="Avatar" style={{ width: '80px', height: '80px', borderRadius: '50%' }} />
              <div>
                <h2 style={{ fontSize: '2rem', marginBottom: '0.2rem' }}>{searchedUser.name}</h2>
                <p style={{ color: 'var(--text-muted)' }}>
                  Role: <strong style={{ textTransform: 'capitalize' }}>{searchedUser.role}</strong> | Email: {searchedUser.email}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <span style={{ 
                    padding: '0.2rem 0.8rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold',
                    background: searchedUser.isSuspended ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    color: searchedUser.isSuspended ? 'var(--danger)' : 'var(--success)',
                    border: `1px solid ${searchedUser.isSuspended ? 'var(--danger)' : 'var(--success)'}`
                  }}>
                    {searchedUser.status.toUpperCase()}
                  </span>
                  <span style={{ padding: '0.2rem 0.8rem', borderRadius: '12px', fontSize: '0.75rem', background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                    KYC: {searchedUser.kycStatus.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={handleToggleSuspense}
              className={searchedUser.isSuspended ? "btn-primary" : "btn-outline"} 
              style={{ 
                display: 'flex', alignItems: 'center', gap: '0.4rem', 
                borderColor: searchedUser.isSuspended ? 'var(--success)' : 'var(--danger)',
                color: searchedUser.isSuspended ? '#fff' : 'var(--danger)',
                background: searchedUser.isSuspended ? 'var(--success)' : 'transparent',
                padding: '0.6rem 1.2rem', fontWeight: 'bold'
              }}
            >
              {searchedUser.isSuspended ? <><UserCheck size={18} /> Unsuspend User</> : <><UserX size={18} /> Suspend User</>}
            </button>
          </div>

          <div className="form-row cols-2" style={{ display: 'grid', gap: '2rem' }}>
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Activity size={20} color="var(--primary)" /> Activity Logs (Recent 10)
              </h3>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {searchedUser.recentActivity.map((log, idx) => (
                  <li key={idx} style={{ padding: '1rem', background: 'var(--bg-hover)', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
                    {log}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Users size={20} color="var(--primary)" /> Shared Projects ({searchedUser.projects?.length || 0})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {searchedUser.projects && searchedUser.projects.length > 0 ? (
                  searchedUser.projects.map(p => (
                    <div key={p.id} style={{ padding: '1rem', background: 'var(--bg-hover)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{p.title}</strong>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{getCurrencySymbol()}{p.price} | {p.category}</p>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.id}</span>
                    </div>
                  ))
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem', background: 'var(--bg-hover)', borderRadius: '8px' }}>
                    No uploaded projects found.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
