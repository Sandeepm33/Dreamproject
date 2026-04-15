import React from 'react';
import Link from 'next/link';

export default function PublicFooter() {
  return (
    <footer className="bg-[#0a0f0d] border-t border-[rgba(45,106,79,0.3)] pt-16  pb-8">
      <div style={{ maxWidth: 1200, margin: '5rem auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 64, marginBottom: 64, justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Brand Column */}
          <div style={{ flex: '2 1 300px', maxWidth: 450 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: 'white', marginBottom: 20, fontFamily: 'Poppins', letterSpacing: '-0.02em' }}>
              SGP<span style={{ color: '#f59e0b' }}>IMS</span>
            </h2>
            <p style={{ color: '#9ca3af', lineHeight: 1.8, fontSize: 16 }}>
              Smart Gram Panchayat Information Management System is a revolutionary platform designed to bridge the gap between citizens and local governance through transparency and digital innovation.
            </p>
          </div>

          {/* Navigation Column */}
          <div style={{ flex: '1 1 140px' }}>
            <h3 style={{ color: 'white', fontWeight: 700, marginBottom: 24, fontSize: 18 }}>Quick Links</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <li><Link href="#home" style={{ color: '#9ca3af', textDecoration: 'none', transition: 'color 0.2s', fontSize: 15 }}>Home</Link></li>
              <li><Link href="#about" style={{ color: '#9ca3af', textDecoration: 'none', transition: 'color 0.2s', fontSize: 15 }}>About Us</Link></li>
              <li><Link href="#services" style={{ color: '#9ca3af', textDecoration: 'none', transition: 'color 0.2s', fontSize: 15 }}>Services</Link></li>
              <li><Link href="#gallery" style={{ color: '#9ca3af', textDecoration: 'none', transition: 'color 0.2s', fontSize: 15 }}>Gallery</Link></li>
            </ul>
          </div>

          {/* Resources Column */}
          <div style={{ flex: '1 1 140px' }}>
            <h3 style={{ color: 'white', fontWeight: 700, marginBottom: 24, fontSize: 18 }}>Platform</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <li><Link href="/login" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: 15 }}>Login Portal</Link></li>
              <li><Link href="/login" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: 15 }}>Registration</Link></li>
              <li><Link href="#" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: 15 }}>Documentation</Link></li>
              <li><Link href="#" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: 15 }}>Help Center</Link></li>
            </ul>
          </div>

          {/* Contact Column */}
          <div style={{ flex: '1 1 200px' }}>
            <h3 style={{ color: 'white', fontWeight: 700, marginBottom: 24, fontSize: 18 }}>Contact Us</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <li style={{ color: '#9ca3af', fontSize: 15, display: 'flex', gap: 10 }}>
                <span>📍</span> Hyderabad, Telangana
              </li>
              <li style={{ color: '#9ca3af', fontSize: 15, display: 'flex', gap: 10 }}>
                <span>✉️</span> support@sgpims.gov.in
              </li>
              <li style={{ color: '#9ca3af', fontSize: 15, display: 'flex', gap: 10 }}>
                <span>📞</span> +91 8000 000 000
              </li>
            </ul>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(45,106,79,0.3)', paddingTop: 32, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
            &copy; {new Date().getFullYear()} EasTechy It Solutions. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: 24 }}>
            <Link href="#" style={{ color: '#6b7280', textDecoration: 'none', fontSize: 14 }}>Privacy Policy</Link>
            <Link href="#" style={{ color: '#6b7280', textDecoration: 'none', fontSize: 14 }}>Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
