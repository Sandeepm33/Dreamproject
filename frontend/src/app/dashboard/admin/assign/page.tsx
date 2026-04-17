'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const catIcons: Record<string,string> = { water:'💧', roads:'🛣️', electricity:'⚡', sanitation:'🧹', others:'📋' };

export default function AdminAssignPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [unassigned, setUnassigned] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [assignments, setAssignments] = useState<Record<string,string>>({});
  const [saving, setSaving] = useState<Record<string,boolean>>({});
  const [saved, setSaved] = useState<Record<string,boolean>>({});

  useEffect(() => {
    if (!loading) {
      if (!user || !['admin', 'panchayat_secretary', 'collector'].includes(user.role)) {
        router.replace('/login');
      } else if (user.role === 'collector') {
        router.replace('/dashboard/admin/users');
      }
    }
  }, [user, loading, router]);

  const fetchData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [cRes, oRes] = await Promise.all([
        api.getComplaints({ status: 'pending', limit: '50' }),
        api.getOfficers()
      ]);
      setUnassigned(cRes.complaints || []);
      setOfficers(oRes.officers || []);
    } catch {}
    finally { setDataLoading(false); }
  }, []);

  useEffect(() => { if (user) fetchData(); }, [user, fetchData]);

  const handleAssign = async (complaintId: string, id: string) => {
    const officerId = assignments[complaintId];
    if (!officerId) return;
    setSaving(s => ({...s, [complaintId]: true}));
    try {
      const officer = officers.find(o => o._id === officerId);
      await api.assignComplaint(id, { officerId, department: officer?.department || 'General' });
      setSaved(s => ({...s, [complaintId]: true}));
      setTimeout(() => {
        setSaved(s => ({...s, [complaintId]: false}));
        setUnassigned(prev => prev.filter(c => c._id !== id));
      }, 1500);
    } catch {}
    finally { setSaving(s => ({...s, [complaintId]: false})); }
  };

  const deptRecommendation: Record<string,string[]> = {
    water: ['Water Department'],
    roads: ['Panchayat'],
    electricity: ['Electricity Department'],
    sanitation: ['Sanitation Department'],
  };

  const getRecommendedOfficers = (category: string) => {
    const depts = deptRecommendation[category] || [];
    return officers.filter(o => depts.some(d => o.department?.includes(d.split(' ')[0])));
  };

  if (loading || !user) return null;

  return (
    <div className="animate-fade-in">
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:24, fontWeight:800, fontFamily:'Poppins', color:'var(--text-primary)' }}>🎯 Assign Issues</h1>
          <p style={{ color:'var(--text-muted)', fontSize:14 }}>Pending complaints awaiting officer assignment</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={fetchData} className="btn-ghost" style={{ fontSize:13 }}>🔄 Refresh</button>
          <div style={{ background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:10, padding:'8px 16px', fontSize:13, color:'var(--accent)', fontWeight:600 }}>
            ⏳ {unassigned.length} pending
          </div>
        </div>
      </div>

        {/* Smart Routing Legend */}
        <div className="glass-card" style={{ padding:16, marginBottom:24, display:'flex', gap:16, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ fontSize:13, color:'var(--text-secondary)', fontWeight:600 }}>⚡ Smart Routing:</span>
          {[
            { cat:'water', dept:'Water Dept', color:'#38bdf8' },
            { cat:'roads', dept:'Panchayat', color:'#a78bfa' },
            { cat:'electricity', dept:'Electricity Dept', color:'#fbbf24' },
            { cat:'sanitation', dept:'Sanitation Dept', color:'#34d399' },
          ].map(item => (
            <span key={item.cat} style={{ fontSize:12, color:item.color, display:'flex', alignItems:'center', gap:4 }}>
              {catIcons[item.cat]} {item.cat} → {item.dept}
            </span>
          ))}
        </div>

        {dataLoading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {[...Array(5)].map((_,i) => <div key={i} className="skeleton" style={{ height:100, borderRadius:14 }} />)}
          </div>
        ) : unassigned.length === 0 ? (
          <div className="glass-card" style={{ padding:'60px', textAlign:'center' }}>
            <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
            <p style={{ color:'var(--text-primary)', fontSize:16, fontWeight:600 }}>All caught up!</p>
            <p style={{ color:'var(--text-muted)', fontSize:13, marginTop:8 }}>No pending complaints need assignment right now.</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {unassigned.map(c => {
              const recommended = getRecommendedOfficers(c.category);
              const isSaved = saved[c.complaintId];
              return (
                <div key={c._id} className="glass-card" style={{ padding:'18px 22px', display:'grid', gridTemplateColumns:'1fr auto', gap:20, alignItems:'center', border: isSaved ? '1px solid rgba(34,197,94,0.4)' : '1px solid var(--border)', transition:'border 0.3s' }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                      <span style={{ fontSize:20 }}>{catIcons[c.category]||'📋'}</span>
                      <span style={{ fontSize:15, fontWeight:600, color:'var(--text-primary)' }}>{c.title}</span>
                      <code style={{ fontSize:11, color:'var(--accent)', background:'rgba(245,158,11,0.1)', padding:'2px 8px', borderRadius:4 }}>{c.complaintId}</code>
                    </div>
                    <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
                      <span style={{ fontSize:12, color:'var(--text-muted)' }}>👤 {c.citizen?.name} · {c.citizen?.village?.name || (typeof c.citizen?.village === 'string' ? c.citizen.village : '—')}</span>
                      {c.location?.address && <span style={{ fontSize:12, color:'var(--text-muted)' }}>📍 {c.location.address}</span>}
                      <span style={{ fontSize:12, color:'var(--accent)' }}>👍 {c.voteCount} votes</span>
                      <span style={{ fontSize:12, color:'var(--text-muted)' }}>📅 {new Date(c.createdAt).toLocaleDateString('en-IN')}</span>
                      {c.slaDeadline && <span style={{ fontSize:11, color: new Date(c.slaDeadline) < new Date() ? '#ef4444' : '#22c55e' }}>⏰ SLA: {new Date(c.slaDeadline).toLocaleDateString('en-IN')}</span>}
                    </div>
                    {recommended.length > 0 && (
                      <div style={{ marginTop:8, display:'flex', gap:6, flexWrap:'wrap' }}>
                        <span style={{ fontSize:11, color:'var(--text-muted)' }}>Recommended:</span>
                        {recommended.map(o => (
                          <button key={o._id} onClick={() => setAssignments(a => ({...a, [c.complaintId]: o._id}))}
                            style={{ fontSize:11, padding:'2px 8px', borderRadius:12, border:`1px solid ${assignments[c.complaintId]===o._id?'var(--accent)':'var(--border)'}`, background: assignments[c.complaintId]===o._id?'rgba(245,158,11,0.1)':'transparent', color: assignments[c.complaintId]===o._id?'var(--accent)':'var(--text-muted)', cursor:'pointer' }}>
                            ⚡ {o.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display:'flex', gap:10, alignItems:'center', flexShrink:0 }}>
                    <select value={assignments[c.complaintId] || ''} onChange={e => setAssignments(a => ({...a, [c.complaintId]: e.target.value}))}
                      className="input-field" style={{ minWidth:180 }}>
                      <option value="">— Select Officer —</option>
                      {officers.map(o => (
                        <option key={o._id} value={o._id}>{o.name} · {o.department || o.role}</option>
                      ))}
                    </select>
                    <button onClick={() => handleAssign(c.complaintId, c._id)} disabled={!assignments[c.complaintId] || saving[c.complaintId] || isSaved}
                      className={isSaved ? 'btn-ghost' : 'btn-primary'} style={{ whiteSpace:'nowrap', padding:'10px 20px', fontSize:13,
                        ...(isSaved ? { borderColor:'rgba(34,197,94,0.4)', color:'#22c55e' } : {}) }}>
                      {isSaved ? '✅ Assigned!' : saving[c.complaintId] ? '⏳...' : '🎯 Assign'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}
