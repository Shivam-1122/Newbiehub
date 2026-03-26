import React from 'react';
import { Lock, BookOpen, ArrowLeft, Eye, Shield, Database, UserCheck, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  const sections = [
    {
      icon: <Database size={24} color="var(--primary)" />,
      title: '1. Information We Collect',
      content: [
        { label: 'Personal Information', text: 'Full name, email address, date of birth, and gender provided during registration.' },
        { label: 'Financial Data', text: 'Payment transaction records processed through Razorpay. We do NOT store your card numbers, UPI IDs, or bank login credentials.' },
        { label: 'Communication Data', text: 'Messages exchanged through our in-app chat system are end-to-end encrypted using AES-256 encryption.' },
        { label: 'Usage Data', text: 'Pages visited, projects viewed, and interaction patterns to improve the platform experience.' }
      ]
    },
    {
      icon: <Eye size={24} color="var(--warning)" />,
      title: '2. How We Use Your Data',
      content: [
        { label: 'Account Management', text: 'To create and maintain your account, verify your identity (KYC for developers), and facilitate transactions.' },
        { label: 'Payment Processing', text: 'To process purchases, manage escrow funds, and handle developer payouts through Razorpay.' },
        { label: 'Communication', text: 'To send you notifications about account activity, new messages, project updates, and important platform announcements.' },
        { label: 'Platform Safety', text: 'To detect and prevent fraud, enforce our Terms & Conditions, and maintain platform integrity.' }
      ]
    },
    {
      icon: <Shield size={24} color="var(--success)" />,
      title: '3. Data Protection',
      content: [
        { label: 'Encryption', text: 'All chat messages are encrypted using AES-256. Data in transit is protected via HTTPS/SSL.' },
        { label: 'Secure Payments', text: 'We use Razorpay (PCI-DSS compliant) for all payment processing. We never handle or store raw payment credentials.' },
        { label: 'Firebase Security', text: 'User data is stored on Google Firebase with real-time security rules preventing unauthorized access.' },
        { label: 'Access Control', text: 'Role-based access ensures buyers, developers, and admins can only access data relevant to their role.' }
      ]
    },
    {
      icon: <Globe size={24} color="var(--primary)" />,
      title: '4. Data Sharing',
      content: [
        { label: 'Third-Party Services', text: 'We share limited data with Razorpay (payment processing) and Google Firebase (data hosting). No data is sold to advertisers or marketing firms.' },
        { label: 'Legal Requirements', text: 'We may disclose user information to law enforcement if required by law or to protect against fraud as outlined in our Terms & Conditions.' },
        { label: 'Developer Profiles', text: 'Your public developer profile (name, rating, project listings) is visible to all platform users. Private data (email, earnings) is never shared publicly.' }
      ]
    },
    {
      icon: <UserCheck size={24} color="var(--warning)" />,
      title: '5. Your Rights',
      content: [
        { label: 'Access & Edit', text: 'You can view and edit your personal information anytime from your Profile page.' },
        { label: 'Account Deletion', text: 'You can permanently delete your account from Settings. This removes all personal data from our systems.' },
        { label: 'Data Export', text: 'You can request an export of your data by contacting our support team.' },
        { label: 'Notification Control', text: 'You can enable or disable email and push notifications from your Settings page at any time.' }
      ]
    },
    {
      icon: <Lock size={24} color="var(--danger)" />,
      title: '6. Cookies & Local Storage',
      content: [
        { label: 'Authentication', text: 'We use Firebase Authentication tokens stored in your browser to keep you logged in securely.' },
        { label: 'Preferences', text: 'Theme preferences (light/dark mode) and notification settings are stored locally for a seamless experience.' },
        { label: 'No Tracking Cookies', text: 'We do NOT use third-party tracking cookies, analytics pixels, or advertising trackers.' }
      ]
    }
  ];

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '3rem auto', padding: '0 1rem' }}>
       <div className="card" style={{ padding: '3rem' }}>
         <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
           <Lock size={64} color="var(--primary)" style={{ marginBottom: '1rem' }} />
           <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Privacy Policy</h1>
           <p style={{ color: 'var(--text-muted)' }}>Last Updated: March 22, 2026</p>
           <p style={{ color: 'var(--text-muted)', marginTop: '1rem', maxWidth: '600px', margin: '1rem auto 0', lineHeight: '1.6' }}>
             At NewbieHub, your privacy and data security are our top priorities. This policy explains what data we collect, how we use it, and how we protect it.
           </p>
         </div>

         {sections.map((section, i) => (
           <section key={i} style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.2rem' }}>
                 {section.icon}
                 {section.title}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingLeft: '0.5rem' }}>
                {section.content.map((item, j) => (
                  <div key={j} style={{ padding: '1rem 1.2rem', background: 'var(--bg-hover)', borderRadius: '10px', borderLeft: '3px solid var(--primary)' }}>
                    <strong style={{ display: 'block', marginBottom: '0.3rem' }}>{item.label}</strong>
                    <p style={{ margin: 0, lineHeight: '1.6', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{item.text}</p>
                  </div>
                ))}
              </div>
           </section>
         ))}

         <section style={{ marginBottom: '2.5rem' }}>
           <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
             7. Policy Updates
           </h2>
           <p style={{ lineHeight: '1.8', color: 'var(--text-muted)' }}>
             We may update this Privacy Policy periodically to reflect changes in our practices or legal requirements. 
             Any significant changes will be communicated through in-app notifications. 
             Continued use of NewbieHub after updates constitutes acceptance of the revised policy.
           </p>
         </section>

         <section style={{ marginBottom: '2rem' }}>
           <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
             8. Contact Us
           </h2>
           <p style={{ lineHeight: '1.8', color: 'var(--text-muted)' }}>
             If you have any questions about this Privacy Policy or wish to exercise your data rights, 
             please reach out through our <a href="/contact" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Contact Us</a> page 
             or email us directly.
           </p>
         </section>

         <div style={{ padding: '2rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', textAlign: 'center' }}>
            <Shield size={40} color="var(--success)" style={{ marginBottom: '0.5rem' }} />
            <p style={{ margin: 0, fontWeight: 'bold' }}>Your trust is our foundation.</p>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>We are committed to keeping your data secure and your experience transparent.</p>
         </div>
       </div>
    </div>
  );
}
