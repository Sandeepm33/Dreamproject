'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

export default function VillageOfficersPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [officers, setOfficers] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'citizen')) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    const fetchOfficers = async () => {
      try {
        const res = await api.getVillageOfficers();
        setOfficers(res.officers || []);
      } catch (err) {
        console.error('Failed to fetch officers:', err);
      } finally {
        setDataLoading(false);
      }
    };

    if (user) fetchOfficers();
  }, [user]);

  if (loading || !user) return null;

  const roleColors: Record<string, string> = {
    panchayat_secretary: '#a855f7',
    officer: '#0ea5e9',
  };

  return (
    <div className="animate-fade-in" style={{ paddingTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button onClick={() => router.back()} className="btn-ghost" style={{ padding: '8px 12px' }}>← {t('back')}</button>
        <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Poppins', color: 'var(--text-primary)' }}>
          🏛️ {t('villageOfficers')}
        </h1>
      </div>

      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
        📍 {((user as any).village?.name || 'Your Village')} · {t('meetVillageOfficers')}
      </p>

      {dataLoading ? (
        <div className="responsive-grid">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 200, borderRadius: 20 }} />
          ))}
        </div>
      ) : officers.length === 0 ? (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏢</div>
          <p>{t('noData')}</p>
        </div>
      ) : (
        <div className="responsive-grid">
          {officers.map((officer) => (
            <div key={officer._id} className="glass-card glass-card-hover" style={{ padding: 24, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: roleColors[officer.role] || 'var(--primary)' }} />
              
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: `${roleColors[officer.role] || '#ccc'}20`, border: `2px solid ${roleColors[officer.role] || '#ccc'}40`, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, color: roleColors[officer.role] || '#666', overflow: 'hidden' }}>
                {officer.avatar ? (
                  <img src={officer.avatar.startsWith('http') ? officer.avatar : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${officer.avatar}`} alt={officer.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  officer.name[0].toUpperCase()
                )}
              </div>

              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{officer.name}</h3>
              <div style={{ display: 'inline-block', padding: '2px 12px', borderRadius: 20, background: `${roleColors[officer.role]}15`, color: roleColors[officer.role], fontSize: 11, fontWeight: 600, textTransform: 'capitalize', marginBottom: 12, border: `1px solid ${roleColors[officer.role]}30` }}>
                {t(officer.role)}
              </div>

              {officer.department && (
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  💼 {officer.department}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
                <a href={`tel:${officer.mobile}`} style={{ fontSize: 13, color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
                  📞 {officer.mobile}
                </a>
                <a href={`mailto:${officer.email}`} style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}>
                  📧 {officer.email}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
