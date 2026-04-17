'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

const catIcons: Record<string,string> = { water:'💧', roads:'🛣️', electricity:'⚡', sanitation:'🧹', others:'📋' };
const STATUS_OPTIONS = ['all','pending','assigned','in_progress','resolved','rejected','escalated'];
const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api','') || 'http://localhost:5000';

export default function AdminComplaintsPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [officers, setOfficers] = useState<any[]>([]);
  const [assignModal, setAssignModal] = useState<any>(null);
  const [assignOfficer, setAssignOfficer] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [isMine, setIsMine] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user || !['admin', 'panchayat_secretary', 'collector'].includes(user.role)) {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  const fetchComplaints = useCallback(async (active = { current: true }) => {
    setDataLoading(true);
    try {
      const params: any = { page, limit: 15, sortBy: 'createdAt', order: 'desc' };
      if (status !== 'all') params.status = status;
      if (category !== 'all') params.category = category;
      if (search) params.search = search;
      if (isMine) params.isMine = 'true';
      const res = await api.getComplaints(params);
      if (active.current) {
        setComplaints(res.complaints || []);
        setTotal(res.total || 0);
      }
    } catch (err) {
      console.error('Fetch complaints error:', err);
    } finally {
      if (active.current) setDataLoading(false);
    }
  }, [page, status, category, search, isMine]);

  useEffect(() => {
    const active = { current: true };
    if (user) fetchComplaints(active);
    return () => { active.current = false; };
  }, [user, fetchComplaints]);

  useEffect(() => {
    api.getOfficers().then(r => setOfficers(r.officers || [])).catch(() => {});
  }, []);

  const handleAssign = async () => {
    if (!assignOfficer || !assignModal) return;
    setAssigning(true);
    try {
      const officer = officers.find(o => o._id === assignOfficer);
      await api.assignComplaint(assignModal._id, { officerId: assignOfficer, department: officer?.department || 'General' });
      setAssignModal(null);
      setAssignOfficer('');
      fetchComplaints();
    } catch {}
    finally { setAssigning(false); }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await api.updateStatus(id, { status: newStatus, note: `Status updated to ${newStatus} by admin` });
      fetchComplaints();
    } catch {}
  };

  if (loading || !user) return null;

  return (
    <div className="animate-fade-in">
      <div className="layout-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <div>
            <h1 style={{ fontSize:24, fontWeight:800, fontFamily:'Poppins', color:'var(--text-primary)' }}>{t('allComplaints')}</h1>
            <p style={{ color:'var(--text-muted)', fontSize:14, marginTop:2 }}>{t('totalComplaints').replace('{count}', total.toString())}</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => router.push('/dashboard/citizen/new-complaint')} className="btn-accent" style={{ fontSize: 13 }}>➕ {t('newComplaint')}</button>
            <button onClick={() => fetchComplaints()} className="btn-ghost" style={{ fontSize:13 }}>🔄 {t('refresh')}</button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="input-field" placeholder={t('searchComplaintsPlaceholder')} style={{ maxWidth:260 }} />
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input-field" style={{ width:'auto', minWidth:140 }}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === 'all' ? t('allStatus') : t(s === 'in_progress' ? 'inProgress' : s as any)}</option>)}
          </select>
          <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} className="input-field" style={{ width:'auto', minWidth:140 }}>
            <option value="all">{t('allCategories')}</option>
            {['water','roads','electricity','sanitation','others'].map(c => <option key={c} value={c}>{catIcons[c]} {t(c as any)}</option>)}
          </select>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, background: isMine ? 'rgba(168, 85, 247, 0.1)' : 'transparent', padding: '6px 12px', borderRadius: 8, border: '1px solid', borderColor: isMine ? 'var(--primary-light)' : 'var(--border)' }}>
              <input type="checkbox" checked={isMine} onChange={e => { setIsMine(e.target.checked); setPage(1); }} style={{ cursor: 'pointer' }} />
              <span style={{ color: isMine ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: isMine ? 600 : 400 }}>👤 {t('myComplaints')}</span>
            </label>
          </div>
        </div>

        {/* Table */}
        <div className="table-container">
          <div style={{ overflowX:'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('id')}</th><th>{t('title')}</th><th>{t('media')}</th><th>{t('category')}</th><th>{t('citizen')}</th><th>{t('dept')}</th><th>{t('status')}</th><th>{t('votes')}</th><th>{t('filedOn')}</th><th>{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {dataLoading ? (
                  [...Array(8)].map((_,i) => (
                    <tr key={i}>{[...Array(10)].map((_,j) => <td key={j}><div className="skeleton" style={{ height:20, borderRadius:4 }} /></td>)}</tr>
                  ))
                ) : complaints.length === 0 ? (
                  <tr><td colSpan={10} style={{ textAlign:'center', padding:'60px 0', color:'var(--text-muted)' }}>📭 {t('noComplaints')}</td></tr>
                ) : complaints.map(c => (
                  <tr key={c._id} style={{ cursor:'pointer' }}>
                    <td onClick={() => router.push(`/dashboard/admin/complaints/${c._id}`)}>
                      <code style={{ fontSize:11, color:'var(--accent)', background:'rgba(245,158,11,0.1)', padding:'2px 6px', borderRadius:4 }}>{c.complaintId}</code>
                    </td>
                    <td onClick={() => router.push(`/dashboard/admin/complaints/${c._id}`)} style={{ maxWidth:150, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.title}</td>
                    <td>
                      {(c.beforeImage || c.afterImage || c.media?.[0]?.url) ? (
                        <div style={{ width:40, height:30, borderRadius:4, overflow:'hidden', border:'1px solid var(--border)' }}>
                          <img src={`${API_BASE}${c.afterImage || c.beforeImage || c.media[0].url}`} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                        </div>
                      ) : <span style={{ color:'var(--text-muted)', fontSize:10 }}>{t('noMedia')}</span>}
                    </td>
                    <td><span style={{ fontSize:13 }}>{catIcons[c.category]} {t(c.category as any)}</span></td>
                    <td style={{ fontSize:13 }}>
                      <div>{c.citizen?.name}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>{c.citizen?.mobile} · {c.citizen?.village?.name || (typeof c.citizen?.village === 'string' ? c.citizen.village : '—')}</div>
                    </td>
                    <td style={{ fontSize:12, color:'var(--text-muted)' }}>{t(c.department as any) || c.department || '—'}</td>
                    <td>
                      <select value={c.status} onChange={e => handleStatusChange(c._id, e.target.value)}
                        onClick={e => e.stopPropagation()}
                        className={`badge badge-${c.status === 'in_progress' ? 'inprogress' : c.status}`}
                        style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:11 }}>
                        {['pending','assigned','in_progress','resolved','rejected','escalated'].map(s =>
                          <option key={s} value={s} style={{ background:'var(--bg-card)', color:'var(--text-primary)' }}>{t(s === 'in_progress' ? 'inProgress' : s as any)}</option>
                        )}
                      </select>
                    </td>
                    <td style={{ color:'var(--accent)', fontSize:13 }}>👍 {c.voteCount}</td>
                    <td style={{ fontSize:12, color:'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleDateString('en-IN')}</td>
                    <td>
                      <button onClick={e => { e.stopPropagation(); setAssignModal(c); setAssignOfficer(c.assignedTo?._id || ''); }}
                        className="btn-ghost" style={{ fontSize:11, padding:'6px 10px', whiteSpace:'nowrap' }}>
                        🎯 {t('assign')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {total > 15 && (
          <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:20 }}>
            <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="btn-ghost" style={{ fontSize:13 }}>← {t('prev')}</button>
            <span style={{ display:'flex',alignItems:'center',color:'var(--text-muted)',fontSize:13 }}>{t('page')} {page} {t('of')} {Math.ceil(total/15)}</span>
            <button onClick={() => setPage(p => p+1)} disabled={page>=Math.ceil(total/15)} className="btn-ghost" style={{ fontSize:13 }}>{t('next')} →</button>
          </div>
        )}

      {/* Assign Modal */}
      {assignModal && (
        <div className="modal-overlay" onClick={() => setAssignModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)', marginBottom:6 }}>🎯 {t('assignComplaint')}</h2>
            <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:20 }}>{assignModal.title}</p>
            <label className="label">{t('chooseOfficer')}</label>
            <select value={assignOfficer} onChange={e => setAssignOfficer(e.target.value)} className="input-field" style={{ marginBottom:20 }}>
              <option value="">— {t('chooseOfficer')} —</option>
              {officers.map(o => (
                <option key={o._id} value={o._id}>{o.name} ({t(o.role as any)}) {o.department ? `· ${t(o.department as any) || o.department}` : ''}</option>
              ))}
            </select>
            <div style={{ display:'flex', gap:12 }}>
              <button onClick={handleAssign} className="btn-primary" disabled={assigning || !assignOfficer}>{assigning ? t('assigning') : `✅ ${t('assign')}`}</button>
              <button onClick={() => setAssignModal(null)} className="btn-ghost">{t('cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
