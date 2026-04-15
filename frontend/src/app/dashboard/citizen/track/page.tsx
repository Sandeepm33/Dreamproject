'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

const catIcons: Record<string,string> = { water:'💧', roads:'🛣️', electricity:'⚡', sanitation:'🧹', others:'📋' };
const statusSteps = ['pending','assigned','in_progress','resolved'];

export default function TrackComplaintPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [complaintId, setComplaintId] = useState('');
  const [complaint, setComplaint] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!complaintId.trim()) return;
    setLoading(true); setError(''); setComplaint(null);
    try {
      const res = await api.getComplaints({ search: complaintId.trim() });
      if (res.complaints?.length > 0) {
        setComplaint(res.complaints[0]);
      } else {
        setError(t('noComplaintFound'));
      }
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const currentStep = complaint ? statusSteps.indexOf(complaint.status) : -1;

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg-dark)' }}>
      <Sidebar />
      <main style={{ flex:1, marginLeft:280, padding:'28px', maxWidth:'calc(100vw - 280px)' }}>
        <div style={{ maxWidth:660, margin:'0 auto' }}>
          <h1 style={{ fontSize:24, fontWeight:800, fontFamily:'Poppins', color:'var(--text-primary)', marginBottom:8 }}>🔍 {t('trackStatus')}</h1>
          <p style={{ color:'var(--text-muted)', fontSize:14, marginBottom:28 }}>{t('searchPrompt')}</p>

          {/* Search */}
          <div className="glass-card" style={{ padding:28, marginBottom:24 }}>
            <label className="label">{t('idLabel')}</label>
            <div style={{ display:'flex', gap:12, marginBottom:16 }}>
              <input value={complaintId} onChange={e => setComplaintId(e.target.value.toUpperCase())} className="input-field"
                placeholder="e.g. GP-VLG-2024-0001" onKeyDown={e => e.key==='Enter' && handleSearch()}
                style={{ fontFamily:'monospace', fontSize:15, letterSpacing:1 }} />
              <button onClick={handleSearch} className="btn-primary" disabled={loading} style={{ whiteSpace:'nowrap', padding:'12px 28px' }}>
                {loading ? `⏳ ${t('loading')}` : `🔍 ${t('trackBtn')}`}
              </button>
            </div>
            {error && <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:10, padding:'10px 14px', color:'#ef4444', fontSize:13 }}>⚠️ {error}</div>}
            <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:8 }}>{t('idHelp')}</p>
          </div>

          {/* Result */}
          {complaint && (
            <div style={{ animation:'fadeInUp 0.4s ease' }}>
              <div className="glass-card" style={{ padding:28, marginBottom:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                      <span style={{ fontSize:24 }}>{catIcons[complaint.category]||'📋'}</span>
                      <h2 style={{ fontSize:17, fontWeight:700, color:'var(--text-primary)' }}>{complaint.title}</h2>
                    </div>
                    <code style={{ fontSize:13, color:'var(--accent)', background:'rgba(245,158,11,0.1)', padding:'3px 12px', borderRadius:6 }}>{complaint.complaintId}</code>
                  </div>
                  <span className={`badge badge-${complaint.status === 'in_progress' ? 'inprogress' : complaint.status}`} style={{ fontSize:12, padding:'6px 14px' }}>
                    {t(complaint.status === 'in_progress' ? 'inProgress' : complaint.status as any)}
                  </span>
                </div>

                {/* Status Steps */}
                <div style={{ marginBottom:24 }}>
                  <div style={{ display:'flex', alignItems:'center' }}>
                    {[[t('submitted'), 'submitted'], [t('assigned'), 'assigned'], [t('inProgress'), 'in_progress'], [t('resolved'), 'resolved']].map(([label, sKey], i) => (
                      <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center' }}>
                        <div style={{ display:'flex', alignItems:'center', width:'100%' }}>
                          {i > 0 && <div style={{ flex:1, height:4, background: i<=currentStep ? 'var(--primary-light)' : 'var(--border)', borderRadius:2, transition:'background 0.5s' }} />}
                          <div style={{ width:36, height:36, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, transition:'all 0.3s',
                            background: i<currentStep ? 'var(--primary-light)' : i===currentStep ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                            color: i<=currentStep ? 'white' : 'var(--text-muted)',
                            boxShadow: i===currentStep ? 'var(--glow-accent)' : 'none',
                            animation: i===currentStep ? 'pulse-glow 2s infinite' : 'none' }}>
                            {i < currentStep ? '✓' : i===currentStep ? '●' : i+1}
                          </div>
                          {i < 3 && <div style={{ flex:1, height:4, background: i<currentStep ? 'var(--primary-light)' : 'var(--border)', borderRadius:2, transition:'background 0.5s' }} />}
                        </div>
                        <span style={{ fontSize:11, color: i<=currentStep ? 'var(--text-secondary)' : 'var(--text-muted)', marginTop:8, textAlign:'center' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  {[
                    { label: t('category'), value:`${catIcons[complaint.category]} ${t(complaint.category as any)}` },
                    { label: t('department'), value:complaint.department||t('routing') },
                    { label: t('filedOn'), value:new Date(complaint.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}) },
                    { label: t('deadline'), value:complaint.slaDeadline ? new Date(complaint.slaDeadline).toLocaleDateString('en-IN') : 'N/A' },
                    { label: t('assignedTo'), value:complaint.assignedTo?.name||t('notAssigned') },
                    { label: t('votes'), value:`👍 ${complaint.voteCount} ${t('communitySupport')}` },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ padding:'10px 14px', background:'rgba(255,255,255,0.02)', borderRadius:10, border:'1px solid var(--border)' }}>
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:3 }}>{label}</div>
                      <div style={{ fontSize:13, color:'var(--text-primary)', fontWeight:500, textTransform:'capitalize' }}>{value}</div>
                    </div>
                  ))}
                </div>

                {complaint.escalation?.level !== 'none' && (
                  <div style={{ marginTop:16, padding:'12px 16px', background:'rgba(249,115,22,0.08)', border:'1px solid rgba(249,115,22,0.3)', borderRadius:12 }}>
                    <p style={{ color:'#f97316', fontSize:13, fontWeight:600 }}>🚨 {t('escalatedTo')} {complaint.escalation?.level?.toUpperCase()} {t('officer')}</p>
                    <p style={{ color:'var(--text-muted)', fontSize:12, marginTop:3 }}>{complaint.escalation?.reason}</p>
                  </div>
                )}
              </div>

              {/* Latest Update */}
              {complaint.statusHistory?.length > 0 && (
                <div className="glass-card" style={{ padding:24 }}>
                  <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text-secondary)', marginBottom:14 }}>📅 {t('latestStatus')}</h3>
                  <div>
                    {complaint.statusHistory.slice(-3).reverse().map((h: any, i: number) => (
                      <div key={i} className="timeline-item">
                        <div className={`timeline-dot ${i===0?'active':''}`} />
                        <div style={{ paddingLeft:8 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', textTransform:'capitalize' }}>{t(h.status === 'in_progress' ? 'inProgress' : h.status as any)}</div>
                          <div style={{ fontSize:12, color:'var(--text-muted)' }}>{h.note}</div>
                          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{new Date(h.changedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => router.push(`/dashboard/citizen/complaints/${complaint._id}`)} className="btn-ghost" style={{ fontSize:13, marginTop:8 }}>{t('viewFullDetails')}</button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <style>{`@keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
