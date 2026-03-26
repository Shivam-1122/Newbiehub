import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, ChevronRight } from 'lucide-react';

const QA_TREE = {
  root: {
    question: "Hi! 👋 I'm NewbieHub Bot. How can I help you today?",
    options: [
      { label: "How do I buy a project?", next: "buy_project" },
      { label: "How do I upload/sell a project?", next: "sell_project" },
      { label: "What is KYC verification?", next: "kyc_info" },
      { label: "How does escrow work?", next: "escrow_info" },
      { label: "How to negotiate/counter-offer?", next: "negotiate" },
      { label: "How to contact support?", next: "support" },
      { label: "Account & security questions", next: "account" }
    ]
  },
  buy_project: {
    question: "🛒 **Buying a Project:**\n\n1. Browse projects on the Home page\n2. Click any project to see details\n3. Click 'Purchase Now' to buy the source code\n4. Or click 'Request Changes' to negotiate customizations\n5. After purchase, download the ZIP from your dashboard\n\nNeed help with anything else?",
    options: [
      { label: "How to request changes?", next: "negotiate" },
      { label: "Where are my purchases?", next: "purchases" },
      { label: "Back to main menu", next: "root" }
    ]
  },
  sell_project: {
    question: "📦 **Uploading & Selling a Project:**\n\n1. Sign up as a 'Developer'\n2. Complete KYC verification (required for withdrawals)\n3. Go to Dashboard → Upload New Project\n4. Add title, price, thumbnail, description, and technologies used\n5. Your project will be live on the Home page instantly!\n\nBuyers can then purchase or request custom changes.",
    options: [
      { label: "What is KYC?", next: "kyc_info" },
      { label: "How do I get paid?", next: "earnings" },
      { label: "Back to main menu", next: "root" }
    ]
  },
  kyc_info: {
    question: "🔐 **KYC (Know Your Customer) Verification:**\n\nKYC is a mandatory identity verification for developers who want to withdraw funds.\n\n• **Step 1:** Enter your PAN card details\n• **Step 2:** Complete a liveness check via camera\n• **Why?** To prevent fraud and ensure secure transactions\n\n⚠️ You can still upload projects without KYC, but you can't withdraw money until verified.",
    options: [
      { label: "How to complete KYC?", next: "kyc_steps" },
      { label: "Back to main menu", next: "root" }
    ]
  },
  kyc_steps: {
    question: "📋 **KYC Steps:**\n\n1. Go to Developer Dashboard\n2. Click 'Complete KYC Now'\n3. Enter your PAN card number and name\n4. Allow camera access for liveness verification\n5. Follow the on-screen prompts (look left, right, etc.)\n6. Once verified, your profile badge changes to ✅ Verified\n\nThis is a one-time process!",
    options: [
      { label: "Back to main menu", next: "root" }
    ]
  },
  escrow_info: {
    question: "🔒 **Escrow System:**\n\nNewbieHub uses an escrow system to protect both buyers and sellers:\n\n1. When a buyer purchases or accepts an offer, the funds are held by the platform\n2. The developer delivers the project\n3. Once the buyer confirms delivery, funds are released to the developer\n\nThis ensures:\n• Buyers don't pay without getting their project\n• Developers are guaranteed payment for completed work",
    options: [
      { label: "How do I get paid?", next: "earnings" },
      { label: "Back to main menu", next: "root" }
    ]
  },
  negotiate: {
    question: "💬 **Negotiation & Counter-Offers:**\n\n**As a Buyer:**\n1. Go to any project → Click 'Request Changes'\n2. Describe what you want modified\n3. Propose a budget\n4. The developer will Accept, Counter, or Decline\n\n**As a Developer:**\n1. Check your Dashboard → Active Offers\n2. Accept the offer, send a counter-offer with a new price, or decline\n3. The buyer will see your counter and can accept or negotiate further",
    options: [
      { label: "What happens after acceptance?", next: "after_accept" },
      { label: "Back to main menu", next: "root" }
    ]
  },
  after_accept: {
    question: "✅ **After an Offer is Accepted:**\n\n1. Funds enter escrow (held safely by platform)\n2. The project appears in both users' 'Ongoing Projects'\n3. Developer works on the customization\n4. Developer uploads the delivery\n5. Buyer reviews and confirms\n6. Funds are released to the developer\n\nBoth parties can chat throughout the process!",
    options: [
      { label: "Back to main menu", next: "root" }
    ]
  },
  earnings: {
    question: "💰 **Earnings & Withdrawals:**\n\n• Go to Dashboard → Earnings to see your income\n• Net Income = total from cleared sales\n• Pending = funds still in escrow\n• Available = funds ready for withdrawal\n\n⚠️ KYC verification is required before you can withdraw any funds.",
    options: [
      { label: "What is KYC?", next: "kyc_info" },
      { label: "Back to main menu", next: "root" }
    ]
  },
  purchases: {
    question: "📥 **Finding Your Purchases:**\n\n1. Go to Buyer Dashboard\n2. Click 'My Purchases'\n3. You'll see all completed purchases with download buttons\n4. Click 'Source Files' to download the ZIP\n\nFor ongoing custom orders, check 'Ongoing Projects' instead.",
    options: [
      { label: "Back to main menu", next: "root" }
    ]
  },
  support: {
    question: "📧 **Contact Support:**\n\n• Email: support@newbiehub.com\n• Use the 'Contact Us' page in the navigation\n• Response time: within 24 hours\n\nFor urgent issues (fraud, security), include 'URGENT' in your subject line.",
    options: [
      { label: "Back to main menu", next: "root" }
    ]
  },
  account: {
    question: "⚙️ **Account & Security:**\n\nYou can manage your account from the Settings page:\n\n• **Change Password** — update your password anytime\n• **Theme** — switch between dark and light mode\n• **Delete Account** — permanently remove your account (irreversible!)\n\nYour profile shows your User ID, email, role, and KYC status.",
    options: [
      { label: "How to change password?", next: "password" },
      { label: "Back to main menu", next: "root" }
    ]
  },
  password: {
    question: "🔑 **Changing Your Password:**\n\n1. Go to Settings\n2. Under 'Security', enter your new password\n3. Click 'Update'\n\nIf it asks you to log in again, that's a security feature — just log out and back in, then try again.",
    options: [
      { label: "Back to main menu", next: "root" }
    ]
  }
};

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    { type: 'bot', node: 'root' }
  ]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleOptionClick = (optionLabel, nextNode) => {
    setChatHistory(prev => [
      ...prev,
      { type: 'user', text: optionLabel },
      { type: 'bot', node: nextNode }
    ]);
  };

  const handleReset = () => {
    setChatHistory([{ type: 'bot', node: 'root' }]);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed', bottom: '2rem', left: '2rem',
            width: '60px', height: '60px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white', border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 99, transition: 'transform 0.2s',
          }}
          onMouseEnter={e => e.target.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.target.style.transform = 'scale(1)'}
        >
          <Bot size={28} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div style={{
          position: 'fixed', bottom: '2rem', left: '2rem', width: '380px',
          height: '520px', backgroundColor: 'var(--bg-card)', borderRadius: '16px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.3)', border: '1px solid var(--border-color)',
          display: 'flex', flexDirection: 'column', zIndex: 100, overflow: 'hidden'
        }} className="animate-fade-in">
          
          {/* Header */}
          <div style={{ 
            padding: '1rem 1.2rem', 
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', 
            color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
          }}>
            <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bot size={20} /> NewbieHub Help Bot
            </h3>
            <button onClick={() => setIsOpen(false)} style={{ color: 'white', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ 
            flexGrow: 1, padding: '1rem', overflowY: 'auto', 
            display: 'flex', flexDirection: 'column', gap: '1rem', 
            background: 'var(--bg-main)' 
          }}>
            {chatHistory.map((item, idx) => {
              if (item.type === 'user') {
                return (
                  <div key={idx} style={{
                    alignSelf: 'flex-end', background: 'var(--primary)',
                    color: 'white', padding: '0.6rem 1rem', borderRadius: '16px',
                    borderBottomRightRadius: '0', maxWidth: '80%', fontSize: '0.9rem'
                  }}>
                    {item.text}
                  </div>
                );
              }

              const node = QA_TREE[item.node];
              if (!node) return null;

              const isLatest = idx === chatHistory.length - 1;

              return (
                <div key={idx} style={{ alignSelf: 'flex-start', maxWidth: '90%' }}>
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.1))',
                    color: 'var(--text-main)', padding: '1rem',
                    borderRadius: '16px', borderBottomLeftRadius: '0',
                    fontSize: '0.9rem', lineHeight: '1.6',
                    border: '1px solid rgba(99, 102, 241, 0.2)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.8rem', color: '#8b5cf6' }}>
                      <Bot size={14} /> Bot
                    </div>
                    {node.question.split('\n').map((line, i) => (
                      <span key={i}>
                        {line.replace(/\*\*(.*?)\*\*/g, '$1')}
                        <br />
                      </span>
                    ))}
                  </div>

                  {/* Options — only show for latest bot message */}
                  {isLatest && node.options && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.8rem' }}>
                      {node.options.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => handleOptionClick(opt.label, opt.next)}
                          style={{
                            padding: '0.6rem 1rem', borderRadius: '12px',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            background: 'rgba(99, 102, 241, 0.08)',
                            color: 'var(--text-main)', cursor: 'pointer',
                            fontSize: '0.85rem', textAlign: 'left',
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => { e.target.style.background = 'rgba(99, 102, 241, 0.2)'; e.target.style.borderColor = '#6366f1'; }}
                          onMouseLeave={e => { e.target.style.background = 'rgba(99, 102, 241, 0.08)'; e.target.style.borderColor = 'rgba(99, 102, 241, 0.3)'; }}
                        >
                          <ChevronRight size={14} /> {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer */}
          <div style={{ 
            padding: '0.8rem 1rem', borderTop: '1px solid var(--border-color)', 
            background: 'var(--bg-card)', display: 'flex', justifyContent: 'center' 
          }}>
            <button 
              onClick={handleReset} 
              style={{ 
                color: '#8b5cf6', background: 'none', border: 'none', 
                cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' 
              }}
            >
              🔄 Start Over
            </button>
          </div>
        </div>
      )}
    </>
  );
}
