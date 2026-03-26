import React from 'react';
import { ShieldAlert, BookOpen, ArrowLeft, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '3rem auto', padding: '0 1rem' }}>
       <div className="card" style={{ padding: '3rem' }}>
         <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
           <BookOpen size={64} color="var(--primary)" style={{ marginBottom: '1rem' }} />
           <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Terms & Conditions</h1>
           <p style={{ color: 'var(--text-muted)' }}>Last Updated: March 22, 2026</p>
         </div>

         <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
               <ShieldAlert size={28} color="var(--danger)" />
               Zero Tolerance Policy on Fraud
            </h2>
            <p style={{ lineHeight: '1.8', color: 'var(--text-muted)' }}>
               NewbieHub is built on trust and professional integrity. Any form of cheating, fraud, or deceptive behavior will result in a permanent ban and immediate legal action where applicable.
            </p>
         </section>

         <section style={{ marginBottom: '2.5rem' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>1. Developer Responsibilities</h3>
            <ul style={{ lineHeight: '1.8', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
               <li><strong>Authentic Content:</strong> All projects uploaded must be original or appropriately licensed. Sharing fake download links or placeholder files is strictly prohibited.</li>
               <li><strong>Direct Delivery:</strong> Developers must provide working Google Drive or GitHub repository links. Failure to provide the actual source code after purchase will be treated as attempted theft.</li>
               <li><strong>Communication:</strong> Professionalism must be maintained in all chats. Threats, harassment, or attempts to bypass our payment system will lead to account termination.</li>
            </ul>
         </section>

         <section style={{ marginBottom: '2.5rem' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>2. Buyer Responsibilities</h3>
            <ul style={{ lineHeight: '1.8', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
               <li><strong>Fair Payments:</strong> Buyers must fund the project in escrow before any work or delivery begins. Attempting to get code without authorizing payment is fraud.</li>
               <li><strong>Final Approval:</strong> Once a project is delivered according to the agreed specifications, the buyer is obligated to release the funds. Unreasonable withholding of payments after work is completed is a violation of our terms.</li>
               <li><strong>Dispute Resolution:</strong> All project disputes must be handled through our support system. Unauthorized chargebacks or external payment disputes will result in legal escalation.</li>
            </ul>
         </section>

         <section style={{ marginBottom: '2.5rem' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>3. Platform Integrity & Legal Action</h3>
            <p style={{ lineHeight: '1.8', color: 'var(--text-muted)' }}>
               NewbieHub reserves the right to share offender identity information with law enforcement agencies or legal representatives in cases of substantial financial fraud. By using this platform, you agree that your data may be utilized as evidence during such investigations.
            </p>
         </section>

         <section style={{ marginBottom: '2.5rem' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>4. 3-Day Viewing Window</h3>
            <p style={{ lineHeight: '1.8', color: 'var(--text-muted)' }}>
               Buyers are granted a 3-day access period to download or clone the project source code. After this period, the link will automatically expire for security purposes. It is the buyer's responsibility to secure their local copy within this timeframe.
            </p>
         </section>

         <div style={{ padding: '2rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', textAlign: 'center' }}>
            <Heart size={40} color="var(--primary)" style={{ marginBottom: '0.5rem' }} />
            <p style={{ margin: 0, fontWeight: 'bold' }}>Let's grow together professionally.</p>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Thank you for being a part of NewbieHub's creative and secure marketplace.</p>
         </div>
       </div>
    </div>
  );
}
