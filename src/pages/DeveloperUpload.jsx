import React, { useState, useRef } from 'react';
import { Upload, X, Search, Loader, CheckCircle, ArrowLeft, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { ref, push, set } from 'firebase/database';
import { uploadImage } from '../cloudinaryConfig';
import { getCurrencySymbol } from '../utils/currencyUtils';

const ALL_LANGUAGES = [
  "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Ruby", "PHP", "Swift", 
  "Kotlin", "Go", "Rust", "Dart", "HTML", "CSS", "SQL", "MongoDB", "React", "Angular", 
  "Vue", "Node.js", "Express", "Django", "Flask", "Spring Boot", "Flutter", "React Native"
];

export default function DeveloperUpload() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({ 
    title: '', 
    price: '', 
    category: 'Mobile Application', 
    description: '', 
    liveLink: '',
    downloadURL: '',
    deliveryMethod: 'google_drive' 
  });
  
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [langSearch, setLangSearch] = useState('');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const currencySymbol = getCurrencySymbol();

  const filteredLanguages = ALL_LANGUAGES.filter(l => l.toLowerCase().includes(langSearch.toLowerCase()) && !selectedLanguages.includes(l));

  const toggleLanguage = (lang) => {
    setSelectedLanguages([...selectedLanguages, lang]);
    setLangSearch('');
  };

  const removeLanguage = (lang) => {
    setSelectedLanguages(selectedLanguages.filter(l => l !== lang));
  };

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
    if (!formData.downloadURL) { alert("Please provide the project delivery link."); return; }
    
    const url = formData.downloadURL.toLowerCase();
    if (formData.deliveryMethod === 'google_drive' && !url.includes('drive.google.com') && !url.includes('docs.google.com')) {
      alert("Invalid Google Drive Link."); return;
    }
    if (formData.deliveryMethod === 'github' && !url.includes('github.com')) {
      alert("Invalid GitHub repository link."); return;
    }

    if (!formData.title || !formData.price || !formData.description || !formData.liveLink || !thumbnailFile || selectedLanguages.length === 0) {
      alert('Please fill in all mandatory fields.'); return;
    }

    setIsUploading(true);
    try {
      let imageUrl = '';
      if (thumbnailFile) imageUrl = await uploadImage(thumbnailFile);

      const projectsRef = ref(db, 'projects');
      const newProjectRef = push(projectsRef);
      
      await set(newProjectRef, {
        title: formData.title,
        price: Number(formData.price),
        currencyCode: 'INR',
        currencySymbol: currencySymbol,
        category: formData.category,
        description: formData.description,
        liveLink: formData.liveLink || '',
        downloadURL: formData.downloadURL,
        deliveryMethod: formData.deliveryMethod,
        image: imageUrl,
        languages: selectedLanguages,
        authorId: user.uid,
        authorName: user.fullName || user.email.split('@')[0],
        authorEmail: user.email,
        createdAt: new Date().toISOString()
      });

      setUploadSuccess(true);
      setTimeout(() => navigate('/dev/dashboard'), 2000);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to publish project.');
    } finally { setIsUploading(false); }
  };

  if (uploadSuccess) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: '500px', margin: '4rem auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: '3rem' }}>
          <CheckCircle size={64} color="var(--success)" style={{ margin: '0 auto', marginBottom: '1.5rem' }} />
          <h2 style={{ color: 'var(--success)', marginBottom: '1rem' }}>Project Published!</h2>
          <p style={{ color: 'var(--text-muted)' }}>Redirecting to your portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '2rem auto' }}>
      <h1 style={{ marginBottom: '2rem' }}>Publish Your Masterpiece</h1>

      <form onSubmit={handleSubmit} className="card" style={{ padding: '2.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <label className="form-label">Project Cover Image (Thumbnail) *</label>
          <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleThumbnailChange} />
          <div style={{ border: '2px dashed var(--border-color)', borderRadius: '12px', padding: thumbnailPreview ? '0' : '4rem', textAlign: 'center', cursor: 'pointer', overflow: 'hidden' }} onClick={() => fileInputRef.current?.click()}>
            {thumbnailPreview ? <img src={thumbnailPreview} alt="Preview" style={{ width: '100%', height: '300px', objectFit: 'cover' }} /> : <><Upload size={40} style={{ margin: '0 auto 1rem', color: 'var(--text-muted)' }} /><span style={{ color: 'var(--text-muted)' }}>Recommend high-res 1200x600 image</span></>}
          </div>
        </div>

        <div className="form-row cols-1-5" style={{ display: 'grid', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">Project Title *</label>
            <input type="text" className="form-input" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">Base Price ({currencySymbol}) *</label>
            <div style={{ position: 'relative' }}>
               <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 'bold', color: 'var(--text-muted)' }}>{currencySymbol}</span>
               <input type="number" className="form-input" style={{ paddingLeft: '2.5rem' }} required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="form-row cols-2" style={{ display: 'grid', gap: '1.5rem', marginBottom: '1.5rem' }}>
           <div className="form-group">
              <label className="form-label">Category *</label>
              <select className="form-input" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                <option>Mobile Application</option>
                <option>Website</option>
                <option>Desktop Application</option>
                <option>Frontend Only</option>
                <option>Fullstack</option>
              </select>
           </div>
           <div className="form-group">
              <label className="form-label">Live Preview (Demo URL) *</label>
              <input type="url" className="form-input" placeholder="https://..." required value={formData.liveLink} onChange={e => setFormData({...formData, liveLink: e.target.value})} />
              <div style={{ marginTop: '0.6rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.4rem' }}><Info size={14} /> Link to a hosted demo on Vercel/Netlify.</div>
           </div>
        </div>

        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
           <label className="form-label">Source Code Delivery Method *</label>
           <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <button type="button" onClick={() => setFormData({...formData, deliveryMethod: 'google_drive'})} className={formData.deliveryMethod === 'google_drive' ? 'btn-primary' : 'btn-outline'} style={{ flex: 1 }}>Google Drive (.ZIP)</button>
              <button type="button" onClick={() => setFormData({...formData, deliveryMethod: 'github'})} className={formData.deliveryMethod === 'github' ? 'btn-primary' : 'btn-outline'} style={{ flex: 1 }}>GitHub Repository</button>
           </div>
           <input type="url" className="form-input" placeholder={formData.deliveryMethod === 'google_drive' ? "Paste Folder/ZIP URL... (set to 'Anyone with link')" : "Paste Repository URL..."} required value={formData.downloadURL} onChange={e => setFormData({...formData, downloadURL: e.target.value})} />
        </div>

        <div className="form-group">
          <label className="form-label">Description & Business Logic *</label>
          <textarea className="form-input" rows="6" placeholder="Explain what makes this project premium..." required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
        </div>

        <div className="form-group" style={{ position: 'relative' }}>
          <label className="form-label">Tech Stack (Languages) *</label>
          <div className="form-input" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', minHeight: '50px', alignItems: 'center' }} onClick={() => setIsLangDropdownOpen(true)}>
             {selectedLanguages.map(l => (
               <span key={l} style={{ background: 'var(--primary)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>{l}<X size={14} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); removeLanguage(l); }} /></span>
             ))}
             <input type="text" className="invisible-input" placeholder={selectedLanguages.length === 0 ? "e.g. React, Node.js" : ""} value={langSearch} onChange={e => { setLangSearch(e.target.value); setIsLangDropdownOpen(true); }} />
          </div>
          {isLangDropdownOpen && (
            <div className="card" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, maxHeight: '250px', overflowY: 'auto', padding: '0.5rem' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
                  <strong style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>SELECT TECHNOLOGIES</strong>
                  <X size={16} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => setIsLangDropdownOpen(false)} />
               </div>
               {filteredLanguages.length === 0 ? (
                 <p style={{ padding: '0.8rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>No matching languages found.</p>
               ) : (
                 filteredLanguages.map(l => <div key={l} style={{ padding: '0.8rem', cursor: 'pointer', borderRadius: '6px' }} onClick={() => toggleLanguage(l)} onMouseEnter={e=>e.target.style.background='var(--bg-hover)'} onMouseLeave={e=>e.target.style.background='transparent'}>{l}</div>)
               )}
            </div>
          )}
        </div>

        <button type="submit" className="btn-primary" style={{ width: '100%', padding: '1.2rem', marginTop: '1.5rem', fontSize: '1.1rem' }} disabled={isUploading}>
          {isUploading ? <><Loader className="spin" size={20} /> Publishing...</> : 'Launch Project Marketplace Listing'}
        </button>
      </form>
    </div>
  );
}
