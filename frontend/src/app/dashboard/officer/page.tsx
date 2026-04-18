'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { api } from '@/lib/api';

const catIcons: any = { water: '🚰', roads: '🛣️', electricity: '⚡', sanitation: '🧹', others: '📦' };
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function OfficerDashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('all');
  const [dataLoading, setDataLoading] = useState(true);
  const [view, setView] = useState<'complaints' | 'developments'>('complaints');
  const [devRequests, setDevRequests] = useState<any[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [showDevModal, setShowDevModal] = useState(false);
  const [newDev, setNewDev] = useState({ title: '', description: '', category: 'roads', priority: 'medium', estimatedBudget: '' });
  const [updateForm, setUpdateForm] = useState({ status:'', note:'' });
  const [updating, setUpdating] = useState(false);
  const [remark, setRemark] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (!loading && (!user || (user.role !== 'officer' && user.role !== 'panchayat_secretary'))) router.replace('/login');
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

  const fetchDevelopments = useCallback(async () => {
    setDataLoading(true);
    try {
      const res = await api.getDevelopmentRequests();
      setDevRequests(res.requests || []);
    } catch {}
    finally { setDataLoading(false); }
  }, []);

  useEffect(() => { 
    if (user) {
      if (view === 'complaints') fetchComplaints();
      else fetchDevelopments();
    }
  }, [user, fetchComplaints, fetchDevelopments, view]);

  // AUTO-REFRESH on new notification
  useEffect(() => {
    const handleRefresh = () => {
      console.log('🔄 Dashboard Refresh Triggered by FCM');
      if (view === 'complaints') fetchComplaints();
      else fetchDevelopments();
    };
    window.addEventListener('fcm-message-received', handleRefresh);
    return () => window.removeEventListener('fcm-message-received', handleRefresh);
  }, [fetchComplaints, fetchDevelopments, view]);

  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'pending').length,
    inProgress: complaints.filter(c => c.status === 'in_progress').length,
    resolved: complaints.filter(c => c.status === 'resolved').length
  };

  const handleUpdate = async () => {
    if (!selectedComplaint) return;
    setUpdating(true);
    try {
      let afterImageUrl = '';
      if (selectedFile) {
        const uploadRes = await api.uploadFiles([selectedFile]);
        if (uploadRes.success) afterImageUrl = uploadRes.files[0].url;
      }

      await api.updateStatus(selectedComplaint._id, { ...updateForm, afterImage: afterImageUrl });
      if (remark.trim()) await api.addRemark(selectedComplaint._id, remark);
      
      setSelectedComplaint(null);
      setRemark('');
      setSelectedFile(null);
      fetchComplaints();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleCreateDev = async () => {
    if (!newDev.title || !newDev.description) return;
    setUpdating(true);
    try {
      await api.createDevelopmentRequest({
        ...newDev,
        estimatedBudget: parseFloat(newDev.estimatedBudget) || 0
      });
      setShowDevModal(false);
      setNewDev({ title: '', description: '', category: 'roads', priority: 'medium', estimatedBudget: '' });
      fetchDevelopments();
    } catch {}
    finally { setUpdating(false); }
  };

  if (loading || !user) return null;

  return (
    <div className="animate-fade-in">
      <div className="layout-header" style={{ marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, fontFamily:'Poppins', color:'var(--text-primary)' }}>{t('officerDashboard')}</h1>
          <p style={{ color:'var(--text-muted)', fontSize:14, marginTop:2 }}>
            {user.department && <span>🏢 {t(user.department as any) || user.department} · </span>}{t('namaste').replace('{name}', user.name)}
          </p>
        </div>
        <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,0.05)', padding:4, borderRadius:12, border:'1px solid var(--border)' }}>
          <button onClick={() => setView('complaints')} style={{ padding:'8px 16px', borderRadius:10, fontSize:12, fontWeight:600, cursor:'pointer', border:'none',
            background: view === 'complaints' ? 'var(--primary-light)' : 'transparent',
            color: view === 'complaints' ? 'white' : 'var(--text-muted)' }}>
            📋 {t('allComplaints')}
          </button>
          <button onClick={() => setView('developments')} style={{ padding:'8px 16px', borderRadius:10, fontSize:12, fontWeight:600, cursor:'pointer', border:'none',
            background: view === 'developments' ? 'var(--primary-light)' : 'transparent',
            color: view === 'developments' ? 'white' : 'var(--text-muted)' }}>
            🏗️ {t('developmentRequests')}
          </button>
        </div>
      </div>

      {view === 'complaints' ? (
        <>
          {/* Stats */}
          <div className="stat-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px, 1fr))', gap:10, marginBottom:28 }}>
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
                  <p style={{ fontSize:12, color:'var(--text-muted)', overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as any, marginBottom:10 }}>{c.description}</p>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>👤 {c.citizen?.name} · {c.citizen?.village?.name || (typeof c.citizen?.village === 'string' ? c.citizen.village : '—')}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleDateString('en-IN')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
             <h2 style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)' }}>🏗️ {t('requestedDevelopments')}</h2>
             <button onClick={() => setShowDevModal(true)} className="btn-accent" style={{ fontSize:12 }}>➕ {t('requestDevelopment')}</button>
          </div>
          {dataLoading ? (
             <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
               {[...Array(4)].map((_,i) => <div key={i} className="skeleton" style={{ height:120, borderRadius:14 }} />)}
             </div>
          ) : devRequests.length === 0 ? (
            <div className="glass-card" style={{ padding:'60px', textAlign:'center' }}>
              <p style={{ color:'var(--text-muted)', fontSize:15 }}>{t('noData')}</p>
              <button onClick={() => setShowDevModal(true)} className="btn-ghost" style={{ marginTop:16, fontSize:12 }}>{t('requestVillageAdvancement')}</button>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(350px,1fr))', gap:16 }}>
                {devRequests.map(r => (
                  <div key={r._id} className="glass-card" style={{ padding:20 }}>
                     <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                        <code style={{ fontSize:11, color:'var(--accent)', background:'rgba(245,158,11,0.1)', padding:'2px 8px', borderRadius:4 }}>{r.requestId}</code>
                        <span className={`badge badge-${r.status==='pending'?'pending':r.status==='approved'?'resolved':'inprogress'}`} style={{ fontSize:10 }}>{r.status.toUpperCase()}</span>
                     </div>
                     <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', marginBottom:6 }}>{r.title}</h3>
                     <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:12, lineClamp:2, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as any }}>{r.description}</p>
                     <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, paddingTop:12, borderTop:'1px solid var(--border)' }}>
                        <div>
                          <div style={{ fontSize:10, color:'var(--text-muted)' }}>{t('category')}</div>
                          <div style={{ fontSize:12, color:'var(--text-primary)' }}>{r.category.replace('_',' ')}</div>
                        </div>
                        <div>
                          <div style={{ fontSize:10, color:'var(--text-muted)' }}>{t('budgetEstimate')}</div>
                          <div style={{ fontSize:12, color:'var(--accent)', fontWeight:700 }}>₹{r.estimatedBudget.toLocaleString()}</div>
                        </div>
                     </div>
                     {r.collectorNote && (
                       <div style={{ marginTop:12, padding:10, background:'rgba(14,165,233,0.05)', borderRadius:8, border:'1px solid rgba(14,165,233,0.2)' }}>
                          <div style={{ fontSize:10, color:'var(--secondary)', fontWeight:700 }}>{t('collectorNote')}</div>
                          <p style={{ fontSize:11, color:'var(--text-primary)', marginTop:2 }}>{r.collectorNote}</p>
                       </div>
                     )}
                  </div>
                ))}
            </div>
          )}
        </>
      )}

      {/* Update Complaints Modal */}
      {selectedComplaint && (
        <div className="modal-overlay" onClick={() => setSelectedComplaint(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 750, padding: '24px 32px' }}>
            <h2 style={{ fontSize:17, fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>✏️ {t('updateComplaint')}</h2>
            <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>{selectedComplaint.complaintId} · {selectedComplaint.title}</p>
            
            <div style={{ background:'rgba(245,158,11,0.05)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:12, padding:'12px 16px', marginBottom:16 }}>
              <div style={{ fontSize:11, color:'var(--accent)', fontWeight:700, textTransform:'uppercase', letterSpacing:0.5, marginBottom:10 }}>{t('citizenContactDetails')}</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 15, alignItems: 'start' }}>
                <div>
                  <div style={{ fontSize:10, color:'var(--text-muted)' }}>{t('reporter')}</div>
                  <div style={{ fontSize:13, color:'var(--text-primary)', fontWeight:600 }}>{selectedComplaint.citizen?.name}</div>
                </div>
                <div>
                  <div style={{ fontSize:10, color:'var(--text-muted)' }}>{t('mobileNumber')}</div>
                  <div style={{ fontSize:13, color:'var(--accent)', fontWeight:700 }}>📞 {selectedComplaint.citizen?.mobile}</div>
                </div>
                <div>
                  {selectedComplaint.citizen?.email ? (
                    <><div style={{ fontSize:10, color:'var(--text-muted)' }}>{t('emailAddr').replace('(Optional)','')}</div><div style={{ fontSize:12, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis' }}>📧 {selectedComplaint.citizen.email}</div></>
                  ) : <div style={{ height: 1 }}></div>}
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize:10, color:'var(--text-muted)' }}>{t('village')}</div>
                  <div style={{ fontSize:12, color:'var(--text-primary)' }}>📍 {selectedComplaint.citizen?.village?.name || (typeof selectedComplaint.citizen?.village === 'string' ? selectedComplaint.citizen.village : '—')} · {selectedComplaint.location?.address}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                  {selectedComplaint.location?.lat && (
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${selectedComplaint.location.lat},${selectedComplaint.location.lng}`} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ padding: '6px 12px', fontSize: 11, borderRadius: 8, background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>🗺️ {t('getDirections')}</a>
                  )}
                </div>
              </div>
            </div>

            <div style={{ marginBottom:14 }}>
              <label className="label">{t('status')}</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8 }}>
                {['pending','assigned','in_progress','resolved','rejected'].map(s => (
                  <button key={s} onClick={() => setUpdateForm(f => ({...f, status:s}))} style={{ padding:'8px', borderRadius:10, border:`1px solid ${updateForm.status===s ? 'var(--primary-light)' : 'var(--border)'}`, background: updateForm.status===s ? 'rgba(45,106,79,0.2)' : 'transparent', color: updateForm.status===s ? 'var(--text-primary)' : 'var(--text-muted)', fontSize:12, cursor:'pointer' }}>{s === 'in_progress' ? t('inProgress') : t(s as any)}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div><label className="label">{t('statusNote')}</label><input value={updateForm.note} onChange={e => setUpdateForm(f => ({...f, note:e.target.value}))} className="input-field" placeholder={t('describeUpdate')} /></div>
              <div><label className="label">{t('addRemarkOptional')}</label><textarea value={remark} onChange={e => setRemark(e.target.value)} className="input-field" placeholder={t('additionalRemarksCitizen')} rows={1} style={{ resize:'none' }} /></div>
            </div>

            <div style={{ display:'flex', gap:12 }}>
              <button onClick={handleUpdate} className="btn-primary" disabled={updating}>{updating ? `⏳ ${t('updating')}...` : `✅ ${t('updateStatus')}`}</button>
              {['admin', 'panchayat_secretary'].includes(user.role) && (
                <button onClick={async () => {
                  const reason = prompt(t('escalationReasonPrompt'));
                  if (reason) { setUpdating(true); try { await api.escalateComplaint(selectedComplaint._id, reason); setSelectedComplaint(null); fetchComplaints(); } catch {} finally { setUpdating(false); } }
                }} className="btn-ghost" style={{ color:'#f97316', borderColor:'rgba(249,115,22,0.3)' }}>🚨 {t('escalateToCollector')}</button>
              )}
              <button onClick={() => setSelectedComplaint(null)} className="btn-ghost">{t('cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Development Request Modal */}
      {showDevModal && (
        <div className="modal-overlay" onClick={() => setShowDevModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, padding: 24 }}>
            <h2 style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)', marginBottom:20 }}>🏗️ {t('newDevelopmentRequest')}</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
               <div>
                  <label className="label">{t('projectTitle')}</label>
                  <input value={newDev.title} onChange={e => setNewDev({...newDev, title:e.target.value})} className="input-field" placeholder={t('titlePlaceholder')}/>
               </div>
               <div>
                  <label className="label">{t('projectDescription')}</label>
                  <textarea value={newDev.description} onChange={e => setNewDev({...newDev, description:e.target.value})} className="input-field" rows={4} placeholder={t('descPlaceholder')}/>
               </div>
               <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div>
                    <label className="label">{t('category')}</label>
                    <select value={newDev.category} onChange={e => setNewDev({...newDev, category:e.target.value})} className="input-field">
                       {['roads','water','electricity','education','health','community_hall','others'].map(c => (
                         <option key={c} value={c}>{c.replace('_',' ').toUpperCase()}</option>
                       ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">{t('budgetEstimate')}</label>
                    <input type="number" value={newDev.estimatedBudget} onChange={e => setNewDev({...newDev, estimatedBudget:e.target.value})} className="input-field" placeholder="Amount"/>
                  </div>
               </div>
               <div style={{ display:'flex', gap:12, marginTop:10 }}>
                  <button onClick={handleCreateDev} className="btn-primary" style={{ flex:1 }} disabled={updating || !newDev.title}>{updating ? '...' : t('submitRequest')}</button>
                  <button onClick={() => setShowDevModal(false)} className="btn-ghost" style={{ flex:1 }}>{t('cancel')}</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
