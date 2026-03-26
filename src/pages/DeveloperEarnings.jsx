import React, { useState, useEffect } from 'react';
import { DollarSign, RefreshCw, Loader, ArrowLeft, Landmark, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { ref, onValue, get, update, push } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { formatFullDate } from '../utils/dateUtils';
import { getCurrencySymbol, formatCurrency } from '../utils/currencyUtils';

export default function DeveloperEarnings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBankForm, setShowBankForm] = useState(false);
  const [isSubmittingBank, setIsSubmittingBank] = useState(false);
  const [bankData, setBankData] = useState({
    accountName: user?.bankDetails?.accountName || '',
    accountNumber: user?.bankDetails?.accountNumber || '',
    ifscCode: user?.bankDetails?.ifscCode || '',
    bankName: user?.bankDetails?.bankName || ''
  });

  const [withdrawalLoading, setWithdrawalLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const offersRef = ref(db, 'offers');
    const ordersRef = ref(db, 'orders');

    const loadData = async () => {
      try {
        const offSnap = await get(offersRef);
        const ordSnap = await get(ordersRef);
        const transRef = ref(db, 'transactions');
        const transSnap = await get(transRef);

        let all = [];
        let allTrans = [];

        if (offSnap.exists()) {
           const data = offSnap.val();
           const myOff = Object.entries(data)
            .filter(([_, o]) => o.sellerId === user.uid && o.isFunded && o.status !== 'completed')
            .map(([id, o]) => ({ id, ...o, amount: o.budget, type: 'Custom', date: o.fundedAt || o.createdAt }));
           all = [...all, ...myOff];
        }

        if (ordSnap.exists()) {
           const data = ordSnap.val();
           const myOrd = Object.entries(data)
            .filter(([_, o]) => o.sellerId === user.uid)
            .map(([id, o]) => ({ id, ...o, type: 'Direct', date: o.deliveredAt || o.createdAt }));
           all = [...all, ...myOrd];
        }

        if (transSnap.exists()) {
           const data = transSnap.val();
           allTrans = Object.entries(data)
            .filter(([_, t]) => t.userId === user.uid)
            .map(([id, t]) => ({ id, ...t, isLedgerItem: true }));
        }

        // Synthesize transactions from history if not already in ledger
        const historyTrans = all.map(h => ({
          id: 'hist_' + h.id,
          timestamp: h.date || h.createdAt,
          description: h.type === 'Custom' ? `Project: ${h.projectTitle || 'Custom Project'}` : `Direct Sale: ${h.title || 'Product Sale'}`,
          type: 'earning',
          amount: h.type === 'Custom' ? Number(h.amount || 0) * 0.92 : Number(h.price || 0) * 0.92,
          isSynthetic: true
        }));

        // Merge logic: prefer real ledger items
        const merged = [...allTrans];
        historyTrans.forEach(ht => {
          // Robust check: don't double count if a ledger item mentions this project
          const projectPart = (ht.description || '').split(':')[1]?.trim();
          const exists = allTrans.some(at => {
            const desc = at.description || '';
            return projectPart && desc.toLowerCase().includes(projectPart.toLowerCase());
          });
          if (!exists) merged.push(ht);
        });

        setHistory(all.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0)));
        setTransactions(merged.sort((a,b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)));
      } catch (e) {
        console.error("Developer Earnings Load Error:", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
    const unsub = onValue(offersRef, loadData);
    const unsubTrans = onValue(ref(db, 'transactions'), loadData);
    return () => { unsub(); unsubTrans(); };
  }, [user]);

  const walletBalance = user?.walletBalance || 0;
  // Read pending earnings directly from the user's DB record
  const pendingEarnings = user?.pendingEarnings || 0;

  const handleUpdateBank = async (e) => {
    e.preventDefault();
    if (!bankData.accountNumber || !bankData.ifscCode) {
      alert("Please fill in Account Number and IFSC.");
      return;
    }
    setIsSubmittingBank(true);
    try {
      await update(ref(db, `users/${user.uid}`), {
        bankDetails: bankData
      });
      alert("Bank details updated successfully.");
      setShowBankForm(false);
    } catch (e) {
      alert("Failed to update bank details.");
    } finally {
      setIsSubmittingBank(false);
    }
  };

  const handleWithdraw = async () => {
    const minWithdrawal = 5000;
    if (walletBalance < minWithdrawal) {
      alert(`Minimum withdrawal amount is ${getCurrencySymbol()}${minWithdrawal}. Your current balance is ${getCurrencySymbol()}${walletBalance}.`);
      return;
    }

    if (!user.bankDetails) {
      setShowBankForm(true);
      return;
    }

    if (window.confirm(`Request a payout of ${getCurrencySymbol()}${walletBalance} to your bank account ending in ...${user.bankDetails.accountNumber.slice(-4)}?`)) {
      setWithdrawalLoading(true);
      try {
        const withdrawalRef = ref(db, 'withdrawals');
        const newReqRef = push(withdrawalRef);
        
        const amount = walletBalance;
        
        await set(newReqRef, {
          userId: user.uid,
          userName: user.fullName,
          amount: amount,
          currency: 'INR',
          bankDetails: user.bankDetails,
          status: 'pending',
          createdAt: new Date().toISOString()
        });

        // Update balance
        await update(ref(db, `users/${user.uid}`), {
          walletBalance: 0
        });

        // Record trans
        const transRef = ref(db, 'transactions');
        await push(transRef, {
          userId: user.uid,
          amount: amount,
          type: 'withdrawal',
          description: `Withdrawal to Bank (...${user.bankDetails.accountNumber.slice(-4)})`,
          timestamp: new Date().toISOString()
        });

        alert("Withdrawal request sent! It will be processed by our finance team within 24-48 hours.");
      } catch (e) {
        alert("Withdrawal failed. Please try again.");
      } finally {
        setWithdrawalLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '6rem', color: 'var(--text-muted)' }}>
        <Loader size={40} className="spin" style={{ margin: '0 auto', marginBottom: '1rem' }} />
        <p>Loading earnings...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '2rem auto' }}>
      <button className="btn-back" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} /> Back
      </button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Earnings & Payouts</h1>
        <button className="btn-outline" onClick={() => setShowBankForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
           <Landmark size={18} /> {user.bankDetails ? 'Edit Bank Details' : 'Add Bank Info'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '2rem', borderBottom: '4px solid var(--warning)' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Pending in Escrow (Net)</p>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '0.2rem' }}>{getCurrencySymbol()}{pendingEarnings.toLocaleString()}</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
             These funds are securely held until buyers release them after project approval.
          </p>
        </div>
        <div className="card" style={{ padding: '2rem', borderBottom: '4px solid var(--success)' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Withdrawable Balance</p>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '0.2rem' }}>{getCurrencySymbol()}{walletBalance.toLocaleString()}</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--success)', marginTop: '0.5rem', fontWeight: 'bold' }}>
             Available for withdrawal once you reach {getCurrencySymbol()}5,000.
          </p>
          <button 
            className="btn-primary" 
            style={{ marginTop: '1rem', width: '100%', background: 'var(--success)', borderColor: 'var(--success)' }} 
            onClick={handleWithdraw}
            disabled={withdrawalLoading || walletBalance < 5000}
          >
            {withdrawalLoading ? 'Requesting...' : (walletBalance < 5000 ? `Need ${getCurrencySymbol()}5,000 to Withdraw` : 'Withdraw to Bank Account')}
          </button>
        </div>
      </div>

      {showBankForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Landmark size={24} color="var(--primary)" /> Bank Account Details
            </h2>
            <form onSubmit={handleUpdateBank}>
              <div className="form-group">
                <label className="form-label">Full Name on Account</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={bankData.accountName} 
                  onChange={e => setBankData({...bankData, accountName: e.target.value})} 
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Account Number</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={bankData.accountNumber} 
                  onChange={e => setBankData({...bankData, accountNumber: e.target.value})} 
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">IFSC Code / SWIFT</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={bankData.ifscCode} 
                  onChange={e => setBankData({...bankData, ifscCode: e.target.value})} 
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Bank Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={bankData.bankName} 
                  onChange={e => setBankData({...bankData, bankName: e.target.value})} 
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setShowBankForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={isSubmittingBank}>
                  {isSubmittingBank ? 'Updating...' : 'Save Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Warning if KYC not verified */}
      {user.kycStatus !== 'verified' && (
        <div className="card" style={{ padding: '1.5rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid var(--danger)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <AlertTriangle color="var(--danger)" />
          <p style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>
            <strong>Action Required:</strong> You must verify your identity (KYC) before any withdrawal request can be processed. 
            <button onClick={() => navigate('/dev/kyc')} style={{ background: 'none', border: 'none', color: 'var(--primary)', textDecoration: 'underline', cursor: 'pointer', marginLeft: '0.5rem' }}>Verify Now</button>
          </p>
        </div>
      )}

      <div className="card" style={{ padding: '0', overflow: 'hidden', marginBottom: '3rem' }}>
         <div style={{ padding: '2rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(59, 130, 246, 0.02)' }}>
           <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}><RefreshCw size={24} color="var(--primary)" /> Recent Transactions & Payouts</h2>
           <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.4rem' }}>
             Chronological log of all earnings, escrow releases, and bank withdrawals.
           </p>
         </div>
         <div style={{ overflowX: 'auto' }}>
           <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
             <thead>
               <tr style={{ background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-color)' }}>
                 <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>DATE & TIME</th>
                 <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>DESCRIPTION</th>
                 <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>TYPE</th>
                 <th style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'right' }}>AMOUNT</th>
               </tr>
             </thead>
             <tbody>
               {transactions.length === 0 ? (
                 <tr>
                    <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No financial activity to show.</td>
                 </tr>
               ) : (
                transactions.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {formatFullDate(t.timestamp)}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                      {t.description}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 'bold',
                        background: t.type === 'earning' ? 'rgba(16, 185, 129, 0.1)' : (t.type === 'escrow' ? 'rgba(245, 158, 11, 0.1)' : (t.type === 'withdrawal' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)')),
                        color: t.type === 'earning' ? 'var(--success)' : (t.type === 'escrow' ? 'var(--warning)' : (t.type === 'withdrawal' ? 'var(--primary)' : 'var(--danger)'))
                      }}>
                        {t.type.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 'bold', color: t.type === 'earning' ? 'var(--success)' : (t.type === 'escrow' ? 'var(--warning)' : (t.type === 'withdrawal' ? 'var(--primary)' : 'var(--danger)')) }}>
                      {t.type === 'earning' ? '+' : (t.type === 'escrow' ? '🔒 ' : (t.type === 'withdrawal' ? '↗ ' : '-'))}{getCurrencySymbol()}{Number(t.amount || 0).toLocaleString()}
                    </td>
                  </tr>
                ))
               )}
             </tbody>
           </table>
         </div>
         <div style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--bg-hover)' }}>
           <button 
             onClick={() => navigate('/dev/sales')} 
             className="btn-outline" 
             style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem' }}
           >
             Detailed Sales Ledger
           </button>
         </div>
      </div>

    </div>
  );
}
