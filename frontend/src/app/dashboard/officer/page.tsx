'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

const catIcons: Record<string,string> = { water:'💧', roads:'🛣️', electricity:'⚡', sanitation:'🧹', others:'📋' };
const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api','') || 'http://localhost:5000';

export default function OfficerDashboard() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('all');
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [updateForm, setUpdateForm] = useState({ status:'', note:'' });
  const [updating, setUpdating] = useState(false);
  const [remark, setRemark] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'officer')) router.replace('/login');
  }, [user, loading, router]);

  const fetchComplaints = useCallback(async () => {
    setDataLoading(true);
    try {
      const params: any = { sortBy:'createdAt', order:'desc', limit:50 };
      if (status !== 'all') params.status = status;
      const res = await api.getComplaints(params);
      setComplaints(res.complaints || []);
      setTotal(res.total || 0);
    } catch {}
    finally { setDataLoading(false); }
  }, [status]);

  useEffect(() => { if (user) fetchComplaints(); }, [user, fetchComplaints]);

  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'pending').length,
    inProgress: complaints.filter(c => c.status === 'in_progress').length,
    resolved: complaints.filter(c => c.status === 'resolved').length,
  };

  const handleUpdate = async () => {
    if (!selectedComplaint || !updateForm.status) return;
    setUpdating(true);
    try {
      let afterImageUrl = '';
      if (selectedFile) {
        const uploadRes = await api.uploadFiles([selectedFile]);
        if (uploadRes.success && uploadRes.files.length > 0) {
          afterImageUrl = uploadRes.files[0].url;
        }
      }

      await api.updateStatus(selectedComplaint._id, { 
        status: updateForm.status, 
        note: updateForm.note,
        afterImage: afterImageUrl
      });
      if (remark) await api.addRemark(selectedComplaint._id, remark);
      setSelectedComplaint(null);
      setUpdateForm({ status:'', note:'' });
      setRemark('');
      setSelectedFile(null);
      fetchComplaints();
    } catch {}
    finally { setUpdating(false); }
  };

  if (loading || !user) return null;

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg-dark)' }}>
      <Sidebar />
      <main style={{ flex:1, marginLeft:280, padding:'28px' }}>
        {/* Header */}
        <div style={{ marginBottom:28 }}>
          <h1 style={{ fontSize:24, fontWeight:800, fontFamily:'Poppins', color:'var(--text-primary)' }}>{t('officerDashboard')}</h1>
          <p style={{ color:'var(--text-muted)', fontSize:14, marginTop:2 }}>
            {user.department && <span>🏢 {t(user.department as any) || user.department} · </span>}{t('namaste').replace('{name}', user.name)}
          </p>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:28 }}>
          {[
            { label: t('assigned'), value:stats.total, icon:'📋', color:'#0ea5e9' },
            { label: t('pending'), value:stats.pending, icon:'⏳', color:'#f59e0b' },
            { label: t('inProgress'), value:stats.inProgress, icon:'🔧', color:'#a855f7' },
            { label: t('resolved'), value:stats.resolved, icon:'✅', color:'#22c55e' },
          ].map((s,i) => (
            <div key={i} className="stat-card" style={{ textAlign:'center' }}>
              <div style={{ fontSize:26, marginBottom:8 }}>{s.icon}</div>
              <div style={{ fontSize:28, fontWeight:800, color:s.color, fontFamily:'Poppins' }}>{s.value}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>


        {/* Filter */}
        <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
          {['all','pending','assigned','in_progress','resolved'].map(s => (
            <button key={s} onClick={() => setStatus(s)} style={{ padding:'8px 14px', borderRadius:20, border:'1px solid', fontSize:12, fontWeight:600, cursor:'pointer', textTransform:'capitalize',
              borderColor: status===s ? 'var(--primary-light)' : 'var(--border)',
              background: status===s ? 'rgba(45,106,79,0.2)' : 'transparent',
              color: status===s ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              {s === 'in_progress' ? t('inProgress') : t(s as any)}
            </button>
          ))}
          <button onClick={fetchComplaints} className="btn-ghost" style={{ fontSize:12, marginLeft:'auto' }}>🔄 {t('refresh')}</button>
        </div>

        {/* Complaints Grid */}
        {dataLoading ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
            {[...Array(6)].map((_,i) => <div key={i} className="skeleton" style={{ height:160, borderRadius:14 }} />)}
          </div>
        ) : complaints.length === 0 ? (
          <div className="glass-card" style={{ padding:'60px', textAlign:'center' }}>
            <div style={{ fontSize:56, marginBottom:16 }}>📭</div>
            <p style={{ color:'var(--text-muted)', fontSize:15 }}>{t('noComplaintsAssigned')}</p>
            <p style={{ color:'var(--text-muted)', fontSize:13, marginTop:8 }}>{t('contactAdminAssigned')}</p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:16 }}>
            {complaints.map(c => (
              <div key={c._id} className="glass-card glass-card-hover" style={{ padding:'18px 20px', cursor:'pointer' }} onClick={() => { setSelectedComplaint(c); setUpdateForm({ status:c.status, note:'' }); }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:20 }}>{catIcons[c.category] || '📋'}</span>
                    <code style={{ fontSize:11, color:'var(--accent)', background:'rgba(245,158,11,0.1)', padding:'2px 8px', borderRadius:4 }}>{c.complaintId}</code>
                  </div>
                  <span className={`badge badge-${c.status === 'in_progress' ? 'inprogress' : c.status}`}>{t(c.status === 'in_progress' ? 'inProgress' : c.status as any)}</span>
                </div>
                <h3 style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)', marginBottom:6, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.title}</h3>
                
                {/* Image Preview */}
                {(c.beforeImage || c.media?.[0]?.url) && (
                  <div style={{ marginBottom:10, borderRadius:8, overflow:'hidden', height:100, border:'1px solid var(--border)' }}>
                    <img src={`${API_BASE}${c.beforeImage || c.media[0].url}`} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  </div>
                )}

                <p style={{ fontSize:12, color:'var(--text-muted)', overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as any, marginBottom:10 }}>{c.description}</p>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>👤 {c.citizen?.name} · {c.citizen?.village?.name || (typeof c.citizen?.village === 'string' ? c.citizen.village : '—')}</div>
                    {c.location?.address && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>📍 {c.location.address}</div>}
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleDateString('en-IN')}</div>
                    {c.slaDeadline && (
                      <div style={{ fontSize:11, color: new Date(c.slaDeadline) < new Date() ? '#ef4444' : '#22c55e', marginTop:2 }}>
                        ⏰ SLA: {new Date(c.slaDeadline).toLocaleDateString('en-IN')}
                      </div>
                    )}
                  </div>
                </div>
                {c.voteCount > 0 && <div style={{ marginTop:8, fontSize:12, color:'var(--accent)' }}>👍 {c.voteCount} {t('communityVotes')}</div>}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Update Modal */}
      {selectedComplaint && (
        <div className="modal-overlay" onClick={() => setSelectedComplaint(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth:520 }}>
            <h2 style={{ fontSize:17, fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>✏️ {t('updateComplaint')}</h2>
            <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>{selectedComplaint.complaintId} · {selectedComplaint.title}</p>

            {/* Citizen Details for Officer */}
            <div style={{ background:'rgba(245,158,11,0.05)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:12, padding:'14px', marginBottom:20 }}>
              <div style={{ fontSize:11, color:'var(--accent)', fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>{t('citizenContactDetails')}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <div style={{ fontSize:10, color:'var(--text-muted)' }}>{t('reporter')}</div>
                  <div style={{ fontSize:13, color:'var(--text-primary)', fontWeight:600 }}>{selectedComplaint.citizen?.name}</div>
                </div>
                <div>
                  <div style={{ fontSize:10, color:'var(--text-muted)' }}>{t('mobileNumber')}</div>
                  <div style={{ fontSize:13, color:'var(--accent)', fontWeight:700 }}>📞 {selectedComplaint.citizen?.mobile}</div>
                </div>
                {selectedComplaint.citizen?.email && (
                  <div style={{ gridColumn:'span 2', marginTop:4 }}>
                    <div style={{ fontSize:10, color:'var(--text-muted)' }}>{t('emailAddr').replace('(Optional)','')}</div>
                    <div style={{ fontSize:12, color:'var(--text-primary)' }}>📧 {selectedComplaint.citizen.email}</div>
                  </div>
                )}
                <div style={{ gridColumn:'span 2', marginTop:4 }}>
                  <div style={{ fontSize:10, color:'var(--text-muted)' }}>{t('village')}</div>
                  <div style={{ fontSize:12, color:'var(--text-primary)' }}>📍 {selectedComplaint.citizen?.village?.name || (typeof selectedComplaint.citizen?.village === 'string' ? selectedComplaint.citizen.village : '—')}{selectedComplaint.location?.address && ` · ${selectedComplaint.location.address}`}</div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom:14 }}>
              <label className="label">{t('updateStatus')}</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                {['pending','assigned','in_progress','resolved','rejected'].map(s => (
                  <button key={s} onClick={() => setUpdateForm(f => ({...f, status:s}))}
                    style={{ padding:'8px', borderRadius:10, border:`1px solid ${updateForm.status===s ? 'var(--primary-light)' : 'var(--border)'}`,
                      background: updateForm.status===s ? 'rgba(45,106,79,0.2)' : 'transparent',
                      color: updateForm.status===s ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontSize:12, cursor:'pointer', textTransform:'capitalize', fontWeight:500 }}>
                    {s === 'in_progress' ? t('inProgress') : t(s as any)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom:14 }}>
              <label className="label">{t('statusNote')}</label>
              <input value={updateForm.note} onChange={e => setUpdateForm(f => ({...f, note:e.target.value}))} className="input-field" placeholder={t('describeUpdate')} />
            </div>

            <div style={{ marginBottom:20 }}>
              <label className="label">{t('addRemarkOptional')}</label>
              <textarea value={remark} onChange={e => setRemark(e.target.value)} className="input-field" placeholder={t('additionalRemarksCitizen')} rows={3} style={{ resize:'none' }} />
            </div>

            {updateForm.status === 'resolved' && (
              <div style={{ marginBottom:20 }}>
                <label className="label">{t('resolutionProof')}</label>
                <div style={{ border:'2px dashed var(--border)', borderRadius:12, padding:20, textAlign:'center', background:'rgba(255,255,255,0.02)' }}>
                  <input type="file" accept="image/*" onChange={e => setSelectedFile(e.target.files?.[0] || null)} style={{ display:'none' }} id="resolution-upload" />
                  <label htmlFor="resolution-upload" style={{ cursor:'pointer' }}>
                    <div style={{ fontSize:24, marginBottom:8 }}>📸</div>
                    <div style={{ fontSize:13, color:selectedFile ? 'var(--success)' : 'var(--text-secondary)' }}>
                      {selectedFile ? selectedFile.name : t('clickToUploadProof')}
                    </div>
                  </label>
                </div>
              </div>
            )}

            {updateForm.status === 'resolved' && (
              <div style={{ background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.25)', borderRadius:10, padding:'12px 14px', marginBottom:14 }}>
                <p style={{ fontSize:12, color:'#22c55e' }}>✅ {t('notifyCitizenResolution')}</p>
              </div>
            )}

            <div style={{ display:'flex', gap:12 }}>
              <button onClick={handleUpdate} className="btn-primary" disabled={updating || !updateForm.status}>
                {updating ? `⏳ ${t('updating')}...` : `✅ ${t('updateStatus')}`}
              </button>
              <button onClick={() => setSelectedComplaint(null)} className="btn-ghost">{t('cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
