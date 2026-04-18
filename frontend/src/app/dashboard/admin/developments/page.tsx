'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { api } from '@/lib/api';

export default function AdminDevelopments() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [collectorNote, setCollectorNote] = useState('');
  const [updating, setUpdating] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', estimatedBudget: '', category: 'roads' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !['admin', 'collector', 'panchayat_secretary'].includes(user.role))) {
       router.replace('/login');
    }
  }, [user, loading, router]);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getDevelopmentRequests();
      setRequests(res.requests || []);
    } catch {}
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { if (user) fetchRequests(); }, [user, fetchRequests]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createDevelopmentRequest({
        ...formData,
        estimatedBudget: Number(formData.estimatedBudget)
      });
      setShowAddModal(false);
      setFormData({ title: '', description: '', estimatedBudget: '', category: 'roads' });
      fetchRequests();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (status: 'approved' | 'rejected' | 'in_progress') => {
    if (!selectedReq) return;
    setUpdating(true);
    try {
      await api.updateDevelopmentStatus(selectedReq._id, { status, collectorNote });
      setSelectedReq(null);
      setCollectorNote('');
      fetchRequests();
    } catch {}
    finally { setUpdating(false); }
  };

  if (loading || !user) return null;

  return (
    <div className="animate-fade-in">
      <div className="layout-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Poppins', color: 'var(--text-primary)' }}>🏗️ {t('requestedDevelopments')}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{t('manageVillageInfrastructure')}</p>
        </div>
        {user.role === 'panchayat_secretary' && (
          <button onClick={() => setShowAddModal(true)} className="btn-accent" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            ➕ {t('requestDevelopment')}
          </button>
        )}
      </div>

      {isLoading ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:20 }}>
          {[...Array(4)].map((_,i) => <div key={i} className="skeleton" style={{ height:180, borderRadius:16 }} />)}
        </div>
      ) : requests.length === 0 ? (
        <div className="glass-card" style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏗️</div>
          <p style={{ color: 'var(--text-muted)', fontSize: 16 }}>{t('noData')}</p>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:20 }}>
          {requests.map(r => (
            <div key={r._id} className="glass-card glass-card-hover" style={{ padding: 24, cursor:'pointer' }} onClick={() => { setSelectedReq(r); setCollectorNote(r.collectorNote || ''); }}>
               <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
                  <div>
                    <code style={{ fontSize:11, color:'var(--accent)', background:'rgba(245,158,11,0.1)', padding:'2px 8px', borderRadius:4 }}>{r.requestId}</code>
                    <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>📍 {r.village?.name} · {r.district?.name}</div>
                  </div>
                  <span className={`badge badge-${r.status==='pending'?'pending':r.status==='approved'?'resolved':'inprogress'}`}>{r.status.toUpperCase()}</span>
               </div>
               <h3 style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', marginBottom:8 }}>{r.title}</h3>
               <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:20, lineClamp:3, display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical' as any }}>{r.description}</p>
               
               <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, padding:12, background:'rgba(255,255,255,0.03)', borderRadius:10 }}>
                  <div>
                    <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase' }}>{t('estimatedBudget')}</div>
                    <div style={{ fontSize:14, fontWeight:700, color:'var(--accent)' }}>₹{r.estimatedBudget.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase' }}>{t('requestedBy')}</div>
                    <div style={{ fontSize:13, color:'var(--text-primary)' }}>{r.requestedBy?.name}</div>
                  </div>
               </div>
            </div>
          ))}
        </div>
      )}

      {selectedReq && (
        <div className="modal-overlay" onClick={() => setSelectedReq(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <h2 style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', marginBottom:10 }}>🛠️ {t('reviewRequest')}</h2>
            <div style={{ marginBottom:20 }}>
               <div style={{ fontSize:11, color:'var(--accent)', fontWeight:700 }}>{selectedReq.requestId}</div>
               <h3 style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)', marginTop:4 }}>{selectedReq.title}</h3>
               <p style={{ fontSize:14, color:'var(--text-muted)', marginTop:8 }}>{selectedReq.description}</p>
            </div>

            {['admin', 'collector'].includes(user.role) ? (
              <>
                <div style={{ marginBottom:20 }}>
                   <label className="label">{t('collectorNote')}</label>
                   <textarea value={collectorNote} onChange={e => setCollectorNote(e.target.value)} className="input-field" rows={3} placeholder={t('addPrivateNote')}/>
                </div>

                 <div style={{ display:'flex', gap:12, flexWrap: 'wrap' }}>
                   <button onClick={() => handleUpdateStatus('approved')} className="btn-primary" style={{ flex:'1 1 140px' }} disabled={updating}>{t('approveProject')}</button>
                   <button onClick={() => handleUpdateStatus('in_progress')} className="btn-accent" style={{ flex:'1 1 140px' }} disabled={updating}>{t('markInProgress')}</button>
                   <button onClick={() => handleUpdateStatus('rejected')} className="btn-ghost" style={{ flex:'1 1 140px', color:'#ef4444' }} disabled={updating}>{t('reject')}</button>
                 </div>
              </>
            ) : selectedReq.collectorNote && (
              <div style={{ padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid var(--border)' }}>
                 <label className="label">{t('collectorNote')}</label>
                 <p style={{ fontSize:14, color:'var(--text-primary)' }}>{selectedReq.collectorNote}</p>
              </div>
            )}
            
            {user.role === 'panchayat_secretary' && (
              <button onClick={() => setSelectedReq(null)} className="btn-ghost" style={{ width:'100%', marginTop:20 }}>{t('close')}</button>
            )}
          </div>
        </div>
      )}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, padding: 24, maxHeight: '85vh' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>🏗️ {t('newDevelopmentRequest')}</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="label" style={{ fontSize: 12 }}>{t('projectTitle')}</label>
                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="input-field" placeholder={t('titlePlaceholder')} style={{ padding: '10px 14px' }}/>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
                <div>
                  <label className="label" style={{ fontSize: 12 }}>{t('category')}</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="input-field" style={{ padding: '10px 14px' }}>
                    <option value="roads">🏗️ {t('roads')}</option>
                    <option value="water">💧 {t('water')}</option>
                    <option value="electricity">⚡ {t('electricity')}</option>
                    <option value="sanitation">🧹 {t('sanitation')}</option>
                    <option value="others">📋 {t('others')}</option>
                  </select>
                </div>
                <div>
                  <label className="label" style={{ fontSize: 12 }}>{t('budgetEstimate')}</label>
                  <input required type="number" value={formData.estimatedBudget} onChange={e => setFormData({...formData, estimatedBudget: e.target.value})} className="input-field" placeholder="e.g. 500000" style={{ padding: '10px 14px' }}/>
                </div>
              </div>
              <div>
                <label className="label" style={{ fontSize: 12 }}>{t('projectDescription')}</label>
                <textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="input-field" rows={3} placeholder={t('descPlaceholder')} style={{ padding: '10px 14px', resize: 'none' }}/>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ flex: 1, padding: '10px' }}>{isSubmitting ? t('submitting') : t('submitRequest')}</button>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-ghost" style={{ flex: 1, padding: '10px' }}>{t('cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
