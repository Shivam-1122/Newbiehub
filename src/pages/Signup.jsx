import React, { useState } from 'react';
import { auth, db } from '../firebase';

import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { UserPlus, Loader, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Signup() {
  const [formData, setFormData] = useState({
    role: 'buyer',
    fullName: '',
    email: '',
    dob: '',
    gender: 'male',
    password: '',
    agreed: false
  });
  
  const [showTermsModal, setShowTermsModal] = useState(false);
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const validate = () => {
    let newErrors = {};
    
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = 'Invalid email address.';
    }

    if (formData.dob) {
      const birthDate = new Date(formData.dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 16) {
        newErrors.dob = 'You must be at least 16 years old to sign up.';
      }
    } else {
      newErrors.dob = 'Date of Birth is required.';
    }

    if (!formData.fullName) newErrors.fullName = 'Full Name is required.';
    if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters.';
    if (!formData.agreed) newErrors.agreed = 'You must agree to the Terms & Conditions.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const firebaseUser = userCredential.user;

      await sendEmailVerification(firebaseUser);

      const userData = {
        fullName: formData.fullName,
        email: formData.email,
        role: formData.role,
        dob: formData.dob,
        gender: formData.gender,
        agreedToTerms: true,
        termsAgreedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      // Only add developer-specific fields for developer accounts
      if (formData.role === 'developer') {
        userData.kycStatus = 'pending';
        userData.pendingEarnings = 0;
        userData.walletBalance = 0;
      }

      await set(ref(db, `users/${firebaseUser.uid}`), userData);

      setSignupSuccess(true);
    } catch (err) {
      const errorMap = {
        'auth/email-already-in-use': 'An account with this email already exists.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/weak-password': 'Password is too weak. Use at least 6 characters.'
      };
      setErrors({ form: errorMap[err.code] || 'Signup failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: null });
    }
  };

  if (signupSuccess) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '500px', margin: '4rem auto' }}>
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <CheckCircle size={64} color="var(--success)" style={{ margin: '0 auto', marginBottom: '1.5rem' }} />
          <h2 style={{ marginBottom: '1rem', color: 'var(--success)' }}>Account Created!</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '1.1rem' }}>
            We've sent a verification email to <strong style={{ color: 'var(--text-main)' }}>{formData.email}</strong>
          </p>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            Please click the link in the email to verify your account, then you can log in.
          </p>
          <Link to="/login" className="btn-primary" style={{ padding: '0.8rem 2rem', display: 'inline-block' }}>
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <div className="card" style={{ padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <UserPlus size={48} color="var(--primary)" style={{ margin: '0 auto', marginBottom: '1rem' }} />
          <h2>Join NewbieHub</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Start your journey with us.</p>
        </div>

        {errors.form && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', 
            padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem', 
            border: '1px solid var(--danger)', fontSize: '0.9rem' 
          }}>
            {errors.form}
          </div>
        )}

        <form onSubmit={handleSignup}>
          <div className="form-group" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', border: `2px solid ${formData.role === 'buyer' ? 'var(--primary)' : 'var(--border-color)'}`, borderRadius: 'var(--border-radius)', cursor: 'pointer' }}>
              <input type="radio" name="role" value="buyer" checked={formData.role === 'buyer'} onChange={handleChange} style={{ display: 'none' }} />
              <strong>I am a Buyer</strong>
            </label>
            <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', border: `2px solid ${formData.role === 'developer' ? 'var(--primary)' : 'var(--border-color)'}`, borderRadius: 'var(--border-radius)', cursor: 'pointer' }}>
              <input type="radio" name="role" value="developer" checked={formData.role === 'developer'} onChange={handleChange} style={{ display: 'none' }} />
              <strong>I am a Developer</strong>
            </label>
          </div>

          <div className="form-row cols-2" style={{ display: 'grid', gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input type="text" name="fullName" className="form-input" value={formData.fullName} onChange={handleChange} disabled={isLoading} />
              {errors.fullName && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.fullName}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" name="email" className="form-input" value={formData.email} onChange={handleChange} disabled={isLoading} />
              {errors.email && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.email}</span>}
            </div>
          </div>

          <div className="form-row cols-2" style={{ display: 'grid', gap: '1.5rem' }}>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input type="date" name="dob" className="form-input" value={formData.dob} onChange={handleChange} disabled={isLoading} />
              {errors.dob && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.dob}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Gender</label>
              <select name="gender" className="form-input" value={formData.gender} onChange={handleChange} disabled={isLoading}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" name="password" className="form-input" value={formData.password} onChange={handleChange} disabled={isLoading} />
            {errors.password && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.password}</span>}
          </div>

          <div className="form-group" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.8rem', cursor: 'pointer', padding: '0.8rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px' }}>
              <input 
                type="checkbox" 
                name="agreed" 
                checked={formData.agreed} 
                onChange={(e) => setFormData({...formData, agreed: e.target.checked})} 
                style={{ marginTop: '0.2rem', transform: 'scale(1.2)' }} 
                disabled={isLoading} 
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                I agree to the <button type="button" onClick={() => setShowTermsModal(true)} style={{ color: 'var(--primary)', border: 'none', background: 'transparent', padding: 0, fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}>Terms & Conditions</button> and understand that any fraudulent activity, sharing fake links, or cheating will result in <strong>immediate legal action</strong> and a permanent ban.
              </span>
            </label>
            {errors.agreed && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.4rem' }}>{errors.agreed}</p>}
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', padding: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            disabled={isLoading}
          >
            {isLoading ? <><Loader size={18} className="spin" /> Creating Account...</> : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Sign In</Link>
        </p>
      </div>

      {showTermsModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2.5rem', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
              Legal Agreement
            </h2>
            <div style={{ lineHeight: '1.6', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              <p style={{ marginBottom: '1rem' }}>By joining NewbieHub, you explicitly agree to the following rules:</p>
              <ul style={{ paddingLeft: '1.2rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', listStyleType: 'disc' }}>
                <li><strong>No Fake Links:</strong> Only upload actual working source code.</li>
                <li><strong>No Payment Bypassing:</strong> All transactions must happen on-platform.</li>
                <li><strong>No Work Scams:</strong> Fair delivery for fair payment.</li>
                <li><strong>Full Transparency:</strong> All transactions are conducted in Indian Rupees (₹).</li>
              </ul>
            </div>
            <button className="btn-primary" style={{ width: '100%', marginTop: '2rem' }} onClick={() => setShowTermsModal(false)}>Agree & Proceed</button>
          </div>
        </div>
      )}
    </div>
  );
}
