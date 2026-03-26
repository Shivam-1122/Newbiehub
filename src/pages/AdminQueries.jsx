import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle, Clock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { ref, onValue, update } from 'firebase/database';
import { sendNotification } from '../utils/notificationUtils';

export default function AdminQueries() {
  const navigate = useNavigate();
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const queriesRef = ref(db, 'queries');
    const unsubscribe = onValue(queriesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const queriesList = Object.entries(data)
          .map(([id, q]) => ({ id, ...q }))
          .sort((a, b) => b.timestamp - a.timestamp);
        setQueries(queriesList);
      } else {
        setQueries([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleMarkResolved = async (query) => {
    try {
      await update(ref(db, `queries/${query.id}`), { status: 'resolved' });
      if (query.userId && query.userId !== 'guest') {
        sendNotification(query.userId, {
          title: 'Support Query Resolved',
          message: 'Your query has been marked as resolved. Please check your email for any detailed response.',
          type: 'system'
        });
      }
    } catch (error) {
      console.error('Error updating query:', error);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '2rem auto' }}>
      <button className="btn-back" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} /> Back
      </button>
      <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
        <Mail size={32} color="var(--primary)" /> User Queries
      </h1>

      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading queries...</p>
      ) : queries.length === 0 ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No support queries found.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {queries.map((q) => (
            <div key={q.id} className="card" style={{ padding: '1.5rem', borderLeft: q.status === 'resolved' ? '4px solid var(--success)' : '4px solid var(--warning)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ marginBottom: '0.2rem' }}>{q.name}</h3>
                  <a href={`mailto:${q.email}`} style={{ color: 'var(--primary)', fontSize: '0.9rem' }}>{q.email}</a>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                     ID: {q.userId} | {new Date(q.timestamp).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                   <span style={{ 
                      fontSize: '0.8rem', padding: '0.3rem 0.8rem', borderRadius: '12px', fontWeight: 'bold',
                      background: q.status === 'resolved' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: q.status === 'resolved' ? 'var(--success)' : 'var(--warning)'
                    }}>
                      {q.status === 'resolved' ? 'Successful' : 'Pending Action'}
                    </span>
                    {q.status === 'pending' && (
                      <button className="btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }} onClick={() => handleMarkResolved(q)}>
                        <CheckCircle size={14} /> Mark Successful
                      </button>
                    )}
                </div>
              </div>
              <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
                {q.message}
              </div>
              <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <em>Tip: Click the email address to respond directly via your email client.</em>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
