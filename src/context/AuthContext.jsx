import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { ref, get, onValue } from 'firebase/database';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let unsubscribeDatabase = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Real-time listener for user profile (to catch suspension/role changes)
        const userRef = ref(db, `users/${firebaseUser.uid}`);
        
        unsubscribeDatabase = onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const profileData = snapshot.val();
            
            // Check for suspension
            if (profileData.isSuspended) {
              console.log("Account suspended. Logging out...");
              signOut(auth);
              setUser(null);
              navigate('/login?suspended=true');
              return;
            }

            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              emailVerified: firebaseUser.emailVerified,
              ...profileData
            });
          } else {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              emailVerified: firebaseUser.emailVerified,
              role: 'buyer'
            });
          }
          setLoading(false);
        }, (error) => {
          console.error("Database listener error:", error);
          setLoading(false);
        });
      } else {
        if (unsubscribeDatabase) unsubscribeDatabase();
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDatabase) unsubscribeDatabase();
    };
  }, [navigate]);

  const login = (userData) => {
    setUser(userData);
    if (userData.role === 'admin') navigate('/admin/dashboard');
    else if (userData.role === 'developer') navigate('/dev/dashboard');
    else navigate('/buyer/dashboard');
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', justifyContent: 'center', alignItems: 'center', 
        height: '100vh', background: 'var(--bg-main)', color: 'var(--primary)',
        fontSize: '1.2rem', gap: '1rem'
      }}>
        <div className="spinner" style={{
          width: '40px', height: '40px', border: '4px solid var(--border-color)',
          borderTop: '4px solid var(--primary)', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        Loading...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
