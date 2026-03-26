import React, { useState, useEffect } from 'react';
import { Search, Loader, ArrowLeft, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { useAuth } from '../context/AuthContext';
import { formatCurrency, getCurrencySymbol } from '../utils/currencyUtils';

const CATEGORIES = ["All", "Mobile Application", "Website", "Desktop Application", "Frontend Only", "Fullstack"];

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState({});

  useEffect(() => {
    const projectsRef = ref(db, 'projects');
    const reviewsRef = ref(db, 'reviews');

    onValue(projectsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const projectList = Object.entries(data).map(([id, val]) => ({
          id,
          ...val
        }));
        setProjects(projectList);
      } else {
        setProjects([]);
      }
      setLoading(false);
    });

    onValue(reviewsRef, (snapshot) => {
      if (snapshot.exists()) {
        setReviews(snapshot.val());
      }
    });
  }, []);

  // Filtering
  let filtered = projects.filter(p => {
    const searchTokens = searchTerm.toLowerCase().split(' ').filter(t => t.trim() !== '');
    const textTarget = ((p.title || '') + ' ' + (p.authorName || '')).toLowerCase();
    const matchesSearch = searchTokens.length === 0 || searchTokens.every(token => textTarget.includes(token));
    const matchesCategory = category === 'All' || p.category === category;
    return matchesSearch && matchesCategory;
  });

  // Sorting
  filtered.sort((a, b) => {
    if (sortBy === 'price-low') return (a.price || 0) - (b.price || 0);
    if (sortBy === 'price-high') return (b.price || 0) - (a.price || 0);
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ textAlign: 'center', marginBottom: '3rem', marginTop: '2rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
          Discover <span className="text-gradient">Premium Projects</span> by Fresh Talent
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
          Buy complete apps, request custom changes, and support upcoming developers in a secure environment.
        </p>
      </header>

      {/* Filters & Search */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flex: '1 1 300px', gap: '1rem', position: 'relative' }}>
           <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
           <input 
             type="text" 
             className="form-input" 
             style={{ paddingLeft: '3rem', width: '100%' }} 
             placeholder="Search projects or authors..." 
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
           />
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <select 
            className="form-input" 
            value={category} 
            onChange={e => setCategory(e.target.value)}
            style={{ minWidth: '200px' }}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          
          <select 
            className="form-input" 
            value={sortBy} 
            onChange={e => setSortBy(e.target.value)}
            style={{ minWidth: '150px' }}
          >
            <option value="newest">Newest First</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <Loader size={40} className="spin" style={{ margin: '0 auto', marginBottom: '1rem' }} />
          <p>Loading projects...</p>
        </div>
      )}

      {/* Grid */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
          {filtered.length > 0 ? filtered.map(p => (
            <Link to={`/project/${p.id}`} key={p.id} className="card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <img 
                src={p.image || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&h=400&fit=crop'} 
                alt={p.title} 
                style={{ width: '100%', height: '200px', objectFit: 'cover' }} 
              />
              <div style={{ padding: '1.5rem' }}>
                <span style={{ fontSize: '0.8rem', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '0.2rem 0.6rem', borderRadius: '12px', marginBottom: '0.5rem', display: 'inline-block' }}>{p.category}</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                  <h3 style={{ fontSize: '1.2rem', margin: 0 }}>{p.title}</h3>
                  <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>{getCurrencySymbol()}{p.price}</span>
                </div>
                
                {(() => {
                  const pReviews = Object.values(reviews).filter(r => r.projectId === p.id && (r.reviewType === 'project' || !r.reviewType));
                  const avg = pReviews.length > 0 ? pReviews.reduce((acc, r) => acc + r.rating, 0) / pReviews.length : 0;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.5rem', color: '#f59e0b', fontSize: '0.85rem' }}>
                      <Star size={14} fill={avg > 0 ? "#f59e0b" : "none"} color={avg > 0 ? "#f59e0b" : "var(--border-color)"} />
                      <strong style={{ opacity: avg > 0 ? 1 : 0.5 }}>{avg > 0 ? avg.toFixed(1) : 'No ratings'}</strong>
                      {avg > 0 && <span style={{ color: 'var(--text-muted)' }}>({pReviews.length})</span>}
                    </div>
                  );
                })()}

                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>By {p.authorName || 'Unknown'}</p>
              </div>
            </Link>
          )) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              <p>{projects.length === 0 ? 'No projects uploaded yet. Be the first to upload!' : 'No projects found matching your criteria.'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
