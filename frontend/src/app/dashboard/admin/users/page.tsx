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
  const [userForm, setUserForm] = useState({ name: '', mobile: '', email: '', password: '', role: '', department: '', village: '', mandal: '', district: '' });
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState('');
  const [error, setError] = useState('');
  const [villages, setVillages] = useState<any[]>([]);
  const [assignModal, setAssignModal] = useState<{ userId: string, name: string } | null>(null);
  const [assignVillageId, setAssignVillageId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [mandals, setMandals] = useState<any[]>([]);
  const [formMandalId, setFormMandalId] = useState('');
  const [assignMandalId, setAssignMandalId] = useState('');
  const [districts, setDistricts] = useState<any[]>([]);
  const [viewModal, setViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  useEffect(() => {
    if (loading) return;

    if (!user || !['admin', 'panchayat_secretary', 'collector', 'secretariat_office'].includes(user.role)) {
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

    // Fetch all districts if Secretariat or Admin
    if (user.role === 'admin' || user.role === 'secretariat_office') {
      api.getDistricts().then(res => setDistricts(res.districts || []));
      // If Secretariat, also fetch villages/mandals for their assigned district if any
      if (user.role === 'secretariat_office') {
         const dId = typeof (user as any).district === 'object' ? (user as any).district?._id : (user as any).district;
         if (dId) {
           api.getVillages({ district: dId }).then(res => setVillages(res.villages || []));
           api.getMandals({ district: dId }).then(res => setMandals(res.mandals || []));
         }
      }
    }
  }, [user, loading, router, role]);

  // Fetch mandals and villages when district changes in the form (important for Secretariat/Admin in Edit modal)
  useEffect(() => {
    if ((user?.role === 'admin' || user?.role === 'secretariat_office') && userForm.district) {
      api.getMandals({ district: userForm.district }).then(res => setMandals(res.mandals || []));
      api.getVillages({ district: userForm.district }).then(res => setVillages(res.villages || []));
    }
  }, [userForm.district, user?.role]);

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
    } catch { }
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
      // Clean up empty strings for ObjectId fields to prevent BSON errors
      const submissionData = { ...userForm };
      if (!submissionData.mandal) delete (submissionData as any).mandal;
      if (!submissionData.village) delete (submissionData as any).village;
      if (!submissionData.district) delete (submissionData as any).district;
      if (!submissionData.department) delete (submissionData as any).department;

      await api.createUser(submissionData);
      setNewUserModal(false);
      setUserForm({ name: '', mobile: '', email: '', password: '', role: '', department: '', village: '', mandal: '', district: '' });
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

  const handleUpdateUser = async () => {
    if (!userForm.name || !userForm.mobile || !userForm.email || !userForm.role) {
      setError('Name, Mobile, Email and Role are required');
      return;
    }

    setUpdating(true);
    try {
      await api.updateUser(editingUserId, userForm);
      setEditModal(false);
      setEditingUserId('');
      setUserForm({ name: '', mobile: '', email: '', password: '', role: '', department: '', village: '', mandal: '', district: '' });
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally { setUpdating(false); }
  };

  const roleColors: Record<string, string> = { citizen: '#22c55e', admin: '#f59e0b', officer: '#0ea5e9', panchayat_secretary: '#a855f7', collector: '#e11d48', secretariat_office: '#4f46e5' };

  if (loading || !user) return null;

  return (
    <div className="animate-fade-in">
      <div className="layout-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Poppins', color: 'var(--text-primary)' }}>{t('manageUsers')}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{t('totalUsersCount').replace('{count}', total.toString())}</p>
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
        }} className="btn-primary" style={{ fontSize: 13 }}>➕ {t('addUser')}</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} className="input-field" placeholder={t('searchByUserNamePlaceholder')} style={{ maxWidth: 280 }} />
        {(
          user?.role === 'secretariat_office' ? ['all', 'secretariat_office', 'collector', 'panchayat_secretary', 'officer', 'citizen'] :
          user?.role === 'collector' ? ['all', 'panchayat_secretary', 'officer', 'citizen'] :
          user?.role === 'panchayat_secretary' ? ['citizen', 'officer'] :
          ['all', 'citizen', 'officer', 'admin', 'panchayat_secretary', 'collector', 'secretariat_office']
        ).map(r => (
          <button key={r} onClick={() => setRole(r)} style={{
            padding: '8px 14px', borderRadius: 20, border: '1px solid', fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
            borderColor: role === r ? (roleColors[r] || 'var(--primary-light)') : 'var(--border)',
            background: role === r ? `${roleColors[r] || 'var(--primary-light)'}18` : 'transparent',
            color: role === r ? (roleColors[r] || 'var(--text-primary)') : 'var(--text-muted)'
          }}>
            {r === 'all' ? t('allUsers') : t(r as any)}
          </button>
        ))}
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('name')}</th>
              {!(user.role === 'collector' || user.role === 'secretariat_office') && (
                <>
                  <th>{t('mobile')}</th>
                  <th>{t('emailAddr')}</th>
                </>
              )}
              <th>{t('role')}</th>
              <th>{t('mandalName')}</th>
              <th>{t('village')}</th>
              <th>{t('department')}</th>
              <th>{t('status')}</th>
              <th>{t('joined')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {dataLoading ? [...Array(8)].map((_, i) => (
              <tr key={i}>{[...Array((user.role === 'collector' || user.role === 'secretariat_office') ? 8 : 10)].map((_, j) => <td key={j}><div className="skeleton" style={{ height: 20, borderRadius: 4 }} /></td>)}</tr>
            )) : users.length === 0 ? (
              <tr><td colSpan={(user.role === 'collector' || user.role === 'secretariat_office') ? 8 : 10} style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>{t('noUsersFound' as any) || 'No users found matching this criteria'}</td></tr>
            ) : users.map(u => (
              <tr key={u._id} onClick={() => { setSelectedUser(u); setViewModal(true); }} style={{ cursor: 'pointer' }} className="hover-row">
                <td style={{ minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${roleColors[u.role] || 'var(--primary-light)'}20`, border: `1px solid ${roleColors[u.role] || 'var(--primary-light)'}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: roleColors[u.role], flexShrink: 0 }}>
                      {u.name?.[0]?.toUpperCase()}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</span>
                  </div>
                </td>
                {!(user.role === 'collector' || user.role === 'secretariat_office') && (
                  <>
                    <td style={{ fontSize: 13, fontFamily: 'monospace', width: 130 }}>{u.mobile}</td>
                    <td style={{ fontSize: 13, width: 200 }}>{u.email || '—'}</td>
                  </>
                )}
                <td style={{ width: 140 }}><span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 100, fontSize: 10, padding: '4px 10px', borderRadius: 20, background: `${roleColors[u.role] || '#94a3b8'}18`, color: roleColors[u.role] || '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t(u.role as any)}</span></td>
                <td style={{ fontSize: 13, color: 'var(--text-muted)', minWidth: 120 }}>{u.mandal?.name || (u.village as any)?.mandal?.name || '—'}</td>
                <td style={{ fontSize: 13, color: 'var(--text-muted)', minWidth: 120 }}>{u.village?.name || (typeof u.village === 'string' ? u.village : '—')}</td>
                <td style={{ fontSize: 13, color: 'var(--text-muted)', minWidth: 150 }}>{t(u.department as any) || u.department || '—'}</td>
                <td style={{ width: 120 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', fontSize: 10, padding: '4px 12px', borderRadius: 20, background: u.isActive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: u.isActive ? '#22c55e' : '#ef4444', border: `1px solid ${u.isActive ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, fontWeight: 700, textTransform: 'uppercase' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} /> {u.isActive ? t('active') : t('inactive')}
                  </span>
                </td>
                <td style={{ fontSize: 13, color: 'var(--text-muted)', width: 110 }}>{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                <td onClick={e => e.stopPropagation()} style={{ width: 220 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {(user.role === 'admin' || 
                      (user.role === 'secretariat_office' && u.role !== 'admin' && u.role !== 'secretariat_office') || 
                      (user.role === 'collector' && (u.role === 'panchayat_secretary' || u.role === 'officer' || u.role === 'citizen')) ||
                      (user.role === 'panchayat_secretary' && (u.role === 'officer' || u.role === 'citizen'))) && (
                      <>
                        <button onClick={() => handleToggle(u._id)} className="btn-ghost" style={{ fontSize: 11, padding: '6px 12px', color: u.isActive ? '#ef4444' : '#22c55e', borderColor: u.isActive ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)', minWidth: 85 }}>
                          {u.isActive ? t('deactivate') : t('activate')}
                        </button>
                        <button onClick={() => {
                          setEditingUserId(u._id);
                          setUserForm({
                            name: u.name,
                            mobile: u.mobile,
                            email: u.email || '',
                            password: '',
                            role: u.role,
                            department: u.department || '',
                            village: u.village?._id || u.village || '',
                            mandal: u.mandal?._id || u.mandal || '',
                            district: u.district?._id || u.district || ''
                          });
                          setFormMandalId(u.mandal?._id || u.mandal || '');
                          setEditModal(true);
                          setError('');
                        }} className="btn-ghost" style={{ fontSize: 11, padding: '6px 12px', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
                          ✏️ {t('edit' as any) || 'Edit'}
                        </button>
                      </>
                    )}
                    {(user.role === 'collector' || user.role === 'secretariat_office') && u.role === 'panchayat_secretary' && (
                      <button
                        onClick={() => {
                          setAssignModal({ userId: u._id, name: u.name });
                          setAssignVillageId(u.village?._id || '');
                          setAssignMandalId('');
                          setError('');
                        }}
                        className="btn-ghost"
                        style={{ fontSize: 11, padding: '6px 12px', color: '#a855f7', borderColor: 'rgba(168,85,247,0.3)', width: '100%', marginTop: 4 }}
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
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>➕ {(user?.role === 'collector' || user?.role === 'secretariat_office') ? `🏛️ ${t('addNewSecretary')}` : user?.role === 'panchayat_secretary' ? t('addNewStaffCitizen') : t('addNewStaffCitizen')}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div><label className="label">{t('fullName')}</label><input value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder={t('fullNamePlaceholder')} minLength={3} required /></div>
              <div><label className="label">{t('mobileNumber')}</label><input value={userForm.mobile} onChange={e => { const val = e.target.value.replace(/\D/g, '').slice(0, 10); setUserForm(f => ({ ...f, mobile: val })); }} className="input-field" placeholder={t('mobileNumber')} required minLength={10} maxLength={10} pattern="[0-9]{10}" title="10 digit mobile number" /></div>
              <div><label className="label">{t('emailAddr')}</label><input value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} className="input-field" placeholder={t('emailPlaceholder')} required type="email" /></div>
              <div><label className="label">{t('password')}</label><input type="password" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} className="input-field" placeholder={t('password')} required minLength={6} /></div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="label">{t('role')}</label>
                <select value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))} className="input-field">
                  <option value="">{t('selectRole')}</option>
                  {user?.role === 'secretariat_office' ? (
                    <>
                      <option value="panchayat_secretary">👑 {t('panchayat_secretary')}</option>
                      <option value="collector">🏛️ {t('collector')}</option>
                    </>
                  ) : user?.role === 'collector' ? (
                    <option value="panchayat_secretary">👑 {t('panchayat_secretary')}</option>
                  ) : (
                    <>
                      <option value="admin">🛡️ {t('admin')}</option>
                      <option value="officer">👨‍💼 {t('officer')}</option>
                      <option value="citizen">👤 {t('citizen')}</option>
                      <option value="panchayat_secretary">👑 {t('panchayat_secretary')}</option>
                      <option value="collector">🏛️ {t('collector')}</option>
                    </>
                  )}
                </select>
              </div>

              {userForm.role === 'officer' && (
                <div style={{ gridColumn: '1 / -1' }}><label className="label">{t('department')}</label>
                  <select value={userForm.department} onChange={e => setUserForm(f => ({ ...f, department: e.target.value }))} className="input-field">
                    <option value="">{t('chooseOfficer')}</option>
                    <option value="Water Department">💧 {t('water')}</option>
                    <option value="Panchayat">🛣️ {t('roads')}</option>
                    <option value="Electricity Department">⚡ {t('electricity')}</option>
                    <option value="Sanitation Department">🧹 {t('sanitation')}</option>
                    <option value="General">📋 {t('others')}</option>
                  </select>
                </div>
              )}
              {((userForm.role === 'panchayat_secretary') || userForm.role === 'citizen' || userForm.role === 'admin' || userForm.role === 'officer' || userForm.role === 'collector') && user?.role !== 'panchayat_secretary' && (
                <>
                  {(user?.role === 'admin' || user?.role === 'secretariat_office') && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className="label">{t('districtName') || 'District'}</label>
                      <select 
                        value={userForm.district} 
                        onChange={e => setUserForm(f => ({ ...f, district: e.target.value }))} 
                        className="input-field"
                      >
                        <option value="">{t('selectDistrict') || 'Select District'}</option>
                        {districts.map(d => (
                          <option key={d._id} value={d._id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {['panchayat_secretary', 'officer', 'citizen'].includes(userForm.role) && (
                    <>
                      <div>
                        <label className="label">{t('mandalName')}</label>
                        <select
                          value={formMandalId}
                          onChange={e => {
                            setFormMandalId(e.target.value);
                            setUserForm(f => ({ ...f, mandal: e.target.value, village: '' }));
                          }}
                          className="input-field"
                        >
                          <option value="">{t('allMandals')}</option>
                          {mandals
                            .filter(m => !userForm.district || (m.district?._id || m.district) === userForm.district)
                            .map(m => (
                            <option key={m._id} value={m._id}>{m.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label">{t('village')}</label>
                        <select
                          value={userForm.village}
                          onChange={e => setUserForm(f => ({ ...f, village: e.target.value }))}
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
                </>
              )}

              {error && <div style={{ gridColumn: '1 / -1', color: '#ef4444', fontSize: 13, background: 'rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: 8 }}>⚠️ {t(error as any) || error}</div>}
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 12, marginTop: 10 }}>
                <button onClick={handleCreateUser} className="btn-primary" disabled={creating}>{creating ? `${t('creating')}...` : `✅ ${t('createUser')}`}</button>
                <button onClick={() => setNewUserModal(false)} className="btn-ghost">{t('cancel')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(false)}>
          <div className="modal-content" style={{ maxWidth: 650, width: '90%', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>✏️ {t('editUser' as any) || 'Edit User Profile'}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div><label className="label">{t('fullName')}</label><input value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder={t('fullNamePlaceholder')} minLength={3} required /></div>
              <div><label className="label">{t('mobileNumber')}</label><input value={userForm.mobile} onChange={e => { const val = e.target.value.replace(/\D/g, '').slice(0, 10); setUserForm(f => ({ ...f, mobile: val })); }} className="input-field" placeholder={t('mobileNumber')} required minLength={10} maxLength={10} /></div>
              <div><label className="label">{t('emailAddr')}</label><input value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} className="input-field" placeholder={t('emailPlaceholder')} required type="email" /></div>
              <div><label className="label">{t('password')} ({t('leaveBlank' as any) || 'Leave blank to keep current'})</label><input type="password" value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} className="input-field" placeholder={t('password')} minLength={6} /></div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="label">{t('role')}</label>
                <select value={userForm.role} disabled className="input-field" style={{ cursor: 'not-allowed', opacity: 0.8 }}>
                  <option value="admin">🛡️ {t('admin')}</option>
                  <option value="officer">👨‍💼 {t('officer')}</option>
                  <option value="citizen">👤 {t('citizen')}</option>
                  <option value="panchayat_secretary">👑 {t('panchayat_secretary')}</option>
                  <option value="collector">🏛️ {t('collector')}</option>
                  <option value="secretariat_office">🏢 {t('secretariat_office')}</option>
                </select>
              </div>

              {userForm.role === 'officer' && (
                <div style={{ gridColumn: '1 / -1' }}><label className="label">{t('department')}</label>
                  <select value={userForm.department} onChange={e => setUserForm(f => ({ ...f, department: e.target.value }))} className="input-field">
                    <option value="">{t('chooseOfficer')}</option>
                    <option value="Water Department">💧 {t('water')}</option>
                    <option value="Panchayat">🛣️ {t('roads')}</option>
                    <option value="Electricity Department">⚡ {t('electricity')}</option>
                    <option value="Sanitation Department">🧹 {t('sanitation')}</option>
                    <option value="General">📋 {t('others')}</option>
                  </select>
                </div>
              )}

              {((userForm.role === 'panchayat_secretary') || userForm.role === 'citizen' || userForm.role === 'admin' || userForm.role === 'officer' || userForm.role === 'collector') && user?.role !== 'panchayat_secretary' && (
                <>
                  {(user?.role === 'admin' || user?.role === 'secretariat_office') && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label className="label">{t('districtName') || 'District'}</label>
                      <select 
                        value={userForm.district} 
                        disabled
                        className="input-field"
                        style={{ cursor: 'not-allowed', opacity: 0.8 }}
                      >
                        <option value="">{t('selectDistrict') || 'Select District'}</option>
                        {districts.map(d => (
                          <option key={d._id} value={d._id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {['panchayat_secretary', 'officer', 'citizen'].includes(userForm.role) && (
                    <>
                      <div>
                        <label className="label">{t('mandalName')}</label>
                        <select
                          value={formMandalId}
                          onChange={e => {
                            setFormMandalId(e.target.value);
                            setUserForm(f => ({ ...f, mandal: e.target.value, village: '' }));
                          }}
                          className="input-field"
                        >
                          <option value="">{t('allMandals')}</option>
                          {mandals
                            .filter(m => !userForm.district || (m.district?._id || m.district) === userForm.district)
                            .map(m => (
                            <option key={m._id} value={m._id}>{m.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label">{t('village')}</label>
                        <select
                          value={userForm.village}
                          onChange={e => setUserForm(f => ({ ...f, village: e.target.value }))}
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
                </>
              )}

              {error && <div style={{ gridColumn: '1 / -1', color: '#ef4444', fontSize: 13, background: 'rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: 8 }}>⚠️ {t(error as any) || error}</div>}
              <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 12, marginTop: 10 }}>
                <button onClick={handleUpdateUser} className="btn-primary" disabled={updating}>{updating ? `${t('updating' as any) || 'Updating'}...` : `✅ ${t('update' as any) || 'Update User'}`}</button>
                <button onClick={() => setEditModal(false)} className="btn-ghost">{t('cancel')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Village Modal */}
      {assignModal && (
        <div className="modal-overlay" onClick={() => setAssignModal(null)}>
          <div className="modal-content" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>🏛️ {t('assignSecretary')}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Assign <strong>{assignModal.name}</strong> to a village</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
              {error && <div style={{ color: '#ef4444', fontSize: 13, background: 'rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: 8 }}>⚠️ {error}</div>}
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={handleAssignVillage} className="btn-primary" disabled={assigning || !assignVillageId} style={{ flex: 1 }}>
                  {assigning ? `${t('assigning')}...` : `✅ ${t('assign')}`}
                </button>
                <button onClick={() => setAssignModal(null)} className="btn-ghost" style={{ flex: 1 }}>{t('cancel')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* View User Profile Modal */}
      {viewModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setViewModal(false)}>
          <div className="modal-content" style={{ maxWidth: 650, width: '95%', padding: 0, overflow: 'hidden', borderRadius: 24, border: '1px solid var(--border)', background: 'var(--bg-card)' }} onClick={e => e.stopPropagation()}>
            {/* Header / Banner */}
            <div style={{ height: 80, background: `linear-gradient(135deg, ${roleColors[selectedUser.role] || 'var(--primary)'}40, ${roleColors[selectedUser.role] || 'var(--primary)'}10)`, position: 'relative' }}>
              <button onClick={() => setViewModal(false)} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.2)', border: 'none', color: '#fff', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✕</button>
            </div>
            
            {/* Profile Info */}
            <div style={{ padding: '0 24px 20px', marginTop: -32, position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginBottom: 16 }}>
                <div style={{ width: 70, height: 70, minWidth: 70, borderRadius: '50%', background: 'var(--bg-card)', border: '3px solid var(--bg-card)', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: roleColors[selectedUser.role] }}>
                  {selectedUser.name?.[0]?.toUpperCase()}
                </div>
                <div style={{ paddingBottom: 4 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>{selectedUser.name}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: `${roleColors[selectedUser.role]}20`, color: roleColors[selectedUser.role], fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t(selectedUser.role as any)}</span>
                    <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: selectedUser.isActive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: selectedUser.isActive ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{selectedUser.isActive ? t('active') : t('inactive')}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', fontWeight: 600 }}>{t('mobileNumber')}</div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, fontFamily: 'monospace' }}>{selectedUser.mobile}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', fontWeight: 600 }}>{t('emailAddr')}</div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedUser.email || '—'}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', fontWeight: 600 }}>{t('mandalName')}</div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{selectedUser.mandal?.name || (selectedUser.village as any)?.mandal?.name || '—'}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', fontWeight: 600 }}>{t('village')}</div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{selectedUser.village?.name || (typeof selectedUser.village === 'string' ? selectedUser.village : '—')}</div>
                </div>
                {selectedUser.department && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', fontWeight: 600 }}>{t('department')}</div>
                    <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{t(selectedUser.department as any) || selectedUser.department}</div>
                  </div>
                )}
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', fontWeight: 600 }}>{t('joined')}</div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{new Date(selectedUser.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                </div>
              </div>

              <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                {(user.role === 'admin' || 
                  (user.role === 'secretariat_office' && selectedUser.role !== 'admin' && selectedUser.role !== 'secretariat_office') || 
                  (user.role === 'collector' && (selectedUser.role === 'panchayat_secretary' || selectedUser.role === 'officer' || selectedUser.role === 'citizen')) ||
                  (user.role === 'panchayat_secretary' && (selectedUser.role === 'officer' || selectedUser.role === 'citizen'))) && (
                  <button 
                    className="btn-primary" 
                    style={{ flex: 1, padding: '10px 20px' }} 
                    onClick={() => {
                      setViewModal(false);
                      setEditingUserId(selectedUser._id);
                      setUserForm({
                        name: selectedUser.name,
                        mobile: selectedUser.mobile,
                        email: selectedUser.email || '',
                        password: '',
                        role: selectedUser.role,
                        department: selectedUser.department || '',
                        village: selectedUser.village?._id || selectedUser.village || '',
                        mandal: selectedUser.mandal?._id || selectedUser.mandal || '',
                        district: selectedUser.district?._id || selectedUser.district || ''
                      });
                      setFormMandalId(selectedUser.mandal?._id || selectedUser.mandal || '');
                      setEditModal(true);
                    }}
                  >
                    ✏️ {t('edit' as any) || 'Edit Profile'}
                  </button>
                )}
                <button className="btn-ghost" style={{ flex: 1, padding: '10px 20px' }} onClick={() => setViewModal(false)}>{t('close' as any) || 'Close'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
