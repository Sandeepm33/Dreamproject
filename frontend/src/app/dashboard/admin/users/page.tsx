'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

export default function AdminUsersPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all'); // Will be updated in useEffect based on user role

  const [dataLoading, setDataLoading] = useState(true);
  const [newOfficerModal, setNewUserModal] = useState(false);
  const [userForm, setUserForm] = useState({ name:'', mobile:'', email: '', password:'', role: '', department:'', village: '', mandal: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [villages, setVillages] = useState<any[]>([]);
  const [assignModal, setAssignModal] = useState<{userId: string, name: string} | null>(null);
  const [assignVillageId, setAssignVillageId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [mandals, setMandals] = useState<any[]>([]);
  const [formMandalId, setFormMandalId] = useState('');
  const [assignMandalId, setAssignMandalId] = useState('');

  useEffect(() => {
    if (loading) return;

    if (!user || !['admin', 'panchayat_secretary', 'collector'].includes(user.role)) {
      router.replace('/login');
      return;
    }

    // Set default role for secretary since 'all' is removed from UI
    if (user.role === 'panchayat_secretary' && role === 'all') {
      setRole('citizen');
    }

    // Fetch villages if collector
    if (user.role === 'collector') {
      const districtId = typeof (user as any).district === 'object' ? (user as any).district?._id : (user as any).district;
      if (districtId) {
        api.getVillages({ district: districtId }).then(res => setVillages(res.villages || []));
        api.getMandals({ district: districtId }).then(res => setMandals(res.mandals || []));
      }
    }
  }, [user, loading, router, role]);

  const fetchUsers = useCallback(async (active = { current: true }) => {
    setDataLoading(true);
    try {
      const params: any = {};
      if (role !== 'all') params.role = role;
      if (search) params.search = search;
      const res = await api.getUsers(params);
      if (active.current) {
        setUsers(res.users || []);
        setTotal(res.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      if (active.current) setDataLoading(false);
    }
  }, [role, search]);

  useEffect(() => {
    const active = { current: true };
    
    // Prevent redundant first-load fetch for secretaries (wait for role to be set to 'citizen')
    if (user && user.role === 'panchayat_secretary' && role === 'all') {
      return;
    }
    
    if (user) fetchUsers(active);
    
    return () => { active.current = false; };
  }, [user, fetchUsers, role]);

  const handleToggle = async (id: string) => {
    try {
      await api.toggleUser(id);
      fetchUsers();
    } catch {}
  };

  const handleCreateUser = async () => {
    if (!userForm.name || !userForm.mobile || !userForm.email || !userForm.password || !userForm.role) { 
      setError('Fill all essential fields (including email)'); 
      return; 
    }
    if (userForm.name.length < 3) {
      setError('Name must be at least 3 characters');
      return;
    }
    if (!/^\d{10}$/.test(userForm.mobile)) {
      setError('Mobile number must be exactly 10 digits');
      return;
    }
    if (userForm.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    /* Village is now optional during creation as it can be assigned later */
    
    setCreating(true);
    try {
      await api.createUser(userForm);
      setNewUserModal(false);
      setUserForm({ name:'', mobile:'', email: '', password:'', role:'', department:'', village:'', mandal:'' });
      setFormMandalId('');
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally { setCreating(false); }
  };

  const handleAssignVillage = async () => {
    if (!assignModal || !assignVillageId) return;
    setAssigning(true);
    try {
      await api.assignVillage(assignModal.userId, assignVillageId);
      setAssignModal(null);
      setAssignVillageId('');
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to assign village');
    } finally { setAssigning(false); }
  };

  const roleColors: Record<string,string> = { citizen:'#22c55e', admin:'#f59e0b', officer:'#0ea5e9', panchayat_secretary:'#a855f7', collector:'#e11d48' };

  if (loading || !user) return null;

  return (
    <div className="animate-fade-in">
      <div className="layout-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <div>
            <h1 style={{ fontSize:24, fontWeight:800, fontFamily:'Poppins', color:'var(--text-primary)' }}>{t('manageUsers')}</h1>
            <p style={{ color:'var(--text-muted)', fontSize:14 }}>{t('totalUsersCount').replace('{count}', total.toString())}</p>
          </div>
          <button onClick={() => { 
            setNewUserModal(true); 
            setError(''); 
            setFormMandalId('');
            if (user?.role === 'panchayat_secretary') {
              setUserForm(f => ({
                ...f, 
                village: (user as any).village?._id || (user as any).village,
                mandal: (user as any).mandal?._id || (user as any).mandal
              }));
            }
          }} className="btn-primary" style={{ fontSize:13 }}>➕ {t('addUser')}</button>
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} className="input-field" placeholder={t('searchByUserNamePlaceholder')} style={{ maxWidth:280 }} />
          {(
            user?.role === 'collector' ? ['all', 'panchayat_secretary'] :
            user?.role === 'panchayat_secretary' ? ['admin', 'citizen', 'officer'] :
            ['all', 'citizen', 'officer', 'admin', 'panchayat_secretary', 'collector']
          ).map(r => (
            <button key={r} onClick={() => setRole(r)} style={{ padding:'8px 14px', borderRadius:20, border:'1px solid', fontSize:12, fontWeight:600, cursor:'pointer', textTransform:'capitalize',
              borderColor: role===r ? (roleColors[r]||'var(--primary-light)') : 'var(--border)',
              background: role===r ? `${roleColors[r] || 'var(--primary-light)'}18` : 'transparent',
              color: role===r ? (roleColors[r]||'var(--text-primary)') : 'var(--text-muted)' }}>
              {r === 'all' ? t('allUsers') : t(r as any)}
            </button>
          ))}
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr><th>{t('name')}</th><th>{t('mobile')}</th><th>{t('emailAddr')}</th><th>{t('role')}</th><th>{t('mandalName')}</th><th>{t('village')}</th><th>{t('department')}</th><th>{t('status')}</th><th>{t('joined')}</th><th>{t('actions')}</th></tr>
            </thead>
            <tbody>
              {dataLoading ? [...Array(8)].map((_,i) => (
                <tr key={i}>{[...Array(9)].map((_,j) => <td key={j}><div className="skeleton" style={{ height:20, borderRadius:4 }} /></td>)}</tr>
              )) : users.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign:'center', padding:'60px 0', color:'var(--text-muted)' }}>{t('noUsersFound' as any) || 'No users found matching this criteria'}</td></tr>
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
                  <td style={{ fontSize:13 }}>{u.email || '—'}</td>
                  <td><span style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', fontSize:11,padding:'3px 10px',borderRadius:20,background:`${roleColors[u.role]||'#94a3b8'}18`,color:roleColors[u.role]||'#94a3b8',fontWeight:600,textTransform:'capitalize' }}>{t(u.role as any)}</span></td>
                  <td style={{ fontSize:13,color:'var(--text-muted)' }}>{u.mandal?.name || (u.village as any)?.mandal?.name || '—'}</td>
                  <td style={{ fontSize:13,color:'var(--text-muted)' }}>{u.village?.name || (typeof u.village === 'string' ? u.village : '—')}</td>
                  <td style={{ fontSize:13,color:'var(--text-muted)' }}>{t(u.department as any) || u.department || '—'}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', fontSize:11,padding:'3px 10px',borderRadius:20,background:u.isActive?'rgba(34,197,94,0.1)':'rgba(239,68,68,0.1)',color:u.isActive?'#22c55e':'#ef4444',border:`1px solid ${u.isActive?'rgba(34,197,94,0.3)':'rgba(239,68,68,0.3)'}` }}>
                      {u.isActive ? `● ${t('active')}` : `○ ${t('inactive')}`}
                    </span>
                  </td>
                  <td style={{ fontSize:12,color:'var(--text-muted)' }}>{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                  <td>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      <button onClick={() => handleToggle(u._id)} className="btn-ghost" style={{ fontSize:11,padding:'5px 10px',color:u.isActive?'#ef4444':'#22c55e',borderColor:u.isActive?'rgba(239,68,68,0.3)':'rgba(34,197,94,0.3)' }}>
                        {u.isActive ? t('deactivate') : t('activate')}
                      </button>
                      {user.role === 'collector' && u.role === 'panchayat_secretary' && (
                        <button 
                          onClick={() => { 
                            setAssignModal({userId: u._id, name: u.name}); 
                            setAssignVillageId(u.village?._id || ''); 
                            setAssignMandalId('');
                            setError(''); 
                          }}
                          className="btn-ghost" 
                          style={{ fontSize:11, padding:'5px 10px', color:'#a855f7', borderColor:'rgba(168,85,247,0.3)' }}
                        >
                          🏛️ {t('assignSecretary')}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      {newOfficerModal && (
        <div className="modal-overlay" onClick={() => setNewUserModal(false)}>
          <div className="modal-content" style={{ maxWidth: 650, width: '90%', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize:18,fontWeight:700,color:'var(--text-primary)',marginBottom:20 }}>➕ {user?.role === 'collector' ? `🏛️ ${t('addNewSecretary')}` : user?.role === 'panchayat_secretary' ? t('addNewAdminStaff') : t('addNewStaffCitizen')}</h2>
            <div style={{ display:'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div><label className="label">{t('fullName')}</label><input value={userForm.name} onChange={e => setUserForm(f => ({...f,name:e.target.value}))} className="input-field" placeholder={t('fullNamePlaceholder')} minLength={3} required /></div>
              <div><label className="label">{t('mobileNumber')}</label><input value={userForm.mobile} onChange={e => { const val = e.target.value.replace(/\D/g, '').slice(0, 10); setUserForm(f => ({...f,mobile:val})); }} className="input-field" placeholder={t('mobileNumber')} required minLength={10} maxLength={10} pattern="[0-9]{10}" title="10 digit mobile number" /></div>
              <div><label className="label">{t('emailAddr')}</label><input value={userForm.email} onChange={e => setUserForm(f => ({...f,email:e.target.value}))} className="input-field" placeholder={t('emailPlaceholder')} required type="email" /></div>
              <div><label className="label">{t('password')}</label><input type="password" value={userForm.password} onChange={e => setUserForm(f => ({...f,password:e.target.value}))} className="input-field" placeholder={t('password')} required minLength={6} /></div>
              
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="label">{t('role')}</label>
                <select value={userForm.role} onChange={e => setUserForm(f => ({...f,role:e.target.value}))} className="input-field">
                  <option value="">{t('selectRole')}</option>
                   {user?.role === 'collector' ? (
                    <option value="panchayat_secretary">👑 Panchayat Secretary</option>
                  ) : (
                    <>
                      {user?.role === 'panchayat_secretary' && <option value="admin">🛡️ {t('admin')}</option>}
                      <option value="officer">👨‍💼 {t('officer')}</option>
                      <option value="citizen">👤 {t('citizen')}</option>
                    </>
                  )}
                </select>
              </div>

              {userForm.role === 'officer' && (
                <div style={{ gridColumn: '1 / -1' }}><label className="label">{t('department')}</label>
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
              {((userForm.role === 'panchayat_secretary' && user?.role !== 'collector') || userForm.role === 'citizen' || userForm.role === 'admin' || userForm.role === 'officer') && user?.role !== 'panchayat_secretary' && (
                <>
                  <div>
                    <label className="label">{t('mandalName')}</label>
                    <select 
                      value={formMandalId} 
                      onChange={e => { 
                        setFormMandalId(e.target.value); 
                        setUserForm(f => ({...f, mandal: e.target.value, village:''})); 
                      }} 
                      className="input-field"
                    >
                      <option value="">{t('allMandals')}</option>
                      {mandals.map(m => (
                        <option key={m._id} value={m._id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">{t('village')}</label>
                    <select 
                      value={userForm.village} 
                      onChange={e => setUserForm(f => ({...f, village: e.target.value}))} 
                      className="input-field"
                    >
                      <option value="">{t('selectVillage')}</option>
                      {villages
                        .filter(v => !formMandalId || (v.mandal?._id || v.mandal) === formMandalId)
                        .map(v => (
                          <option key={v._id} value={v._id}>{v.name}</option>
                        ))
                      }
                    </select>
                  </div>
                </>
              )}
              
              {error && <div style={{ gridColumn: '1 / -1', color:'#ef4444',fontSize:13,background:'rgba(239,68,68,0.1)',padding:'8px 12px',borderRadius:8 }}>⚠️ {t(error as any) || error}</div>}
              <div style={{ gridColumn: '1 / -1', display:'flex',gap:12, marginTop: 10 }}>
                <button onClick={handleCreateUser} className="btn-primary" disabled={creating}>{creating ? `${t('creating')}...` : `✅ ${t('createUser')}`}</button>
                <button onClick={() => setNewUserModal(false)} className="btn-ghost">{t('cancel')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Village Modal */}
      {assignModal && (
        <div className="modal-overlay" onClick={() => setAssignModal(null)}>
          <div className="modal-content" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize:17, fontWeight:700, color:'var(--text-primary)', marginBottom:6 }}>🏛️ {t('assignSecretary')}</h2>
            <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:20 }}>Assign <strong>{assignModal.name}</strong> to a village</p>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                <label className="label">{t('mandalName') || 'Mandal'}</label>
                <select 
                  value={assignMandalId} 
                  onChange={e => { setAssignMandalId(e.target.value); setAssignVillageId(''); }} 
                  className="input-field"
                  style={{ marginBottom: 10 }}
                >
                  <option value="">{t('allMandals') || 'Select Mandal'}</option>
                  {mandals.map(m => (
                    <option key={m._id} value={m._id}>{m.name}</option>
                  ))}
                </select>
                
                <label className="label">{t('village')}</label>
                <select 
                  value={assignVillageId} 
                  onChange={e => setAssignVillageId(e.target.value)} 
                  className="input-field"
                >
                  <option value="">{t('selectVillage')}</option>
                  {villages
                    .filter(v => !assignMandalId || (v.mandal?._id || v.mandal) === assignMandalId)
                    .map(v => (
                      <option key={v._id} value={v._id}>{v.name} ({v.villageCode})</option>
                    ))
                  }
                </select>
              </div>
              {error && <div style={{ color:'#ef4444', fontSize:13, background:'rgba(239,68,68,0.1)', padding:'8px 12px', borderRadius:8 }}>⚠️ {error}</div>}
              <div style={{ display:'flex', gap:12 }}>
                <button onClick={handleAssignVillage} className="btn-primary" disabled={assigning || !assignVillageId} style={{ flex:1 }}>
                  {assigning ? `${t('assigning')}...` : `✅ ${t('assign')}`}
                </button>
                <button onClick={() => setAssignModal(null)} className="btn-ghost" style={{ flex:1 }}>{t('cancel')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
