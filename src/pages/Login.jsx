import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { ShieldCheck, Loader } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function Login() {
  const location = useLocation();
  const isSuspendedQuery = new URLSearchParams(location.search).get('suspended') === 'true';
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      const uid = firebaseUser.uid;
      
      // Step 1: Check suspension status FIRST
      const userRef = ref(db, `users/${uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        if (userData.isSuspended) {
          await auth.signOut(); // Sign out the user immediately
          setError("Your account has been suspended by an administrator. Please contact support@newbiehub.com if you believe this is an error.");
          setIsLoading(false);
          return;
        }
      }

      // Step 2: Check email verification
      if (!firebaseUser.emailVerified) {
        setError('Please verify your email before logging in. Check your inbox for the verification link.');
        setIsLoading(false);
        return;
      }

      // Step 3: Log in if all checks pass
      if (snapshot.exists()) {
        const profileData = snapshot.val();
        login({
          uid: uid,
          email: firebaseUser.email,
          emailVerified: firebaseUser.emailVerified,
          ...profileData
        });
      } else {
        login({
          uid: uid,
          email: firebaseUser.email,
          emailVerified: firebaseUser.emailVerified,
          role: 'buyer'
        });
      }
      navigate('/', { replace: true });
    } catch (err) {
      const errorMap = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/user-disabled': 'This account has been disabled.'
      };
      setError(errorMap[err.code] || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first to reset your password.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Verification email sent! Check your inbox to reset your password.");
    } catch (err) {
      console.error(err);
      setError("Failed to send reset email. Verify your email address.");
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '400px', margin: '4rem auto' }}>
      <div className="card" style={{ padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <ShieldCheck size={48} color="var(--primary)" style={{ margin: '0 auto', marginBottom: '1rem' }} />
          <h2>Welcome Back</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Login to your NewbieHub account</p>
        </div>

        {isSuspendedQuery && !error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', 
            padding: '1.2rem', borderRadius: '12px', marginBottom: '1.5rem', 
            border: '2px solid var(--danger)', textAlign: 'center',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
          }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Account Suspended</h3>
            <p style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
              Your account has been suspended for violating platform policies. 
              Please contact <strong>support@newbiehub.com</strong> to appeal this decision.
            </p>
          </div>
        )}

        {error && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', 
            padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem', 
            border: '1px solid var(--danger)', fontSize: '0.9rem' 
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              className="form-input" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
              <button 
                type="button" 
                onClick={handleForgotPassword}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', padding: 0 }}
              >
                Forgot Password?
              </button>
            </div>
            <input 
              type="password" 
              className="form-input" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>
          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%', marginTop: '1rem', padding: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            disabled={isLoading}
          >
            {isLoading ? <><Loader size={18} className="spin" /> Signing In...</> : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Don't have an account? <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
