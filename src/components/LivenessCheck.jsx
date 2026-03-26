import React, { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, CheckCircle, Activity, Focus } from 'lucide-react';

const steps = [
  { id: 'straight', instruction: 'Look Straight', subtext: 'Matching face vectors...' },
  { id: 'left', instruction: 'Turn Head Left', subtext: 'Analyzing side profile...' },
  { id: 'right', instruction: 'Turn Head Right', subtext: 'Verifying liveness depth...' },
  { id: 'up', instruction: 'Look Up', subtext: 'Checking chin alignment...' },
  { id: 'down', instruction: 'Look Down', subtext: 'Finalizing 3D mesh map...' }
];

export default function LivenessCheck({ onSuccess }) {
  const webcamRef = useRef(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [countdown, setCountdown] = useState(4);
  const [flash, setFlash] = useState(false);
  const [capturedImages, setCapturedImages] = useState({});
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    let timer;
    if (currentStepIndex >= 0 && currentStepIndex < steps.length) {
      setIsTracking(true);
      if (countdown > 0) {
        timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      } else if (countdown === 0) {
        // Capture frame
        capture();
        setFlash(true);
        setIsTracking(false);
        setTimeout(() => setFlash(false), 200);

        // Move to next step or finish
        setTimeout(() => {
          if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(c => c + 1);
            setCountdown(4);
          } else {
            setCurrentStepIndex(steps.length); // Done
            setTimeout(onSuccess, 2000); // Trigger success callback after brief delay
          }
        }, 1200);
      }
    }
    return () => clearTimeout(timer);
  }, [currentStepIndex, countdown]);

  const startSequence = () => {
    setCurrentStepIndex(0);
    setCountdown(4);
  };

  const capture = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        const stepId = steps[currentStepIndex].id;
        setCapturedImages(prev => ({ ...prev, [stepId]: imageSrc }));
      }
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
      <style>
      {`
        @keyframes scanline {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes pulseBorder {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          70% { box-shadow: 0 0 0 15px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .ai-scanner {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 4px;
          background: rgba(16, 185, 129, 0.8);
          box-shadow: 0 0 10px rgba(16, 185, 129, 1), 0 0 20px rgba(16, 185, 129, 0.5);
          animation: scanline 2.5s infinite linear;
          z-index: 10;
        }
      `}
      </style>

      {currentStepIndex === -1 && (
        <div style={{ padding: '2rem' }}>
          <Activity size={48} color="var(--primary)" style={{ margin: '0 auto', marginBottom: '1rem' }} />
          <h3>AI Facial Recognition Engine Active</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', marginTop: '1rem' }}>
            Ensure your face is clearly visible. Remove hats, masks, or dark glasses. Our AI will guide you to map a 3D vector of your face.
          </p>
          <button className="btn-primary" onClick={startSequence} style={{ padding: '1rem 2rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto' }}>
            <Camera size={20} /> Initialize Camera
          </button>
        </div>
      )}

      {(currentStepIndex >= 0 && currentStepIndex < steps.length) && (
        <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', border: countdown > 0 ? '2px solid var(--primary)' : '2px solid var(--success)', transition: 'border 0.3s' }}>
          
          <div style={{ position: 'relative' }}>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: "user" }}
              style={{ width: '100%', height: 'auto', display: 'block', transform: 'scaleX(-1)' }} // mirror view
            />
            {/* Tech Overlay Borders */}
            <div style={{ position: 'absolute', top: '10%', left: '10%', width: '20px', height: '20px', borderTop: '4px solid var(--primary)', borderLeft: '4px solid var(--primary)' }}></div>
            <div style={{ position: 'absolute', top: '10%', right: '10%', width: '20px', height: '20px', borderTop: '4px solid var(--primary)', borderRight: '4px solid var(--primary)' }}></div>
            <div style={{ position: 'absolute', bottom: '10%', left: '10%', width: '20px', height: '20px', borderBottom: '4px solid var(--primary)', borderLeft: '4px solid var(--primary)' }}></div>
            <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '20px', height: '20px', borderBottom: '4px solid var(--primary)', borderRight: '4px solid var(--primary)' }}></div>
            
            {/* AI Scanning Line Animation */}
            {isTracking && <div className="ai-scanner"></div>}
          </div>

          {/* Flash Effect */}
          {flash && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'white', zIndex: 20 }}></div>}

          {/* HUD Overlay */}
          <div style={{
            position: 'absolute', top: '1rem', left: '1rem', zIndex: 10, background: 'rgba(0,0,0,0.6)', padding: '0.4rem 0.8rem', borderRadius: '4px', border: '1px solid var(--primary)', color: 'var(--primary)', fontFamily: 'monospace', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}>
            <Focus size={14} className={isTracking ? 'spin-slow' : ''} /> {isTracking ? 'TRACKING_FACE_DATA' : 'LOCKED'}
          </div>
          
          <div style={{
            position: 'absolute', top: '1rem', right: '1rem', zIndex: 10, background: 'rgba(0,0,0,0.6)', padding: '0.4rem 0.8rem', borderRadius: '4px', color: 'var(--success)', fontFamily: 'monospace', fontSize: '0.8rem'
          }}>
            Step {currentStepIndex + 1}/{steps.length}
          </div>

          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '65%', height: '70%', borderRadius: '50%', border: countdown > 0 ? '3px dashed rgba(59, 130, 246, 0.6)' : '3px solid var(--success)',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)', pointerEvents: 'none', transition: 'border 0.3s',
            animation: countdown === 0 ? 'pulseBorder 1s forwards' : 'none'
          }}></div>

          <div style={{
            position: 'absolute', bottom: '0', left: '0', right: '0', textAlign: 'center', zIndex: 15, background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)', padding: '4rem 1rem 1rem 1rem'
          }}>
            <h2 style={{ color: '#fff', margin: 0, fontSize: '1.8rem' }}>
              {steps[currentStepIndex].instruction}
            </h2>
            <p style={{ color: countdown > 0 ? '#60a5fa' : 'var(--success)', fontSize: '1.2rem', fontWeight: 'bold', margin: '0.5rem 0 0 0' }}>
              {countdown > 0 ? `Capturing in ${countdown}...` : 'Vector Captured!'}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem', fontFamily: 'monospace' }}>
              {steps[currentStepIndex].subtext}
            </p>
          </div>
        </div>
      )}

      {currentStepIndex === steps.length && (
        <div style={{ padding: '2rem', animation: 'fadeIn 0.5s ease' }}>
          <CheckCircle size={64} color="var(--success)" style={{ margin: '0 auto', marginBottom: '1rem' }} />
          <h2 style={{ color: 'var(--success)' }}>3D Face Map Generated</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Liveness check passed. Face vectors stored securely.</p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1.5rem', flexWrap: 'wrap' }}>
             {Object.values(capturedImages).map((src, idx) => (
                <img key={idx} src={src} alt="Captured Vector" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', border: '2px solid var(--border-color)', filter: 'brightness(0.9) contrast(1.2)' }} />
             ))}
          </div>
          <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', borderRadius: '8px', color: 'var(--success)' }}>
            Processing securely to Document phase...
          </div>
        </div>
      )}

    </div>
  );
}
