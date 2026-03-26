import React, { useState } from 'react';
import { X, Loader, ShieldCheck, Github, Globe, AlertTriangle } from 'lucide-react';
import { db } from '../firebase';
import { ref as dbRef, update } from 'firebase/database';

export default function DeliveryModal({ offer, mode = 'final', onClose, onShowSuccess }) {
  const [externalLink, setExternalLink] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState('google_drive'); // 'google_drive' or 'github'

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      const url = externalLink.toLowerCase();
      // Only validate for FINAL delivery (not preview)
      if (mode !== 'preview') {
         if (deliveryMethod === 'google_drive') {
            if (!url.includes('drive.google.com') && !url.includes('docs.google.com')) {
               alert("Invalid Google Drive Link. Please share a valid drive link where your ZIP is stored.");
               setIsUploading(false);
               return;
            }
         } else if (deliveryMethod === 'github') {
            if (!url.includes('github.com')) {
               alert("Invalid GitHub repository link. Please provide a valid public or shared repository URL.");
               setIsUploading(false);
               return;
            }
         }
      }

      const updates = mode === 'preview' ? {
        previewURL: externalLink,
        previewType: 'link',
        previewAt: new Date().toISOString()
      } : {
        status: 'delivered',
        deliveryURL: externalLink,
        deliveryType: 'link',
        deliveryMethod,
        deliveredAt: new Date().toISOString()
      };

      await update(dbRef(db, `offers/${offer.id}`), updates);
      
      onShowSuccess();
      onClose();
    } catch (error) {
      console.error("Delivery error:", error);
      alert("Failed to submit delivery. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-pop-in" style={{ maxWidth: '500px', width: '90%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}>{mode === 'preview' ? 'Submit Project Preview' : 'Project Delivery'}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {mode !== 'preview' && (
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              Final Submission Method <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
               <button 
                 type="button"
                 onClick={() => setDeliveryMethod('google_drive')}
                 style={{ 
                   flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', 
                   background: deliveryMethod === 'google_drive' ? 'var(--primary)' : 'transparent',
                   color: deliveryMethod === 'google_drive' ? '#fff' : 'var(--text-muted)',
                   fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                 }}>
                 <Globe size={16} /> Google Drive
               </button>
               <button 
                 type="button"
                 onClick={() => setDeliveryMethod('github')}
                 style={{ 
                   flex: 1, padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border-color)', 
                   background: deliveryMethod === 'github' ? 'var(--primary)' : 'transparent',
                   color: deliveryMethod === 'github' ? '#fff' : 'var(--text-muted)',
                   fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                 }}>
                 <Github size={16} /> GitHub Repo
               </button>
            </div>
            
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.8rem', padding: '0.8rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px' }}>
              {deliveryMethod === 'google_drive' ? (
                <><strong>Note:</strong> Upload your final code as a <strong>.ZIP file</strong> on Google Drive and share the link below.</>
              ) : (
                <><strong>Note:</strong> Provide the link to your final project repository. Ensure it's accessible to the buyer.</>
              )}
            </p>
          </div>
        )}

        {mode === 'preview' && (
          <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', marginBottom: '1.5rem' }}>
            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '0.4rem' }}>What is a preview link?</p>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '1.5' }}>
              It should be a <strong>live demo</strong> of your project hosted on free platforms like <strong>Vercel, Netlify, or GitHub Pages</strong>. This allows the buyer to experience the working application before they release the funds from escrow.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              {mode === 'preview' ? 'Live Project Link (Vercel, Netlify, Hosted URL)' : 'Submission Link'}
            </label>
            <input 
              type="url" 
              className="form-input" 
              placeholder={mode === 'preview' ? "https://your-preview-site.com" : (deliveryMethod === 'google_drive' ? "Enter Google Drive URL..." : "Enter GitHub Repository URL...")} 
              required 
              value={externalLink} 
              onChange={e => setExternalLink(e.target.value)} 
              disabled={isUploading}
            />
             <p style={{ fontSize: '0.8rem', color: mode === 'preview' ? 'var(--text-muted)' : 'var(--danger)', marginTop: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AlertTriangle size={14} color={mode === 'preview' ? 'var(--primary)' : 'var(--danger)'} /> 
                {mode === 'preview' ? 'Tip: Share a live site link for buyer approval' : 'Warning: Ensure the link is shared with the buyer.'}
              </p>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', padding: '1rem', marginTop: '1rem', fontSize: '1.1rem' }}
            disabled={isUploading || !externalLink}
          >
            {isUploading ? <><Loader size={20} className="spin" /> Submitting...</> : (mode === 'preview' ? 'Share Preview Link' : 'Confirm & Deliver')}
          </button>
        </form>
      </div>
    </div>
  );
}
