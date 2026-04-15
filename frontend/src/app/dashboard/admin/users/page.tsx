'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

export default function AdminUsersPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [dataLoading, setDataLoading] = useState(true);
  const [newOfficerModal, setNewUserModal] = useState(false);
  const [userForm, setUserForm] = useState({ name:'', mobile:'', password:'', role: '', department:'', village: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && (!user || !['admin','panchayat_secretary','collector'].includes(user.role))) router.replace('/login');
  }, [user, loading, router]);

  const fetchUsers = useCallback(async () => {
    setDataLoading(true);
    try {
      const params: any = {};
      if (role !== 'all') params.role = role;
      if (search) params.search = search;
      const res = await api.getUsers(params);
      setUsers(res.users || []);
      setTotal(res.total || 0);
    } catch {}
    finally { setDataLoading(false); }
  }, [role, search]);

  useEffect(() => { if (user) fetchUsers(); }, [user, fetchUsers]);

  const handleToggle = async (id: string) => {
    try {
      await api.toggleUser(id);
      fetchUsers();
    } catch {}
  };

  const handleCreateUser = async () => {
    if (!userForm.name || !userForm.mobile || !userForm.password || !userForm.role) { setError('Fill all essential fields'); return; }
    setCreating(true);
    try {
      await api.createUser(userForm);
      setNewUserModal(false);
      setUserForm({ name:'', mobile:'', password:'', role:'', department:'', village:'' });
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally { setCreating(false); }
  };

  const roleColors: Record<string,string> = { citizen:'#22c55e', admin:'#f59e0b', officer:'#0ea5e9', panchayat_secretary:'#a855f7', collector:'#e11d48' };

  if (loading || !user) return null;

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg-dark)' }}>
      <Sidebar />
      <main style={{ flex:1, marginLeft:280, padding:'28px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <div>
            <h1 style={{ fontSize:24, fontWeight:800, fontFamily:'Poppins', color:'var(--text-primary)' }}>{t('manageUsers')}</h1>
            <p style={{ color:'var(--text-muted)', fontSize:14 }}>{t('totalUsersCount').replace('{count}', total.toString())}</p>
          </div>
          <button onClick={() => { setNewUserModal(true); setError(''); }} className="btn-primary" style={{ fontSize:13 }}>➕ {t('addUser')}</button>
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} className="input-field" placeholder={t('searchByUserNamePlaceholder')} style={{ maxWidth:280 }} />
          {(user.role === 'collector' ? ['all', 'panchayat_secretary'] : ['all','citizen','officer','admin','panchayat_secretary','collector']).map(r => (
            <button key={r} onClick={() => setRole(r)} style={{ padding:'8px 14px', borderRadius:20, border:'1px solid', fontSize:12, fontWeight:600, cursor:'pointer', textTransform:'capitalize',
              borderColor: role===r ? (roleColors[r]||'var(--primary-light)') : 'var(--border)',
              background: role===r ? `${roleColors[r] || 'var(--primary-light)'}18` : 'transparent',
              color: role===r ? (roleColors[r]||'var(--text-primary)') : 'var(--text-muted)' }}>
              {r === 'all' ? t('allUsers') : t(r as any)}
            </button>
          ))}
        </div>

        <div className="glass-card" style={{ overflow:'hidden' }}>
          <table className="data-table">
            <thead>
              <tr><th>{t('name')}</th><th>{t('mobile')}</th><th>{t('role')}</th><th>{t('village')}</th><th>{t('department')}</th><th>{t('status')}</th><th>{t('joined')}</th><th>{t('actions')}</th></tr>
            </thead>
            <tbody>
              {dataLoading ? [...Array(8)].map((_,i) => (
                <tr key={i}>{[...Array(8)].map((_,j) => <td key={j}><div className="skeleton" style={{ height:20, borderRadius:4 }} /></td>)}</tr>
              )) : users.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign:'center', padding:'60px 0', color:'var(--text-muted)' }}>{t('noComplaints')}</td></tr>
              ) : users.map(u => (
                <tr key={u._id}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:32,height:32,borderRadius:'50%',background:`${roleColors[u.role]||'var(--primary-light)'}20`,border:`1px solid ${roleColors[u.role]||'var(--primary-light)'}40`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:roleColors[u.role] }}>
                        {u.name?.[0]?.toUpperCase()}
                      </div>
                      <span style={{ fontSize:13,fontWeight:500 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ fontSize:13,fontFamily:'monospace' }}>{u.mobile}</td>
                  <td><span style={{ fontSize:11,padding:'3px 10px',borderRadius:20,background:`${roleColors[u.role]||'#94a3b8'}18`,color:roleColors[u.role]||'#94a3b8',fontWeight:600,textTransform:'capitalize' }}>{t(u.role as any)}</span></td>
                  <td style={{ fontSize:13,color:'var(--text-muted)' }}>{u.village || '—'}</td>
                  <td style={{ fontSize:13,color:'var(--text-muted)' }}>{t(u.department as any) || u.department || '—'}</td>
                  <td>
                    <span style={{ fontSize:11,padding:'3px 10px',borderRadius:20,background:u.isActive?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.1)',color:u.isActive?'#22c55e':'#ef4444',border:`1px solid ${u.isActive?'rgba(34,197,94,0.3)':'rgba(239,68,68,0.3)'}` }}>
                      {u.isActive ? `● ${t('active')}` : `○ ${t('inactive')}`}
                    </span>
                  </td>
                  <td style={{ fontSize:12,color:'var(--text-muted)' }}>{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                  <td>
                    <button onClick={() => handleToggle(u._id)} className="btn-ghost" style={{ fontSize:11,padding:'5px 10px',color:u.isActive?'#ef4444':'#22c55e',borderColor:u.isActive?'rgba(239,68,68,0.3)':'rgba(34,197,94,0.3)' }}>
                      {u.isActive ? t('deactivate') : t('activate')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {newOfficerModal && (
        <div className="modal-overlay" onClick={() => setNewUserModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize:18,fontWeight:700,color:'var(--text-primary)',marginBottom:20 }}>➕ {user.role === 'collector' ? '🏛️ Add New Panchayat Secretary' : user.role === 'panchayat_secretary' ? t('addNewAdminStaff') : t('addNewStaffCitizen')}</h2>
            <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
              <div><label className="label">{t('fullName')}</label><input value={userForm.name} onChange={e => setUserForm(f => ({...f,name:e.target.value}))} className="input-field" placeholder={t('fullNamePlaceholder')} /></div>
              <div><label className="label">{t('mobileNumber')}</label><input value={userForm.mobile} onChange={e => setUserForm(f => ({...f,mobile:e.target.value}))} className="input-field" placeholder={t('mobileNumber')} /></div>
              <div><label className="label">{t('password')}</label><input type="password" value={userForm.password} onChange={e => setUserForm(f => ({...f,password:e.target.value}))} className="input-field" placeholder={t('password')} /></div>
              
              <div>
                <label className="label">{t('role')}</label>
                <select value={userForm.role} onChange={e => setUserForm(f => ({...f,role:e.target.value}))} className="input-field">
                  <option value="">{t('selectRole')}</option>
                   {user.role === 'collector' ? (
                    <option value="panchayat_secretary">👑 Panchayat Secretary</option>
                  ) : (
                    <>
                      {user.role === 'panchayat_secretary' && <option value="admin">🛡️ {t('admin')}</option>}
                      <option value="officer">👨‍💼 {t('officer')}</option>
                      <option value="citizen">👤 {t('citizen')}</option>
                    </>
                  )}
                </select>
              </div>

              {userForm.role === 'officer' && (
                <div><label className="label">{t('department')}</label>
                  <select value={userForm.department} onChange={e => setUserForm(f => ({...f,department:e.target.value}))} className="input-field">
                    <option value="">{t('chooseOfficer')}</option>
                    <option value="Water Department">💧 {t('water')}</option>
                    <option value="Panchayat">🛣️ {t('roads')}</option>
                    <option value="Electricity Department">⚡ {t('electricity')}</option>
                    <option value="Sanitation Department">🧹 {t('sanitation')}</option>
                    <option value="General">📋 {t('others')}</option>
                  </select>
                </div>
              )}
              {(userForm.role === 'admin' || userForm.role === 'citizen') && (
                <div><label className="label">{t('village')}</label><input value={userForm.village} onChange={e => setUserForm(f => ({...f,village:e.target.value}))} className="input-field" placeholder={t('villagePlaceholder')} /></div>
              )}
              
              {error && <div style={{ color:'#ef4444',fontSize:13,background:'rgba(239,68,68,0.1)',padding:'8px 12px',borderRadius:8 }}>⚠️ {t(error as any) || error}</div>}
              <div style={{ display:'flex',gap:12 }}>
                <button onClick={handleCreateUser} className="btn-primary" disabled={creating}>{creating ? `${t('creating')}...` : `✅ ${t('createUser')}`}</button>
                <button onClick={() => setNewUserModal(false)} className="btn-ghost">{t('cancel')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
