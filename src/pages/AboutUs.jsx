import React from 'react';
import { Users, Code, Globe, Shield } from 'lucide-react';

export default function AboutUs() {
  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '4rem auto', padding: '0 2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--text-main)' }}>About NewbieHub</h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: '1.8', maxWidth: '700px', margin: '0 auto' }}>
          We are on a mission to democratize software development by connecting brilliant, emerging developers with visionary buyers seeking high-quality, innovative, and affordable software solutions.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '4rem' }}>
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <Users size={28} />
          </div>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Empowering Talent</h3>
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', fontSize: '0.95rem' }}>
            NewbieHub provides a launchpad for fresh, talented developers to showcase their skills, build their portfolios, and kickstart their professional careers by working on real-world projects.
          </p>
        </div>

        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ background: 'var(--success-light)', color: 'var(--success)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <Code size={28} />
          </div>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Accessible Solutions</h3>
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', fontSize: '0.95rem' }}>
            We believe that high-quality software shouldn't break the bank. By tapping into a global pool of motivated emerging developers, buyers can bring their ideas to life affordably.
          </p>
        </div>

        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ background: 'var(--warning-light)', color: 'var(--warning)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <Globe size={28} />
          </div>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Global Community</h3>
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', fontSize: '0.95rem' }}>
            Our platform transcends borders, fostering a diverse community of creators and innovators where ideas are shared freely and global collaborations thrive.
          </p>
        </div>

        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <Shield size={28} />
          </div>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Secure & Transparent</h3>
          <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', fontSize: '0.95rem' }}>
            With built-in escrow services, identity verification, and transparent communication tools, we ensure that every transaction is secure and every project is successful.
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>Join the Revolution</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: '1.8', marginBottom: '2rem', maxWidth: '800px', margin: '0 auto 2rem' }}>
          Whether you are a startup looking to build your MVP, an established business aiming to optimize your operations, or a newly minted developer eager to prove your mettle, NewbieHub is your destination. We are more than just a marketplace; we are a dedicated ecosystem designed to nurture talent and ensure project success. By providing state-of-the-art tools, comprehensive dispute resolution, and continuous support, we make sure that every interaction on our platform is productive and rewarding. Welcome to the future of freelance development.
        </p>
      </div>
    </div>
  );
}
