'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

export default function CitizenDashboard() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, resolved: 0, inProgress: 0 });
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'citizen')) router.replace('/login');
  }, [user, loading, router]);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.getComplaints({ limit: '5', sortBy: 'createdAt', order: 'desc' });
      setComplaints(res.complaints || []);
      const all = res.complaints || [];
      setStats({
        total: res.total || 0,
        pending: all.filter((c:any) => c.status === 'pending').length,
        resolved: all.filter((c:any) => c.status === 'resolved').length,
        inProgress: all.filter((c:any) => c.status === 'in_progress').length,
      });
    } catch (err) { console.error(err); }
    finally { setDataLoading(false); }
  }, []);

  useEffect(() => { if (user) fetchData(); }, [user, fetchData]);

  const catIcons: Record<string,string> = { water:'💧', roads:'🛣️', electricity:'⚡', sanitation:'🧹', others:'📋' };
  const statusSteps = ['pending','assigned','in_progress','resolved'];

  if (loading || !user) return null;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="layout-header" style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-light), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Poppins', color: 'var(--text-primary)' }}>
                {t('namaste').replace('{name}', user.name.split(' ')[0])}
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>📍 {((user as any).village?.name || (typeof user.village === 'string' ? user.village : '')) || t('yourVillage')} · {t('citizenPortal')}</p>
            </div>
          </div>
        </div>

        {/* Quick Action Banner */}
        <div style={{ background: 'linear-gradient(135deg, rgba(45,106,79,0.3) 0%, rgba(245,158,11,0.15) 100%)', border: '1px solid var(--border)', borderRadius: 20, padding: '24px 28px', marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -30, right: -30, fontSize: 120, opacity: 0.06 }}>🏛️</div>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{t('reportIssueHeader')}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{t('reportIssueSub')}</p>
          </div>
          <button onClick={() => router.push('/dashboard/citizen/new-complaint')} className="btn-accent" style={{ fontSize: 14, padding: '14px 28px', whiteSpace: 'nowrap' }}>

            ➕ {t('raiseNewIssue')}
          </button>
        </div>


        {/* Stats */}
        <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          {[
            { label: t('totalRaised'), value: stats.total, icon: '📋', color: '#0ea5e9' },
            { label: t('pending'), value: stats.pending, icon: '⏳', color: '#f59e0b' },
            { label: t('inProgress'), value: stats.inProgress, icon: '🔧', color: '#a855f7' },
            { label: t('resolved'), value: stats.resolved, icon: '✅', color: '#22c55e' },
          ].map((s, i) => (
            <div key={i} className="stat-card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: 'Poppins' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Recent Complaints */}
        <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>🕒 {t('recentIssues')}</h3>
            <button onClick={() => router.push('/dashboard/citizen/complaints')} className="btn-ghost" style={{ fontSize: 12 }}>{t('seeAll')}</button>
          </div>

          {dataLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[...Array(3)].map((_,i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
            </div>
          ) : complaints.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <p style={{ fontSize: 14, marginBottom: 12 }}>{t('noComplaintsRaised')}</p>
              <button onClick={() => router.push('/dashboard/citizen/new-complaint')} className="btn-primary" style={{ fontSize: 13 }}>{t('raiseFirstIssue')}</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {complaints.map(c => (
                <div key={c._id} className="glass-card glass-card-hover" style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}
                  onClick={() => router.push(`/dashboard/citizen/complaints/${c._id}`)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 16 }}>{catIcons[c.category] || '📋'}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <code style={{ fontSize: 11, color: 'var(--accent)', background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: 4 }}>{c.complaintId}</code>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleDateString('en-IN')}</span>
                      {c.voteCount > 0 && <span style={{ fontSize: 11, color: '#f59e0b' }}>👍 {c.voteCount}</span>}
                    </div>
                  </div>
                  <div>
                    <span className={`badge badge-${c.status === 'in_progress' ? 'inprogress' : c.status}`}>{t(c.status === 'in_progress' ? 'inProgress' : c.status as any)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="responsive-grid" style={{ marginBottom: 24 }}>
          {[
            { icon: '🔍', label: t('trackComplaint'), desc: t('trackComplaintDesc'), href: '/dashboard/citizen/track', color: '#0ea5e9' },
            { icon: '🔔', label: t('notifications'), desc: t('notifDesc'), href: '/dashboard/citizen/notifications', color: '#f59e0b' },
            { icon: '👤', label: t('profile'), desc: t('updateDetails'), href: '/dashboard/citizen/profile', color: '#22c55e' },
          ].map((item, i) => (
            <div key={i} className="glass-card glass-card-hover" style={{ padding: '20px', cursor: 'pointer', textAlign: 'center' }} onClick={() => router.push(item.href)}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: `${item.color}18`, border: `1px solid ${item.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 12px' }}>{item.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.desc}</div>
            </div>
          ))}
        </div>
      {/* FAB */}
      <button className="fab" onClick={() => router.push('/dashboard/citizen/new-complaint')} title={t('raiseNewIssue')}>
        <span style={{ fontSize: 24 }}>+</span>
      </button>
    </div>
  );
}
