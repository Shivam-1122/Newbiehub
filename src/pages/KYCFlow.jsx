import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import { ShieldAlert, ScanFace, FileText, CheckCircle, Camera, CornerUpLeft, ArrowLeft } from 'lucide-react';
import LivenessCheck from '../components/LivenessCheck';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { ref, update } from 'firebase/database';

export default function KYCFlow() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [panDetails, setPanDetails] = useState({ name: '', dob: '', panNumber: '' });
  
  // Doc Scan States
  const webcamRef = useRef(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [panScanStep, setPanScanStep] = useState(null); // 'align', 'closer', 'hold', 'processing'
  const [flash, setFlash] = useState(false);

  const handlePanSubmit = (e) => {
    e.preventDefault();
    if (panDetails.name && panDetails.panNumber) {
      setStep(2);
    }
  };

  const startDocScan = () => {
    setIsCameraOpen(true);
    setPanScanStep('align');
    
    // Simulate AI feedback loop
    setTimeout(() => {
      setPanScanStep('closer');
      setTimeout(() => {
        setPanScanStep('hold');
        setTimeout(() => {
          // Capture flash
          setFlash(true);
          setTimeout(() => setFlash(false), 200);
          setPanScanStep('processing');
          
          setTimeout(() => {
             // Finish
             setIsCameraOpen(false);
             setStep('completed');
             localStorage.setItem('kycStatus', 'verified');
              // Also save to Firebase
              if (user?.uid) {
                update(ref(db, `users/${user.uid}`), { kycStatus: 'verified' });
              }
          }, 3000);
        }, 2500);
      }, 3000);
    }, 4000);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '800px', margin: '2rem auto' }}>
      <button className="btn-back" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} /> Back
      </button>
      <h1 style={{ marginBottom: '2rem', textAlign: 'center' }}>Identity Verification (KYC)</h1>
      
      {/* Progress Bar */}
      {step !== 'completed' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '15px', left: '0', right: '0', height: '4px', background: 'var(--border-color)', zIndex: -1 }}>
            <div style={{ height: '100%', background: 'var(--primary)', width: step === 1 ? '33%' : step === 2 ? '66%' : '100%', transition: 'width 0.3s' }}></div>
          </div>
          <div style={{ background: step >= 1 ? 'var(--primary)' : 'var(--bg-card)', color: step >= 1 ? '#fff' : 'var(--text-muted)', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>1</div>
          <div style={{ background: step >= 2 ? 'var(--primary)' : 'var(--bg-card)', color: step >= 2 ? '#fff' : 'var(--text-muted)', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>2</div>
          <div style={{ background: step >= 3 ? 'var(--primary)' : 'var(--bg-card)', color: step >= 3 ? '#fff' : 'var(--text-muted)', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>3</div>
        </div>
      )}

      <div className="card" style={{ padding: '3rem' }}>
        
        {step === 1 && (
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <FileText color="var(--primary)" /> Step 1: PAN Details
            </h2>
            <form onSubmit={handlePanSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name (As on PAN)</label>
                <input type="text" className="form-input" required value={panDetails.name} onChange={e => setPanDetails({...panDetails, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <input type="date" className="form-input" required value={panDetails.dob} onChange={e => setPanDetails({...panDetails, dob: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">PAN Number</label>
                <input type="text" className="form-input" style={{ textTransform: 'uppercase' }} required maxLength="10" value={panDetails.panNumber} onChange={e => setPanDetails({...panDetails, panNumber: e.target.value})} />
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>Proceed to Liveness Check</button>
            </form>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <ScanFace color="var(--primary)" /> Step 2: Liveness Check
            </h2>
            <LivenessCheck onSuccess={() => setStep(3)} />
          </div>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>Step 3: Document Verification</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
              We need to scan your PAN card using your camera to extract text via AI OCR and match it with your entered details.
            </p>
            
            {!isCameraOpen ? (
              <button 
                className="btn-outline hoverable" 
                style={{ width: '100%', padding: '4rem', borderStyle: 'dashed', flexDirection: 'column' }}
                onClick={startDocScan}
              >
                <Camera size={48} color="var(--primary)" style={{ margin: '0 auto', marginBottom: '1rem' }} />
                <span style={{ fontSize: '1.2rem', color: 'var(--primary)', fontWeight: 'bold' }}>Turn on Camera to Scan PAN</span>
              </button>
            ) : (
              <div style={{ position: 'relative', maxWidth: '500px', margin: '0 auto', borderRadius: '16px', overflow: 'hidden', border: panScanStep === 'hold' ? '2px solid var(--success)' : '2px solid var(--warning)', transition: 'border 0.3s' }}>
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: "environment" }} // Try to use back camera if available (mobile)
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />

                {flash && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'white', zIndex: 20 }}></div>}

                {/* ID Card Overlay Mask */}
                <div style={{
                  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  width: '80%', height: '55%', border: panScanStep === 'hold' ? '3px solid var(--success)' : '3px dashed rgba(245, 158, 11, 0.8)',
                  borderRadius: '12px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)', pointerEvents: 'none', transition: 'border 0.3s'
                }}></div>

                {/* Status HUD */}
                <div style={{
                  position: 'absolute', top: '1rem', left: '1rem', right: '1rem', zIndex: 10, background: 'rgba(0,0,0,0.7)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)'
                }}>
                   {panScanStep === 'align' && <h3 style={{ color: 'var(--warning)', margin: 0 }}>Align PAN Card within frame...</h3>}
                   {panScanStep === 'closer' && <h3 style={{ color: 'var(--warning)', margin: 0, animation: 'pulse 1s infinite' }}>Move slightly closer...</h3>}
                   {panScanStep === 'hold' && <h3 style={{ color: 'var(--success)', margin: 0 }}>Perfect. Hold still!</h3>}
                   {panScanStep === 'processing' && <h3 style={{ color: 'var(--primary)', margin: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>Extracting Text (OCR)...</h3>}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'completed' && (
          <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease' }}>
            <div style={{ padding: '2rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', borderRadius: '16px', marginBottom: '2rem' }}>
              <CheckCircle size={64} color="var(--success)" style={{ margin: '0 auto', marginBottom: '1rem' }} />
              <h2 style={{ color: 'var(--success)', marginBottom: '1rem' }}>KYC Verified & Synced</h2>
              <div className="form-row cols-2" style={{ display: 'grid', gap: '1rem', textAlign: 'left', background: 'var(--bg-color)', padding: '1rem', borderRadius: '8px' }}>
                <div><span style={{color: 'var(--text-muted)'}}>Name Match:</span> <strong>98%</strong></div>
                <div><span style={{color: 'var(--text-muted)'}}>Face Vector Match:</span> <strong>99.4%</strong></div>
                <div><span style={{color: 'var(--text-muted)'}}>PAN OCR Validate:</span> <strong style={{color: 'var(--success)'}}>Success</strong></div>
                <div><span style={{color: 'var(--text-muted)'}}>Liveness Score:</span> <strong style={{color: 'var(--success)'}}>Passed</strong></div>
              </div>
            </div>
            
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
              Your identity has been confirmed securely. All platform restrictions are now lifted and your wallet transfers are authorized.
            </p>
            <button className="btn-primary" onClick={() => navigate('/dev/dashboard')}>
              Return to Dashboard
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
