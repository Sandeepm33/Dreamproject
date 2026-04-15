'use client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function TopBar() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (!user) return null;

  return (
    <header style={{ 
      height: 64, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'flex-end', 
      padding: '0 28px',
      background: 'rgba(10, 15, 13, 0.8)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 40
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Search or other tools could go here */}
        
        {/* User Menu */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 10, 
              background: 'rgba(45, 106, 79, 0.1)', 
              border: '1px solid var(--border)', 
              padding: '6px 12px', 
              borderRadius: 50,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary-light)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{ 
              width: 28, 
              height: 28, 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, var(--primary-light), var(--accent))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              color: 'white'
             }}>
              {user.name?.[0]?.toUpperCase() || '👤'}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>▼</span>
          </button>

          {showDropdown && (
            <>
              <div 
                onClick={() => setShowDropdown(false)}
                style={{ position: 'fixed', inset: 0, zIndex: -1 }} 
              />
              <div className="glass-card animate-fade-in" style={{ 
                position: 'absolute', 
                top: 'calc(100% + 10px)', 
                right: 0, 
                width: 200, 
                padding: 8,
                zIndex: 50,
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
              }}>
                <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{user.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user.role}</div>
                </div>
                
                <button 
                  onClick={() => { setShowDropdown(false); router.push(`/dashboard/${user.role === 'admin' || user.role === 'panchayat_secretary' || user.role === 'collector' ? 'admin' : user.role}/profile`); }}
                  style={{ 
                    width: '100%', 
                    padding: '10px 12px', 
                    textAlign: 'left', 
                    background: 'transparent', 
                    border: 'none', 
                    color: 'var(--text-primary)', 
                    fontSize: 13, 
                    cursor: 'pointer',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10
                  }}
                  className="sidebar-item"
                >
                  <span>👤</span> {t('profile')}
                </button>

                <button 
                  onClick={handleLogout}
                  style={{ 
                    width: '100%', 
                    padding: '10px 12px', 
                    textAlign: 'left', 
                    background: 'transparent', 
                    border: 'none', 
                    color: '#ef4444', 
                    fontSize: 13, 
                    cursor: 'pointer',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginTop: 4
                  }}
                  className="sidebar-item"
                >
                  <span>🚪</span> {t('logout')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
