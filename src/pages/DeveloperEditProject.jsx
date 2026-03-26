import React, { useState, useEffect, useRef } from 'react';
import { Upload, X, Search, Loader, CheckCircle, ArrowLeft, Save } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { ref, get, update } from 'firebase/database';
import { uploadImage } from '../cloudinaryConfig';
import { getCurrencySymbol } from '../utils/currencyUtils';

const ALL_LANGUAGES = [
  "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Ruby", "PHP", "Swift", 
  "Kotlin", "Go", "Rust", "Dart", "HTML", "CSS", "SQL", "MongoDB", "React", "Angular", 
  "Vue", "Node.js", "Express", "Django", "Flask", "Spring Boot", "Flutter", "React Native"
];

export default function DeveloperEditProject() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({ title: '', price: '', category: 'Mobile Application', description: '', liveLink: '' });
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [langSearch, setLangSearch] = useState('');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const currencySymbol = getCurrencySymbol();

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const snapshot = await get(ref(db, `projects/${id}`));
        if (snapshot.exists()) {
          const data = snapshot.val();
          if (data.authorId !== user.uid) { alert("Unauthorized."); navigate('/dev/dashboard'); return; }
          setFormData({ title: data.title, price: data.price, category: data.category || 'Website', description: data.description, liveLink: data.liveLink || '' });
          setSelectedLanguages(data.languages || []);
          setThumbnailPreview(data.image || null);
        } else { navigate('/dev/dashboard'); }
      } catch (error) { console.error(error); } finally { setIsFetching(false); }
    };
    if (user && id) fetchProject();
  }, [id, user, navigate]);

  const filteredLanguages = ALL_LANGUAGES.filter(l => l.toLowerCase().includes(langSearch.toLowerCase()) && !selectedLanguages.includes(l));

  const toggleLanguage = (lang) => { setSelectedLanguages([...selectedLanguages, lang]); setLangSearch(''); };
  const removeLanguage = (lang) => { setSelectedLanguages(selectedLanguages.filter(l => l !== lang)); };

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setThumbnailPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.price || !formData.description || !formData.liveLink || (!thumbnailFile && !thumbnailPreview) || selectedLanguages.length === 0) {
      alert('Please fill in all mandatory fields.'); return;
    }
    setIsUploading(true);
    try {
      let imageUrl = thumbnailPreview;
      if (thumbnailFile) imageUrl = await uploadImage(thumbnailFile);

      await update(ref(db, `projects/${id}`), {
        title: formData.title,
        price: Number(formData.price),
        category: formData.category,
        description: formData.description,
        liveLink: formData.liveLink || '',
        image: imageUrl,
        languages: selectedLanguages,
        updatedAt: new Date().toISOString()
      });

      setUpdateSuccess(true);
      setTimeout(() => navigate('/dev/dashboard'), 2000);
    } catch (error) { alert('Update failed.'); } finally { setIsUploading(false); }
  };

  if (isFetching) return <div style={{ textAlign: 'center', padding: '10rem' }}><Loader size={48} className="spin" /></div>;
  if (updateSuccess) return <div className="animate-fade-in" style={{ maxWidth: '500px', margin: '4rem auto', textAlign: 'center' }}><div className="card" style={{ padding: '3rem' }}><CheckCircle size={64} color="var(--success)" style={{ margin: '0 auto 1.5rem' }} /><h2>Project Updated!</h2></div></div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '2rem auto' }}>
      <button className="btn-back" onClick={() => navigate(-1)}><ArrowLeft size={18} /> Back</button>
      <h1 style={{ marginBottom: '2rem' }}>Update Project Details</h1>

      <form onSubmit={handleSubmit} className="card" style={{ padding: '2.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <label className="form-label">Cover Image *</label>
          <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleThumbnailChange} />
          <div style={{ border: '2px dashed var(--border-color)', borderRadius: '12px', padding: thumbnailPreview ? '0' : '4rem', textAlign: 'center', cursor: 'pointer', overflow: 'hidden' }} onClick={() => fileInputRef.current?.click()}>
            <img src={thumbnailPreview} alt="Preview" style={{ width: '100%', height: '300px', objectFit: 'cover' }} />
          </div>
        </div>

        <div className="form-row cols-1-5" style={{ display: 'grid', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div className="form-group"><label className="form-label">Title *</label><input type="text" className="form-input" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} /></div>
          <div className="form-group">
            <label className="form-label">Base Price ({currencySymbol}) *</label>
            <div style={{ position: 'relative' }}>
               <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 'bold', color: 'var(--text-muted)' }}>{currencySymbol}</span>
               <input type="number" className="form-input" style={{ paddingLeft: '2.5rem' }} required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="form-row cols-2" style={{ display: 'grid', gap: '1.5rem', marginBottom: '1.5rem' }}>
           <div className="form-group"><label className="form-label">Category *</label><select className="form-input" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}><option>Mobile Application</option><option>Website</option><option>Desktop Application</option><option>Frontend Only</option><option>Fullstack</option></select></div>
           <div className="form-group"><label className="form-label">Live Preview URL *</label><input type="url" className="form-input" required value={formData.liveLink} onChange={e => setFormData({...formData, liveLink: e.target.value})} /></div>
        </div>

        <div className="form-group"><label className="form-label">Description *</label><textarea className="form-input" rows="6" required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea></div>

        <div className="form-group" style={{ position: 'relative' }}>
          <label className="form-label">Technologies *</label>
          <div className="form-input" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', minHeight: '50px', alignItems: 'center' }} onClick={() => setIsLangDropdownOpen(true)}>
             {selectedLanguages.map(l => <span key={l} style={{ background: 'var(--primary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>{l}<X size={14} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); removeLanguage(l); }} /></span>)}
             <input type="text" className="invisible-input" value={langSearch} onChange={e => { setLangSearch(e.target.value); setIsLangDropdownOpen(true); }} />
          </div>
          {isLangDropdownOpen && (
            <div className="card" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, maxHeight: '250px', overflowY: 'auto', padding: '0.5rem' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
                  <strong style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>UPDATE TECHNOLOGIES</strong>
                  <X size={16} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setIsLangDropdownOpen(false)} />
               </div>
               {filteredLanguages.length === 0 ? (
                 <p style={{ padding: '0.8rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>No matching technologies found.</p>
               ) : (
                 filteredLanguages.map(l => <div key={l} style={{ padding: '0.8rem', cursor: 'pointer', borderRadius: '6px' }} onClick={() => toggleLanguage(l)} onMouseEnter={e=>e.target.style.background='var(--bg-hover)'} onMouseLeave={e=>e.target.style.background='transparent'}>{l}</div>)
               )}
            </div>
          )}
        </div>

        <button type="submit" className="btn-primary" style={{ width: '100%', padding: '1.2rem', marginTop: '1.5rem' }} disabled={isUploading}>{isUploading ? <Loader className="spin" /> : <><Save size={18} /> Sync Changes</>}</button>
      </form>
    </div>
  );
}
