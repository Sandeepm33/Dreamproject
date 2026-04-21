'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

interface Stats {
  total: number; pending: number; assigned: number; inProgress: number;
  resolved: number; rejected: number; escalated: number;
  resolutionRate: number; avgResolutionHours: number; slaBreached: number;
  totalUsers: number; totalOfficers: number;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [categoryStats, setCategoryStats] = useState<any[]>([]);
  const [recentComplaints, setRecentComplaints] = useState<any[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [villageMap, setVillageMap] = useState<Record<string, string>>({});

  useEffect(() => {
    api.getVillages().then(res => {
      const vMap: any = {}; res.villages?.forEach((v: any) => vMap[v._id] = v.name); setVillageMap(vMap);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!user || !['admin','panchayat_secretary','collector'].includes(user.role)) {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.getDashboard();
      setStats(res.stats);
      setCategoryStats(res.categoryStats);
      setRecentComplaints(res.recentComplaints);
      setMonthlyTrend(res.monthlyTrend);
    } catch (err) { console.error(err); }
    finally { setDataLoading(false); }
  }, []);

  useEffect(() => { if (user) fetchDashboard(); }, [user, fetchDashboard]);

  // AUTO-REFRESH on new notification
  useEffect(() => {
    const handleRefresh = () => {
      console.log('🔄 Dashboard Refresh Triggered by FCM');
      fetchDashboard();
    };
    window.addEventListener('fcm-message-received', handleRefresh);

    // FALLBACK: Auto-check every 30 seconds just in case
    const interval = setInterval(fetchDashboard, 30000);

    return () => {
      window.removeEventListener('fcm-message-received', handleRefresh);
      clearInterval(interval);
    };
  }, [fetchDashboard]);

  const catIcons: Record<string,string> = { water:'💧', roads:'🛣️', electricity:'⚡', sanitation:'🧹', others:'📋' };
  const catColors: Record<string,string> = { water:'#38bdf8', roads:'#a78bfa', electricity:'#fbbf24', sanitation:'#34d399', others:'#94a3b8' };

  const statCards = stats ? [
    { label: t('totalRaised'), value: stats.total, icon: '📋', color: '#0ea5e9', sub: t('allTime') },
    { label: t('pending'), value: stats.pending, icon: '⏳', color: '#f59e0b', sub: t('awaitingAction') },
    { label: t('inProgress'), value: stats.inProgress, icon: '🔧', color: '#a855f7', sub: t('beingResolved') },
    { label: t('resolved'), value: stats.resolved, icon: '✅', color: '#22c55e', sub: t('resolutionRateDetail').replace('{rate}', stats.resolutionRate.toString()) },
    { label: t('escalated'), value: stats.escalated, icon: '🚨', color: '#ef4444', sub: t('needsAttention') },
    { label: t('slaBreached'), value: stats.slaBreached, icon: '⏰', color: '#f97316', sub: t('overdue') },
    { label: t('totalUsersTitle'), value: stats.totalUsers, icon: '👥', color: '#86efac', sub: t('registered') },
    { label: t('avgResolution'), value: `${stats.avgResolutionHours}h`, icon: '⚡', color: '#f59e0b', sub: t('perComplaint') },
  ] : [];

  const statusColors: Record<string,string> = { pending:'#f59e0b', assigned:'#0ea5e9', in_progress:'#a855f7', resolved:'#22c55e', rejected:'#ef4444', escalated:'#f97316' };

  const maxMonthly = Math.max(...monthlyTrend.map(m => m.count), 1);

  if (loading || !user) return null;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="layout-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Poppins', color: 'var(--text-primary)' }}>{t('adminDashboard')}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 2 }}>{t('namaste').replace('{name}', user.name)} • {new Date().toLocaleDateString('en-IN', { day:'numeric',month:'long',year:'numeric' })}</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={fetchDashboard} className="btn-ghost" style={{ fontSize: 13 }}>🔄 {t('refresh')}</button>
            <button onClick={() => router.push('/dashboard/admin/complaints')} className="btn-primary" style={{ fontSize: 13 }}>📋 {t('seeAll').replace(' →','')}</button>
          </div>
        </div>

        {/* Village Assignment Banner — shown only to Panchayat Secretary */}
        {user.role === 'panchayat_secretary' && (
          <div className="glass-card" style={{ 
            padding: '16px 24px', 
            marginBottom: 24, 
            background: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(14,165,233,0.1))', 
            border: '1px solid rgba(168,85,247,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            flexWrap: 'wrap'
          }}>
            <div style={{ fontSize: 36 }}>🏛️</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: '#a855f7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Your Assigned Jurisdiction</div>
              {(user as any).village ? (
                <>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Poppins' }}>
                    {(user as any).village?.name || 'Village'}
                    {(user as any).village?.villageCode && <code style={{ fontSize: 12, marginLeft: 10, color: 'var(--accent)', background: 'rgba(245,158,11,0.15)', padding: '2px 8px', borderRadius: 6 }}>{(user as any).village.villageCode}</code>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {(user as any).district?.name && `📍 ${(user as any).district.name}`}
                    {(user as any).village?.mandal && ` • ${(user as any).village.mandal} Mandal`}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 14, color: '#ef4444' }}>⚠️ No village assigned yet. Contact your Collector to get assigned.</div>
              )}
            </div>
          </div>
        )}




