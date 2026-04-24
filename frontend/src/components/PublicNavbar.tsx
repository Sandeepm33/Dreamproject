import React, { useState } from 'react';
import Link from 'next/link';
import { Leaf, LogIn, Globe, Menu, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';

export default function PublicNavbar() {
  const { user, loading } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const getDashboardUrl = () => {
    if (!user) return '/login';
    const role = (user.role === 'panchayat_secretary' || user.role === 'collector') ? 'admin' : user.role;
    return `/dashboard/${role}`;
  };

  return (
    <nav style={{ position: 'fixed', top: 0, width: '100%', zIndex: 100, background: 'rgba(10, 15, 13, 0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(45, 106, 79, 0.3)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 80 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="gradient-primary" style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              <img src={language === 'te' ? '/logo-te.png' : '/logo-en.png'} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: 0, lineHeight: 1 }}>
                {language === 'en' ? (
                  <>Mana<span style={{ color: '#f59e0b' }}>gramam</span></>
                ) : (
                  <><span>మన</span><span style={{ color: '#f59e0b' }}>గ్రామం</span></>
                )}
              </h1>
              <p style={{ fontSize: 10, color: '#4ade80', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, margin: 0, marginTop: 4 }}>{t('smartPanchayat')}</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex" style={{ gap: 32, alignItems: 'center', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(20, 83, 45, 0.4)', padding: '10px 32px', borderRadius: 999 }}>
            <Link href="#home" style={{ color: '#d1d5db', textDecoration: 'none', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{t('home')}</Link>
            <Link href="#about" style={{ color: '#d1d5db', textDecoration: 'none', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{t('about')}</Link>
            <Link href="#services" style={{ color: '#d1d5db', textDecoration: 'none', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{t('services')}</Link>
            <Link href="#gallery" style={{ color: '#d1d5db', textDecoration: 'none', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{t('gallery')}</Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="hidden md:flex items-center gap-4">
              <button 
                onClick={() => setLanguage(language === 'en' ? 'te' : 'en')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '10px 16px', borderRadius: 12, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
              >
                <Globe size={16} color="#4ade80" />
                {language === 'en' ? 'English' : 'తెలుగు'}
              </button>
              {!loading && (
                <Link href={user ? getDashboardUrl() : "/login"}>
                  <button className="btn-primary flex items-center gap-2">
                    <LogIn size={18} />
                    <span>{user ? t('dashboard') : t('loginRegister')}</span>
                  </button>
                </Link>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button 
              className="lg:hidden" 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 8 }}
            >
              {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div style={{ 
          position: 'absolute', 
          top: 80, 
          left: 0, 
          width: '100%', 
          background: '#0a0f0d', 
          borderBottom: '1px solid rgba(45, 106, 79, 0.3)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          zIndex: 99,
          animation: 'fadeIn 0.3s ease'
        }}>
          <Link href="#home" onClick={() => setIsMenuOpen(false)} style={{ color: 'white', textDecoration: 'none', fontSize: 16, fontWeight: 600 }}>{t('home')}</Link>
          <Link href="#about" onClick={() => setIsMenuOpen(false)} style={{ color: 'white', textDecoration: 'none', fontSize: 16, fontWeight: 600 }}>{t('about')}</Link>
          <Link href="#services" onClick={() => setIsMenuOpen(false)} style={{ color: 'white', textDecoration: 'none', fontSize: 16, fontWeight: 600 }}>{t('services')}</Link>
          <Link href="#gallery" onClick={() => setIsMenuOpen(false)} style={{ color: 'white', textDecoration: 'none', fontSize: 16, fontWeight: 600 }}>{t('gallery')}</Link>
          
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <button 
              onClick={() => { setLanguage(language === 'en' ? 'te' : 'en'); setIsMenuOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '14px', borderRadius: 12, cursor: 'pointer', fontWeight: 600 }}
            >
              <Globe size={18} color="#4ade80" />
              {language === 'en' ? 'Switch to తెలుగు' : 'Switch to English'}
            </button>
            {!loading && (
              <Link href={user ? getDashboardUrl() : "/login"} onClick={() => setIsMenuOpen(false)}>
                <button className="btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '14px' }}>
                  <LogIn size={20} />
                  <span>{user ? t('dashboard') : t('loginRegister')}</span>
                </button>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
