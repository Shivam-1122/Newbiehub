import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Hash, Shield, CheckCircle, AlertCircle, Calendar, ArrowLeft, Edit2, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { ref, update } from 'firebase/database';

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: user?.fullName || '',
    dob: user?.dob || '',
    gender: user?.gender || ''
  });
  const [isSaving, setIsSaving] = useState(false);

  if (!user) return null;

  const kycStatus = user.kycStatus || 'pending';

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await update(ref(db, `users/${user.uid}`), {
        fullName: editForm.fullName,
        dob: editForm.dob,
        gender: editForm.gender
      });
      // Updating context is handled by the onValue listener in AuthContext
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '2rem auto' }}>
      <button className="btn-back" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} /> Back
      </button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>My Profile</h1>
        {!isEditing ? (
          <button className="btn-outline" onClick={() => setIsEditing(true)}>
            <Edit2 size={16} /> Edit Profile
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
              <Save size={16} /> {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button className="btn-outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
              <X size={16} /> Cancel
            </button>
          </div>
        )}
      </div>
      
      <div className="card" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '2rem' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <User size={40} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '0.2rem' }}>{user.fullName || user.email.split('@')[0]}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <p style={{ color: 'var(--text-muted)', textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Shield size={16} color="var(--primary)" /> {user.role} Account
              </p>
              
              {user.role === 'developer' && (
                <span style={{ 
                  padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', 
                  background: kycStatus === 'verified' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                  color: kycStatus === 'verified' ? 'var(--success)' : 'var(--warning)',
                  display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontWeight: 'bold'
                }}>
                  {kycStatus === 'verified' ? <CheckCircle size={14} /> : <AlertCircle size={14} />} 
                  KYC {kycStatus === 'verified' ? 'Verified' : 'Pending'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          <div>
             <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>User ID</label>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', background: 'var(--bg-hover)', borderRadius: '8px' }}>
                <Hash size={18} color="var(--primary)" />
                <strong style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>{user.uid}</strong>
             </div>
          </div>
          <div>
             <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Full Name</label>
             {isEditing ? (
               <input type="text" className="form-input" value={editForm.fullName} onChange={e => setEditForm({...editForm, fullName: e.target.value})} />
             ) : (
               <div style={{ padding: '1rem', background: 'var(--bg-hover)', borderRadius: '8px', fontWeight: 'bold' }}>
                 {user.fullName || 'Not specified'}
               </div>
             )}
          </div>
          <div>
             <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Email Address</label>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', background: 'var(--bg-hover)', borderRadius: '8px' }}>
                <Mail size={18} color="var(--success)" />
                <strong>{user.email}</strong>
             </div>
          </div>
          <div>
             <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Date of Birth</label>
             {isEditing ? (
               <input type="date" className="form-input" value={editForm.dob} onChange={e => setEditForm({...editForm, dob: e.target.value})} />
             ) : (
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', background: 'var(--bg-hover)', borderRadius: '8px' }}>
                  <Calendar size={18} color="var(--warning)" />
                  <strong>{user.dob ? new Date(user.dob).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Not specified'}</strong>
               </div>
             )}
          </div>
          <div>
             <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Gender</label>
             {isEditing ? (
               <select className="form-input" value={editForm.gender} onChange={e => setEditForm({...editForm, gender: e.target.value})}>
                 <option value="male">Male</option>
                 <option value="female">Female</option>
                 <option value="other">Other</option>
                 <option value="prefer_not_to_say">Prefer not to say</option>
               </select>
             ) : (
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', background: 'var(--bg-hover)', borderRadius: '8px' }}>
                  <strong style={{ textTransform: 'capitalize' }}>{user.gender === 'prefer_not_to_say' ? 'Prefer not to say' : (user.gender || 'Not specified')}</strong>
               </div>
             )}
          </div>
        </div>

        {user.emailVerified && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.9rem' }}>
            <CheckCircle size={16} /> Email verified
          </div>
        )}
      </div>
    </div>
  );
}