        {dataLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
            {[...Array(8)].map((_,i) => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />)}
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
              {statCards.map((card, i) => (
                <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${card.color}18`, border: `1px solid ${card.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{card.icon}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: card.color, fontFamily: 'Poppins' }}>{card.value}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{card.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{card.sub}</div>
                </div>
              ))}
            </div>

            <div className="responsive-grid" style={{ marginBottom: 24 }}>
              {/* Monthly Trend Chart */}
              <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, color: 'var(--text-primary)' }}>📈 {t('monthlyTrend')}</h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140 }}>
                  {monthlyTrend.slice(-8).map((m, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: 120 }}>
                        <div title={`${m.count} ${t('complaints')}`} style={{ width: '100%', height: `${(m.count / maxMonthly) * 100}%`, background: 'linear-gradient(180deg, var(--primary-light), var(--primary))', borderRadius: '4px 4px 0 0', minHeight: 4, cursor: 'pointer', transition: 'opacity 0.2s' }} className="chart-bar" />
                        {m.resolved > 0 && <div style={{ width: '100%', height: `${(m.resolved / maxMonthly) * 100}%`, background: 'rgba(34,197,94,0.5)', borderRadius: '4px 4px 0 0', marginTop: 2, minHeight: 2 }} />}
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{MONTHS[(m._id.month - 1)]}</span>
                    </div>
                  ))}
                  {monthlyTrend.length === 0 && <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', fontSize:13 }}>{t('noData')}</div>}
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}><span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--primary-light)', display: 'inline-block' }} />{t('total')}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}><span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(34,197,94,0.5)', display: 'inline-block' }} />{t('resolved')}</span>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, color: 'var(--text-primary)' }}>🏷️ {t('byCategory')}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {categoryStats.map((cat, i) => {
                    const total = categoryStats.reduce((s,c) => s + c.count, 0) || 1;
                    const pct = Math.round((cat.count / total) * 100);
                    return (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {catIcons[cat._id] || '📋'} <span style={{ textTransform: 'capitalize' }}>{t(cat._id as any)}</span>
                          </span>
                          <span style={{ fontSize: 12, color: catColors[cat._id] || '#94a3b8', fontWeight: 600 }}>{cat.count} ({pct}%)</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${pct}%`, background: catColors[cat._id] || 'var(--primary-light)' }} />
                        </div>
                      </div>
                    );
                  })}
                  {categoryStats.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>{t('noData')}</div>}
                </div>
              </div>
            </div>

            {/* Recent Complaints Table */}
            <div className="glass-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>🕒 {t('recentIssues')}</h3>
                <button onClick={() => router.push('/dashboard/admin/complaints')} className="btn-ghost" style={{ fontSize: 12 }}>{t('seeAll')}</button>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th><th>{t('issueTitle')}</th><th>{t('category')}</th><th>{t('citizen')}</th><th>{t('status')}</th><th>{t('votes')}</th><th>{t('filedOn')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentComplaints.map(c => (
                      <tr key={c._id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/dashboard/admin/complaints/${c._id}`)}>
                        <td><code style={{ fontSize: 11, color: 'var(--accent)', background: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: 4 }}>{c.complaintId}</code></td>
                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</td>
                        <td><span style={{ fontSize: 12 }}>{catIcons[c.category] || '📋'} {t(c.category as any)}</span></td>
                        <td style={{ fontSize: 13 }}>{c.citizen?.name} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>· {c.village?.name || villageMap[c.village] || c.citizen?.village?.name || villageMap[c.citizen?.village] || c.location?.village || (typeof c.citizen?.village === 'string' ? `${t('village')}: ${c.citizen.village.substring(0,8)}...` : '—')}</span></td>
                        <td><span className={`badge badge-${c.status === 'in_progress' ? 'inprogress' : c.status}`}>{t(c.status === 'in_progress' ? 'inProgress' : c.status as any)}</span></td>
                        <td style={{ color: 'var(--accent)', fontSize: 13 }}>👍 {c.voteCount}</td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleDateString('en-IN')}</td>
                      </tr>
                    ))}
                    {recentComplaints.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>{t('noComplaints')}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
    </div>
  );
}
