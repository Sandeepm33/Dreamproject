import React from 'react';
import Link from 'next/link';
import { Leaf, LogIn, Globe } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function PublicNavbar() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <nav style={{ position: 'fixed', top: 0, width: '100%', zIndex: 50, background: 'rgba(10, 15, 13, 0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(45, 106, 79, 0.3)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 80 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="gradient-primary" style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyItems: 'center', paddingLeft: '10px' }}>
              <Leaf size={24} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: 0, lineHeight: 1 }}>
                SGP<span style={{ color: '#f59e0b' }}>IMS</span>
              </h1>
              <p style={{ fontSize: 10, color: '#4ade80', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, margin: 0, marginTop: 4 }}>{t('smartPanchayat')}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 32, alignItems: 'center', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(20, 83, 45, 0.4)', padding: '10px 32px', borderRadius: 999 }}>
            <Link href="#home" style={{ color: '#d1d5db', textDecoration: 'none', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{t('home')}</Link>
            <Link href="#about" style={{ color: '#d1d5db', textDecoration: 'none', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{t('about')}</Link>
            <Link href="#services" style={{ color: '#d1d5db', textDecoration: 'none', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{t('services')}</Link>
            <Link href="#gallery" style={{ color: '#d1d5db', textDecoration: 'none', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{t('gallery')}</Link>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setLanguage(language === 'en' ? 'te' : 'en')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '10px 16px', borderRadius: 12, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
            >
              <Globe size={16} color="#4ade80" />
              {language === 'en' ? 'English' : 'తెలుగు'}
            </button>
            <Link href="/login">
              <button className="btn-primary flex items-center gap-2">
                <LogIn size={18} />
                <span>{t('loginRegister')}</span>
              </button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
