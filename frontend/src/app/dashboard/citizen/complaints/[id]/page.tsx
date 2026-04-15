'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

const catIcons: Record<string,string> = { water:'💧', roads:'🛣️', electricity:'⚡', sanitation:'🧹', others:'📋' };
const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api','') || 'http://localhost:5000';

export default function ComplaintDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [complaint, setComplaint] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [remark, setRemark] = useState('');
  const [submittingRemark, setSubmittingRemark] = useState(false);
  const [approvingResolution, setApprovingResolution] = useState(false);
  const [feedback, setFeedback] = useState('');

  const fetch = useCallback(async () => {
    try {
      const res = await api.getComplaint(id as string);
      setComplaint(res.complaint);
    } catch {}
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleVote = async () => {
    try {
      const res = await api.vote(id as string);
      setComplaint((c: any) => ({ ...c, voteCount: res.voteCount, voted: res.voted }));
    } catch {}
  };

  const handleRemark = async () => {
    if (!remark.trim()) return;
    setSubmittingRemark(true);
    try {
      const res = await api.addRemark(id as string, remark);
      setComplaint(res.complaint);
      setRemark('');
    } catch {}
    finally { setSubmittingRemark(false); }
  };

  const handleApproval = async (approved: boolean) => {
    setApprovingResolution(true);
    try {
      await api.approveResolution(id as string, { approved, feedback });
      await fetch();
    } catch {}
    finally { setApprovingResolution(false); }
  };

  const statusOrder = ['pending','assigned','in_progress','resolved'];
  const currentStep = complaint ? statusOrder.indexOf(complaint.status) : -1;

  if (loading) return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg-dark)' }}>
      <Sidebar />
      <main style={{ flex:1, marginLeft:240, padding:28, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ width:50,height:50,border:'3px solid var(--border)',borderTopColor:'var(--accent)',borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 12px' }} />
          <p style={{ color:'var(--text-muted)',fontSize:13 }}>{t('loadingComplaint')}</p>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </main>
    </div>
  );

  if (!complaint) return null;

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg-dark)' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 280, padding: '28px' }}>
        <div style={{ maxWidth:800, margin:'0 auto' }}>
          {/* Back */}
          <button onClick={() => router.back()} style={{ background:'transparent',border:'none',color:'var(--text-muted)',cursor:'pointer',fontSize:14,marginBottom:20,display:'flex',alignItems:'center',gap:6 }}>← {t('backToComplaints')}</button>

          {/* Header Card */}
          <div className="glass-card" style={{ padding:28, marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16, marginBottom:20 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <span style={{ fontSize:28 }}>{catIcons[complaint.category] || '📋'}</span>
                  <div>
                    <h1 style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', fontFamily:'Poppins' }}>{complaint.title}</h1>
                    <code style={{ fontSize:12, color:'var(--accent)', background:'rgba(245,158,11,0.1)', padding:'2px 10px', borderRadius:6 }}>{complaint.complaintId}</code>
                  </div>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8 }}>
                <span className={`badge badge-${complaint.status === 'in_progress' ? 'inprogress' : complaint.status}`} style={{ fontSize:12, padding:'6px 14px' }}>
                  {t(complaint.status === 'in_progress' ? 'inProgress' : complaint.status as any)}
                </span>
                <button onClick={handleVote} className={`vote-btn ${complaint.voted ? 'voted':''}`}>👍 {complaint.voteCount} {t('votes')}</button>
              </div>
            </div>

            {/* Progress Steps */}
            <div style={{ marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center' }}>
                {statusOrder.map((s, i) => (
                  <div key={s} style={{ flex:1, display:'flex', alignItems:'center' }}>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1 }}>
                      <div style={{ width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800,
                        background: i <= currentStep ? 'var(--primary-light)' : 'rgba(255,255,255,0.05)',
                        color: i <= currentStep ? 'white' : 'var(--text-muted)',
                        border: i === currentStep ? '2px solid var(--accent)' : 'none' }}>
                        {i < currentStep ? '✓' : i + 1}
                      </div>
                      <span style={{ fontSize:11, color: i <= currentStep ? 'var(--text-secondary)' : 'var(--text-muted)', marginTop:6, textAlign:'center' }}>
                        {t(s === 'in_progress' ? 'inProgress' : s as any)}
                      </span>
                    </div>
                    {i < statusOrder.length - 1 && <div style={{ height:2, background: i < currentStep ? 'var(--primary-light)' : 'var(--border)', flex:1, margin:'0 -15px', marginBottom:20 }} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Details Grid */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              {[
                { label:t('category'), value:`${catIcons[complaint.category]} ${t(complaint.category as any)}` },
                { label:t('department'), value: complaint.department || t('autoRouting') },
                { label:t('priority'), value: t(complaint.priority?.toLowerCase() as any) || complaint.priority },
                { label:t('submitted'), value: new Date(complaint.createdAt).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'}) },
                { label:t('deadline'), value: complaint.slaDeadline ? new Date(complaint.slaDeadline).toLocaleDateString('en-IN') : 'N/A' },
                { label:t('assignedTo'), value: complaint.assignedTo?.name || t('notYetAssigned') },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding:'10px 14px', background:'rgba(255,255,255,0.02)', borderRadius:10, border:'1px solid var(--border)' }}>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:3 }}>{label}</div>
                  <div style={{ fontSize:13, color:'var(--text-primary)', fontWeight:500, textTransform:'capitalize' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="glass-card" style={{ padding:24, marginBottom:16 }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text-secondary)', marginBottom:12 }}>📝 {t('description')}</h3>
            <p style={{ fontSize:14, color:'var(--text-primary)', lineHeight:1.7 }}>{complaint.description}</p>
          </div>

          {/* Location */}
          {complaint.location?.address && (
            <div className="glass-card" style={{ padding:24, marginBottom:16 }}>
              <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text-secondary)', marginBottom:12 }}>📍 {t('locationMedia').split('&')[0]}</h3>
              <p style={{ fontSize:14, color:'var(--text-primary)' }}>{complaint.location.address}</p>
              {complaint.location.village && <p style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>{t('village')}: {complaint.location.village} {complaint.location.district && `· ${t('district')}: ${complaint.location.district}`}</p>}
              {complaint.location.lat && <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:4, fontFamily:'monospace' }}>GPS: {complaint.location.lat.toFixed(6)}, {complaint.location.lng.toFixed(6)}</p>}
            </div>
          )}

          {/* Media & Images */}
          {(complaint.media?.length > 0 || complaint.beforeImage || complaint.afterImage) && (
            <div className="glass-card" style={{ padding:24, marginBottom:16 }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:20 }}>
                {complaint.beforeImage && (
                  <div>
                    <h3 style={{ fontSize:13, fontWeight:700, color:'var(--text-secondary)', marginBottom:8 }}>📸 {t('initialPhoto')}</h3>
                    <a href={`${API_BASE}${complaint.beforeImage}`} target="_blank" rel="noreferrer">
                      <img src={`${API_BASE}${complaint.beforeImage}`} style={{ width:'100%', height:160, objectFit:'cover', borderRadius:12, border:'1px solid var(--border)' }} />
                    </a>
                  </div>
                )}
                {complaint.afterImage && (
                  <div>
                    <h3 style={{ fontSize:13, fontWeight:700, color:'#22c55e', marginBottom:8 }}>✅ {t('resolutionPhoto')}</h3>
                    <a href={`${API_BASE}${complaint.afterImage}`} target="_blank" rel="noreferrer">
                      <img src={`${API_BASE}${complaint.afterImage}`} style={{ width:'100%', height:160, objectFit:'cover', borderRadius:12, border:'2px solid var(--success)' }} />
                    </a>
                  </div>
                )}
              </div>
              
              {complaint.media?.length > 0 && (
                <div style={{ marginTop: complaint.beforeImage || complaint.afterImage ? 20 : 0 }}>
                  <h3 style={{ fontSize:13, fontWeight:700, color:'var(--text-secondary)', marginBottom:8 }}>📷 {t('attachedMedia')}</h3>
                  <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                    {complaint.media.map((m: any, i: number) => (
                      <a key={i} href={`${API_BASE}${m.url}`} target="_blank" rel="noreferrer">
                        <img src={`${API_BASE}${m.url}`} style={{ width:80, height:60, objectFit:'cover', borderRadius:8, border:'1px solid var(--border)' }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Citizen Details (Only for Admins/Officers) */}
          {(user?.role === 'admin' || user?.role === 'panchayat_secretary' || user?.role === 'officer') && (
             <div className="glass-card" style={{ padding:24, marginBottom:16, borderLeft: '4px solid var(--accent)' }}>
                <h3 style={{ fontSize:14, fontWeight:700, color:'var(--accent)', marginBottom:12 }}>👤 {t('reporterContactDetails')}</h3>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                  <div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>{t('fullName')}</div>
                    <div style={{ fontSize:14, color:'var(--text-primary)', fontWeight:600 }}>{complaint.citizen?.name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>{t('mobileNumber')}</div>
                    <div style={{ fontSize:14, color:'var(--text-primary)', fontWeight:600 }}>📞 {complaint.citizen?.mobile}</div>
                  </div>
                  {complaint.citizen?.email && (
                    <div>
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>{t('emailAddr')}</div>
                      <div style={{ fontSize:14, color:'var(--text-primary)' }}>📧 {complaint.citizen.email}</div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>{t('village')} / {t('district')}</div>
                    <div style={{ fontSize:14, color:'var(--text-primary)' }}>📍 {complaint.citizen?.village?.name || (typeof complaint.citizen?.village === 'string' ? complaint.citizen.village : '—')}{complaint.citizen?.district && `, ${typeof complaint.citizen.district === 'object' ? (complaint.citizen.district as any).name : complaint.citizen.district}`}</div>
                  </div>
                </div>
             </div>
          )}

          {/* Resolution Approval (for citizen) */}
          {complaint.status === 'resolved' && complaint.resolutionApproval?.status === 'pending' && user?.role === 'citizen' && complaint.citizen?._id === user._id && (
            <div className="glass-card" style={{ padding:24, marginBottom:16, border:'1px solid rgba(34,197,94,0.3)' }}>
              <h3 style={{ fontSize:15, fontWeight:700, color:'#22c55e', marginBottom:12 }}>✅ {t('confirmResolution')}</h3>
              <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>{t('confirmResolutionDesc')}</p>
              <textarea value={feedback} onChange={e => setFeedback(e.target.value)} className="input-field" placeholder={t('optionalFeedback')} rows={3} style={{ marginBottom:14, resize:'none' }} />
              <div style={{ display:'flex', gap:12 }}>
                <button onClick={() => handleApproval(true)} className="btn-primary" disabled={approvingResolution} style={{ background:'linear-gradient(135deg,#22c55e,#16a34a)' }}>✅ {t('yesResolved')}</button>
                <button onClick={() => handleApproval(false)} className="btn-ghost" disabled={approvingResolution} style={{ borderColor:'#ef4444', color:'#ef4444' }}>❌ {t('notResolved')}</button>
              </div>
            </div>
          )}

          {/* Escalation Info */}
          {complaint.escalation?.level !== 'none' && (
            <div className="glass-card" style={{ padding:20, marginBottom:16, border:'1px solid rgba(249,115,22,0.3)', background:'rgba(249,115,22,0.05)' }}>
              <h3 style={{ fontSize:14, fontWeight:700, color:'#f97316', marginBottom:8 }}>🚨 {t('escalated')}</h3>
              <p style={{ fontSize:13, color:'var(--text-muted)' }}>Level: <span style={{ color:'#f97316', fontWeight:600, textTransform:'capitalize' }}>{complaint.escalation.level}</span> {t('officer')}</p>
              <p style={{ fontSize:13, color:'var(--text-muted)' }}>{t('description')}: {complaint.escalation.reason}</p>
              <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>{t('deadline')}: {new Date(complaint.escalation.triggeredAt).toLocaleDateString('en-IN')}</p>
            </div>
          )}

          {/* Status Timeline */}
          <div className="glass-card" style={{ padding:24, marginBottom:16 }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text-secondary)', marginBottom:16 }}>📅 {t('activityTimeline')}</h3>
            <div>
              {complaint.statusHistory?.slice().reverse().map((h: any, i: number) => (
                <div key={i} className="timeline-item">
                  <div className={`timeline-dot ${i === 0 ? 'active':''}`} style={{ width:18, height:18 }} />
                  <div style={{ paddingLeft:8 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', textTransform:'capitalize' }}>{t(h.status === 'in_progress' ? 'inProgress' : h.status as any)}</div>
                    <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{h.note}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                      {h.changedBy?.name && `By ${h.changedBy.name} · `}{new Date(h.changedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Remarks */}
          <div className="glass-card" style={{ padding:24, marginBottom:16 }}>
            <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text-secondary)', marginBottom:16 }}>💬 {t('remarksComments')}</h3>
            {complaint.remarks?.length > 0 ? (
              <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:16 }}>
                {complaint.remarks.map((r: any, i: number) => (
                  <div key={i} style={{ padding:'12px 16px', background:'rgba(255,255,255,0.02)', borderRadius:12, border:'1px solid var(--border)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between',marginBottom:6 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{r.addedBy?.name || t('anonymous')}</span>
                      <span style={{ fontSize:11, color:'var(--text-muted)' }}>
                        <span style={{ textTransform:'capitalize', color:'var(--text-secondary)', marginRight:8 }}>{t(r.role as any)}</span>
                        {new Date(r.addedAt).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <p style={{ fontSize:13, color:'var(--text-muted)' }}>{r.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>{t('noRemarks')}</p>
            )}
            <div style={{ display:'flex', gap:12 }}>
              <input value={remark} onChange={e => setRemark(e.target.value)} className="input-field" placeholder={t('addRemarkPlaceholder')} onKeyDown={e => e.key === 'Enter' && handleRemark()} />
              <button onClick={handleRemark} className="btn-primary" disabled={submittingRemark || !remark.trim()} style={{ whiteSpace:'nowrap' }}>
                {submittingRemark ? '...' : t('send')}
              </button>
            </div>
          </div>
        </div>
      </main>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
