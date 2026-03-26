import React, { useState } from 'react';
import { ShieldCheck, Loader, X, Zap, CreditCard, AlertCircle } from 'lucide-react';
import { openRazorpayCheckout } from '../utils/razorpayUtils';
import { getCurrencySymbol } from '../utils/currencyUtils';

/**
 * PaymentModal Component
 * Uses Razorpay Checkout for real payment processing.
 * Shows a confirmation screen before opening the Razorpay gateway.
 */
export default function PaymentModal({ amount, currencySymbol, user, onConfirm, onClose, orderName, notes }) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handlePayWithRazorpay = async () => {
    setProcessing(true);
    setError(null);

    try {
      // Check if Razorpay SDK loaded
      if (!window.Razorpay) {
        throw new Error('Razorpay SDK not loaded. Please refresh the page.');
      }

      const result = await openRazorpayCheckout({
        amount: Number(amount),
        currency: 'INR',
        orderName: orderName || 'NewbieHub Purchase',
        buyerName: user?.fullName || user?.displayName || '',
        buyerEmail: user?.email || '',
        buyerPhone: user?.phone || '',
        notes: {
          buyerId: user?.uid || '',
          ...notes
        }
      });

      // Razorpay payment successful – pass payment details upstream
      onConfirm({
        method: 'razorpay',
        razorpay_payment_id: result.razorpay_payment_id,
        razorpay_order_id: result.razorpay_order_id,
        razorpay_signature: result.razorpay_signature
      });
      return; // Don't reset processing — modal will close via onConfirm

    } catch (err) {
      console.error('Razorpay payment error:', err);
      if (err?.message === 'Payment cancelled by user.') {
        // User closed the Razorpay modal — no error needed
      } else {
        setError(err?.description || err?.message || 'Payment failed. Please try again.');
      }
    } finally {
      // ALWAYS reset processing state so button is never stuck
      setProcessing(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '450px', padding: '2.5rem', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={24} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            width: '60px', height: '60px', borderRadius: '50%', 
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem auto'
          }}>
            <CreditCard size={28} color="var(--primary)" />
          </div>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Secure Checkout</h2>
          <p style={{ color: 'var(--text-muted)' }}>Amount to pay:</p>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary)', marginTop: '0.5rem' }}>
            {currencySymbol}{Number(amount).toLocaleString('en-IN')}
          </div>
        </div>

        {/* Payment breakdown */}
        <div style={{ 
          padding: '1.2rem', 
          background: 'rgba(59, 130, 246, 0.03)', 
          borderRadius: '12px', 
          marginBottom: '1.5rem',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            <span>Subtotal</span>
            <span>{currencySymbol}{Number(amount).toLocaleString('en-IN')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            <span>Platform Fee (8%)</span>
            <span>Included</span>
          </div>
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.05rem' }}>
            <span>Total</span>
            <span style={{ color: 'var(--primary)' }}>{currencySymbol}{Number(amount).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Razorpay badge */}
        <div style={{ 
          textAlign: 'center', 
          padding: '0.8rem', 
          background: 'rgba(37, 99, 235, 0.05)', 
          borderRadius: '8px', 
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}>
          <Zap size={16} color="var(--primary)" />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Powered by <strong style={{ color: 'var(--text-main)' }}>Razorpay</strong> — UPI, Cards, Net Banking & Wallets
          </span>
        </div>

        {/* Error display */}
        {error && (
          <div className="animate-fade-in" style={{ 
            padding: '1rem', 
            background: 'rgba(239, 68, 68, 0.08)', 
            borderRadius: '10px', 
            border: '1px solid rgba(239, 68, 68, 0.3)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <AlertCircle size={20} color="var(--danger)" />
            <p style={{ fontSize: '0.85rem', color: 'var(--danger)', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Security notice */}
        <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <ShieldCheck color="var(--success)" size={24} />
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
            Your transaction is secured with 256-bit encryption and NewbieHub Escrow Protection.
          </p>
        </div>

        <button 
          className="btn-primary" 
          style={{ 
            width: '100%', padding: '1rem', fontSize: '1.2rem', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem',
            background: processing ? undefined : 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
            border: 'none'
          }}
          onClick={handlePayWithRazorpay}
          disabled={processing}
        >
          {processing 
            ? <><Loader size={20} className="spin" /> Opening Gateway...</> 
            : <>Pay {currencySymbol}{Number(amount).toLocaleString('en-IN')} <Zap size={18} /></>
          }
        </button>
      </div>
    </div>
  );
}
