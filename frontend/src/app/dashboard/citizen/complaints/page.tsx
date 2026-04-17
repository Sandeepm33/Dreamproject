'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

const catIcons: Record<string,string> = { water:'💧', roads:'🛣️', electricity:'⚡', sanitation:'🧹', others:'📋' };
const STATUS_OPTIONS = ['all','pending','assigned','in_progress','resolved','rejected','escalated'];

export default function CitizenComplaintsPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [dataLoading, setDataLoading] = useState(true);

  const fetchComplaints = useCallback(async () => {
    setDataLoading(true);
    try {
      const params: any = { page, limit: 10, sortBy: 'createdAt', order: 'desc', isMine: 'true' };
      if (status !== 'all') params.status = status;
      if (search) params.search = search;
      const res = await api.getComplaints(params);
      setComplaints(res.complaints || []);
      setTotal(res.total || 0);
    } catch (e) { console.error(e); }
    finally { setDataLoading(false); }
  }, [page, status, search]);

  useEffect(() => { if (user) fetchComplaints(); }, [user, fetchComplaints]);

  const handleVote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.vote(id);
      setComplaints(prev => prev.map(c => c._id === id ? { ...c, voteCount: res.voteCount, voted: res.voted } : c));
    } catch {}
  };

  return (
    <div className="animate-fade-in">
      <div className="layout-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Poppins', color: 'var(--text-primary)' }}>{t('myComplaints')}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 2 }}>{t('totalComplaints').replace('{count}', total.toString())}</p>
          </div>
          <button onClick={() => router.push('/dashboard/citizen/new-complaint')} className="btn-accent" style={{ fontSize: 13 }}>➕ {t('raiseNewIssue')}</button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="input-field" placeholder={t('searchPlaceholder')} style={{ maxWidth: 280 }} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {STATUS_OPTIONS.map(s => (
              <button key={s} onClick={() => { setStatus(s); setPage(1); }} style={{
                padding: '8px 14px', borderRadius: 20, border: '1px solid', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                borderColor: status === s ? 'var(--primary-light)' : 'var(--border)',
                background: status === s ? 'rgba(45,106,79,0.2)' : 'transparent',
                color: status === s ? 'var(--text-primary)' : 'var(--text-muted)',
                textTransform: 'capitalize'
              }}>{t(s === 'in_progress' ? 'inProgress' : s as any)}</button>
            ))}
          </div>
        </div>

        {dataLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[...Array(5)].map((_,i) => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 14 }} />)}
          </div>
        ) : complaints.length === 0 ? (
          <div className="glass-card" style={{ padding: '60px', textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📭</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>{t('noComplaints')}</p>
            <button onClick={() => router.push('/dashboard/citizen/new-complaint')} className="btn-primary" style={{ marginTop: 16 }}>{t('raiseFirstIssue')}</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {complaints.map(c => (
              <div key={c._id} className="glass-card glass-card-hover" style={{ padding: '18px 22px', cursor: 'pointer' }}
                onClick={() => router.push(`/dashboard/citizen/complaints/${c._id}`)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 18 }}>{catIcons[c.category] || '📋'}</span>
                      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <code style={{ fontSize: 11, color: 'var(--accent)', background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: 4 }}>{c.complaintId}</code>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>📅 {new Date(c.createdAt).toLocaleDateString('en-IN')}</span>
                      {c.location?.address && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>📍 {c.location.address}</span>}
                      {c.department && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>🏢 {c.department}</span>}
                    </div>
                    {c.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' as any }}>{c.description}</p>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                    <span className={`badge badge-${c.status === 'in_progress' ? 'inprogress' : c.status}`}>{t(c.status === 'in_progress' ? 'inProgress' : c.status as any)}</span>
                    <button className={`vote-btn ${c.voted ? 'voted' : ''}`} onClick={(e) => handleVote(c._id, e)}>
                      👍 {c.voteCount}
                    </button>
                  </div>
                </div>
                {/* Progress bar for status */}
                <div style={{ marginTop: 12 }}>
                  {['pending','assigned','in_progress','resolved'].map((s, idx, arr) => {
                    const currentIdx = arr.indexOf(c.status);
                    const isActive = idx <= currentIdx;
                    return null;
                  })}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {[['pending', 'pending'], ['assigned', 'assigned'], ['in_progress', 'inProgress'], ['resolved', 'resolved']].map(([sKey, tKey], i) => {
                      const statusOrder = ['pending', 'assigned', 'in_progress', 'resolved'];
                      const current = statusOrder.indexOf(c.status);
                      return (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                          <div style={{ width: '100%', height: 3, borderRadius: 2, background: i <= current && current >= 0 ? 'var(--primary-light)' : 'var(--border)' }} />
                          <span style={{ fontSize: 9, color: i <= current && current >= 0 ? 'var(--text-secondary)' : 'var(--text-muted)' }}>{t(tKey as any)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 10 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="btn-ghost" style={{ fontSize: 13 }}>← {t('prev')}</button>
            <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: 13 }}>{t('page')} {page} {t('of')} {Math.ceil(total/10)}</span>
            <button onClick={() => setPage(p => p+1)} disabled={page >= Math.ceil(total/10)} className="btn-ghost" style={{ fontSize: 13 }}>{t('next')} →</button>
          </div>
        )}
    </div>
  );
}
