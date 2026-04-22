'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

export default function ManageVillagesPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [villages, setVillages] = useState<any[]>([]);
  const [mandals, setMandals] = useState<any[]>([]);
  const [selectedMandal, setSelectedMandal] = useState<string>('');
  const [dataLoading, setDataLoading] = useState(true);
  const [newVillageModal, setNewVillageModal] = useState(false);
  const [villageForm, setVillageForm] = useState({ name: '', villageCode: '', mandal: '' });
  const [isAddingMandal, setIsAddingMandal] = useState(false);
  const [newMandalName, setNewMandalName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && (!user || user.role !== 'collector')) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  const fetchVillages = useCallback(async (mandalId?: string) => {
    if (!user) return;
    setDataLoading(true);
    try {
      const districtId = typeof (user as any).district === 'object' ? (user as any).district?._id : (user as any).district;
      const params: any = districtId ? { district: districtId } : {};
      if (mandalId) params.mandal = mandalId;
      const res = await api.getVillages(params);
      setVillages(res.villages || []);
    } catch (err) {
      console.error(err);
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  const fetchMandals = useCallback(async () => {
    if (!user) return;
    try {
      const districtId = typeof (user as any).district === 'object' ? (user as any).district?._id : (user as any).district;
      const res = await api.getMandals(districtId ? { district: districtId } : {});
      setMandals(res.mandals || []);
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  useEffect(() => {
    fetchVillages(selectedMandal);
    fetchMandals();
  }, [fetchVillages, fetchMandals, selectedMandal]);

  const handleCreateMandal = async () => {
    if (!newMandalName) return;
    try {
      const res = await api.createMandal({ name: newMandalName });
      await fetchMandals();
      setVillageForm(f => ({ ...f, mandal: res.mandal._id }));
      setIsAddingMandal(false);
      setNewMandalName('');
    } catch (err: any) {
      alert(err.message || 'Failed to create Mandal');
    }
  };

  const handleCreateVillage = async () => {
    if (!villageForm.name || !villageForm.villageCode) {
      setError(t('fillAllRequired'));
      return;
    }
    setCreating(true);
    setError('');
    try {
      await api.createVillage(villageForm);
      setNewVillageModal(false);
      setVillageForm({ name: '', villageCode: '', mandal: '' });
      fetchVillages();
    } catch (err: any) {
      setError(err.message || 'Failed to create village');
    } finally {
      setCreating(false);
    }
  };

  if (loading || !user) return null;

  return (
    <div className="animate-fade-in">
      <div className="layout-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Poppins', color: 'var(--text-primary)' }}>🏛️ {t('manageVillages')}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{t('total')}: {villages.length} {t('villages')}</p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <select 
              value={selectedMandal} 
              onChange={e => setSelectedMandal(e.target.value)} 
              className="input-field" 
              style={{ width: '200px', padding: '8px 12px' }}
            >
              <option value="">{t('allMandals') || 'All Mandals'}</option>
              {mandals.map((m: any) => (
                <option key={m._id} value={m._id}>{m.name}</option>
              ))}
            </select>
            <button onClick={() => { setNewVillageModal(true); setError(''); }} className="btn-primary" style={{ fontSize: 13 }}>
              ➕ {t('addVillage')}
            </button>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('villageName')}</th>
                <th>{t('villageCode')}</th>
                <th>{t('mandalName')}</th>
                <th>{t('assignedSecretary')}</th>
                <th>{t('status')}</th>
                <th>{t('joined')}</th>
                <th>{t('actions') || 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {dataLoading ? [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(7)].map((_, j) => <td key={j}><div className="skeleton" style={{ height: 20, borderRadius: 4 }} /></td>)}
                </tr>
              )) : villages.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                    {t('noVillages')}
                  </td>
                </tr>
              ) : villages.map(v => (
                <tr key={v._id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v.name}</td>
                  <td><code style={{ fontSize: 12, color: 'var(--accent)', background: 'rgba(245,158,11,0.1)', padding: '2px 6px', borderRadius: 4 }}>{v.villageCode}</code></td>
                  <td>{v.mandal || '—'}</td>
                  <td>
                    {v.secretary ? (
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>👤 {v.secretary.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{v.secretary.mobile}</div>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>⚠️ {t('vacant')}</span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: v.active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: v.active ? '#22c55e' : '#ef4444' }}>
                      {v.active ? `● ${t('active')}` : `○ ${t('inactive')}`}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(v.createdAt).toLocaleDateString('en-IN')}</td>
                  <td>
                    <button 
                      onClick={async () => {
                        if (confirm(`Are you sure you want to delete ${v.name}?`)) {
                          try {
                            await api.deleteVillage(v._id);
                            fetchVillages();
                          } catch (err: any) {
                            alert(err.message || 'Failed to delete village');
                          }
                        }
                      }} 
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}
                      title="Delete Village"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      {newVillageModal && (
        <div className="modal-overlay" onClick={() => setNewVillageModal(false)}>
          <div className="modal-content" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>➕ {t('addVillage')}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">{t('villageName')}</label>
                <input 
                  value={villageForm.name} 
                  onChange={e => {
                    const newName = e.target.value;
                    const newCode = newName.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 100);
                    setVillageForm(f => ({ ...f, name: newName, villageCode: newCode }));
                  }} 
                  className="input-field" 
                  placeholder="e.g. Gachibowli" 
                />
              </div>
              <div>
                <label className="label">{t('villageCode')}</label>
                <input 
                  value={villageForm.villageCode} 
                  onChange={e => setVillageForm(f => ({ ...f, villageCode: e.target.value.toUpperCase() }))} 
                  className="input-field" 
                  placeholder="e.g. GCB" 
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label className="label" style={{ marginBottom: 0 }}>{t('mandalName')}</label>
                  <button 
                    onClick={() => setIsAddingMandal(!isAddingMandal)} 
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                  >
                    {isAddingMandal ? 'Cancel' : '+ New Mandal'}
                  </button>
                </div>
                
                {isAddingMandal ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input 
                      value={newMandalName} 
                      onChange={e => setNewMandalName(e.target.value)} 
                      className="input-field" 
                      placeholder="e.g. New Mandal Name" 
                    />
                    <button onClick={handleCreateMandal} className="btn-primary" style={{ padding: '0 16px' }}>Add</button>
                  </div>
                ) : (
                  <select 
                    value={villageForm.mandal} 
                    onChange={e => setVillageForm(f => ({ ...f, mandal: e.target.value }))} 
                    className="input-field" 
                  >
                    <option value="" disabled>Select a Mandal</option>
                    {mandals.map((m: any) => (
                      <option key={m._id} value={m._id}>{m.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {error && <div style={{ color: '#ef4444', fontSize: 13, background: 'rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: 8 }}>⚠️ {error}</div>}
              
              <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                <button onClick={handleCreateVillage} className="btn-primary" disabled={creating} style={{ flex: 1 }}>
                  {creating ? `${t('creating')}...` : `✅ ${t('addVillage')}`}
                </button>
                <button onClick={() => setNewVillageModal(false)} className="btn-ghost" style={{ flex: 1 }}>
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
