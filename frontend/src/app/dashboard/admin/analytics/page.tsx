'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const catIcons: Record<string,string> = { water:'💧', roads:'🛣️', electricity:'⚡', sanitation:'🧹', others:'📋' };
const catColors: Record<string,string> = { water:'#38bdf8', roads:'#a78bfa', electricity:'#fbbf24', sanitation:'#34d399', others:'#94a3b8' };

export default function AnalyticsPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  useEffect(() => {
    if (!loading && (!user || !['admin','panchayat_secretary','collector','secretariat_office'].includes(user.role))) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  const fetchAnalytics = useCallback(async () => {
    setDataLoading(true);
    try {
      const params: any = {};
      if (dateRange.from) params.from = dateRange.from;
      if (dateRange.to) params.to = dateRange.to;
      const res = await api.getAnalytics(params);
      setData(res);
    } catch {}
    finally { setDataLoading(false); }
  }, [dateRange]);

  const handleDownload = async () => {
    setExporting(true);
    try {
      const blob = await api.exportComplaints();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Full_Analysis_Report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => { if (user) fetchAnalytics(); }, [user, fetchAnalytics]);

  const maxMonthly = data?.byMonth ? Math.max(...data.byMonth.map((m: any) => m.count), 1) : 1;
  const totalComplaints = data?.byCategory?.reduce((s: number, c: any) => s + c.count, 0) || 1;

  if (loading || !user) return null;

  return (
    <div className="animate-fade-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, fontFamily:'Poppins', color:'var(--text-primary)' }}>📈 {t('analyticsTitle')}</h1>
          <p style={{ color:'var(--text-muted)', fontSize:14 }}>{t('performanceDashboard')}</p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <input type="date" value={dateRange.from} onChange={e => setDateRange(d => ({...d, from:e.target.value}))} className="input-field" style={{ width:'auto' }} />
          <span style={{ color:'var(--text-muted)' }}>{t('to')}</span>
          <input type="date" value={dateRange.to} onChange={e => setDateRange(d => ({...d, to:e.target.value}))} className="input-field" style={{ width:'auto' }} />
          <button onClick={fetchAnalytics} className="btn-primary" style={{ fontSize:13, whiteSpace:'nowrap' }}>{t('apply')}</button>
          <button onClick={handleDownload} disabled={exporting} className="btn-accent" style={{ fontSize:13, whiteSpace:'nowrap' }}>
            {exporting ? '⏳ ...' : `📥 ${t('downloadReport') || 'Download Reports'}`}
          </button>
        </div>
      </div>

        {dataLoading ? (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            {[...Array(4)].map((_,i) => <div key={i} className="skeleton" style={{ height:280, borderRadius:16 }} />)}
          </div>
        ) : (
          <>
            {/* Status Breakdown */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px,1fr))', gap:12, marginBottom:24 }}>
              {(data?.byStatus || []).map((s: any) => {
                const colors: Record<string,string> = { pending:'#f59e0b', assigned:'#0ea5e9', in_progress:'#a855f7', resolved:'#22c55e', rejected:'#ef4444', escalated:'#f97316' };
                const c = colors[s._id] || '#94a3b8';
                return (
                  <div key={s._id} className="stat-card" style={{ textAlign:'center' }}>
                    <div style={{ fontSize:26, fontWeight:800, color:c, fontFamily:'Poppins' }}>{s.count}</div>
                    <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4, textTransform:'capitalize' }}>{s._id.replace('_',' ')}</div>
                  </div>
                );
              })}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:24 }}>
              {/* Monthly Trend Chart */}
              <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, color: 'var(--text-primary)' }}>📈 {t('monthlyTrend')}</h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: 40, height: 240, paddingBottom: 10 }}>
                  {(data?.byMonth || []).slice(-6).map((m: any, i: number) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
                      <div 
                        style={{ 
                          width: '100%',
                          height: 200, 
                          display: 'flex', 
                          alignItems: 'flex-end', 
                          justifyContent: 'center',
                          gap: 12
                        }}
                      >
                        {/* Grouped Bars */}
                        {[
                          { key: 'pending', color: '#f59e0b' },
                          { key: 'assigned', color: '#0ea5e9' },
                          { key: 'inProgress', color: '#a855f7' },
                          { key: 'resolved', color: '#22c55e' },
                          { key: 'rejected', color: '#ef4444' },
                          { key: 'escalated', color: '#f97316' }
                        ].map(status => {
                          const val = m[status.key] || 0;
                          const heightPct = (val / maxMonthly) * 100;
                          return (
                            <div 
                              key={status.key}
                              title={`${val} ${t(status.key as any) || status.key}`}
                              style={{ 
                                flex: 1,
                                maxWidth: 45,
                                minWidth: 15,
                                height: `${Math.max(heightPct, 2)}%`, 
                                background: val > 0 ? status.color : 'rgba(255,255,255,0.06)',
                                borderRadius: '6px 6px 0 0',
                                transition: 'all 0.3s ease',
                                cursor: 'pointer',
                                opacity: val > 0 ? 1 : 0.2
                              }}
                            />
                          );
                        })}
                      </div>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2 }}>{MONTHS[(m._id.month - 1)]}</span>
                    </div>
                  ))}
                  {!data?.byMonth?.length && <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)', fontSize:13 }}>{t('noData')}</div>}
                </div>
                
                {/* Legend */}
                <div style={{ display: 'flex', gap: 32, marginTop: 40, justifyContent: 'center', flexWrap: 'wrap', padding: '0 20px' }}>
                  {[
                    { label: t('pending'), color: '#f59e0b' },
                    { label: t('assigned'), color: '#0ea5e9' },
                    { label: t('inProgress'), color: '#a855f7' },
                    { label: t('resolved'), color: '#22c55e' },
                    { label: t('rejected'), color: '#ef4444' },
                    { label: t('escalated'), color: '#f97316' }
                  ].map(l => (
                    <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, background: l.color, display: 'inline-block' }} />
                      {l.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Category Analysis */}
              <div className="glass-card" style={{ padding:24 }}>
                <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', marginBottom:20 }}>🏷️ {t('byCategory')}</h3>
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  {(data?.byCategory || []).map((cat: any) => {
                    const pct = Math.round((cat.count / totalComplaints) * 100);
                    const resolvedPct = cat.count > 0 ? Math.round((cat.resolved / cat.count) * 100) : 0;
                    return (
                      <div key={cat._id}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                          <span style={{ fontSize:13, color:'var(--text-primary)', display:'flex', alignItems:'center', gap:6 }}>
                            {catIcons[cat._id]} <span style={{ textTransform:'capitalize' }}>{t(cat._id as any)}</span>
                          </span>
                          <div style={{ display:'flex', gap:10, fontSize:11 }}>
                            <span style={{ color:catColors[cat._id] }}>{cat.count} ({pct}%)</span>
                            <span style={{ color:'#22c55e' }}>✓ {resolvedPct}%</span>
                          </div>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width:`${pct}%`, background:catColors[cat._id] || 'var(--primary-light)' }} />
                        </div>
                      </div>
                    );
                  })}
                  {!data?.byCategory?.length && <p style={{ color:'var(--text-muted)', fontSize:13 }}>{t('noData')}</p>}
                </div>
              </div>
            </div>

            {/* Top Issues by Votes */}
            <div className="glass-card" style={{ padding:24, marginBottom:20 }}>
              <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', marginBottom:16 }}>🔥 {t('topIssuesVotes')}</h3>
              {!data?.topIssues?.length ? (
                <p style={{ color:'var(--text-muted)', fontSize:13 }}>{t('noData')}</p>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {data.topIssues.map((c: any, i: number) => (
                    <div key={c._id} style={{ display:'flex', alignItems:'center', gap:16, padding:'12px 16px', background:'rgba(255,255,255,0.02)', borderRadius:12, border:'1px solid var(--border)' }}>
                      <div style={{ width:32,height:32,borderRadius:'50%',background: i===0?'linear-gradient(135deg,#f59e0b,#d97706)':i===1?'linear-gradient(135deg,#94a3b8,#64748b)':'linear-gradient(135deg,#b45309,#92400e)', display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:14,color:'white',flexShrink:0 }}>
                        {i+1}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14,fontWeight:600,color:'var(--text-primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{c.title}</div>
                        <div style={{ fontSize:12,color:'var(--text-muted)' }}>{catIcons[c.category]} {t(c.category as any)} · {c.citizen?.village}</div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:18,fontWeight:800,color:'var(--accent)' }}>👍 {c.voteCount}</div>
                        <span className={`badge badge-${c.status === 'in_progress' ? 'inprogress' : c.status}`} style={{ fontSize:10 }}>{c.status.replace('_',' ')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Officer Performance */}
            <div className="glass-card" style={{ padding:24 }}>
              <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', marginBottom:16 }}>👮 {t('officerPerformance')}</h3>
              {!data?.officerPerformance?.length ? (
                <p style={{ color:'var(--text-muted)', fontSize:13 }}>{t('noData')}</p>
              ) : (
                <table className="data-table">
                  <thead><tr><th>{t('officer')}</th><th>{t('department')}</th><th>{t('totalAssigned')}</th><th>{t('resolved')}</th><th>{t('resolutionRate')}</th></tr></thead>
                  <tbody>
                    {data.officerPerformance.map((o: any) => (
                      <tr key={o._id}>
                        <td style={{ fontWeight:600 }}>{o.name}</td>
                        <td style={{ color:'var(--text-muted)',fontSize:12 }}>{o.department || '—'}</td>
                        <td><span style={{ color:'var(--text-primary)',fontWeight:600 }}>{o.total}</span></td>
                        <td><span style={{ color:'#22c55e',fontWeight:600 }}>{o.resolved}</span></td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <div className="progress-bar" style={{ flex:1 }}>
                              <div className="progress-fill" style={{ width:`${Math.round(o.rate)}%` }} />
                            </div>
                            <span style={{ fontSize:12, color:'var(--text-secondary)', minWidth:36 }}>{Math.round(o.rate)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
    </div>
  );
}
