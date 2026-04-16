'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

export default function ManageVillagesPage() {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [villages, setVillages] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [newVillageModal, setNewVillageModal] = useState(false);
  const [villageForm, setVillageForm] = useState({ name: '', villageCode: '', mandal: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && (!user || user.role !== 'collector')) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  const fetchVillages = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const districtId = typeof (user as any).district === 'object' ? (user as any).district?._id : (user as any).district;
      const res = await api.getVillages(districtId ? { district: districtId } : {});
      setVillages(res.villages || []);
    } catch (err) {
      console.error(err);
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchVillages();
  }, [fetchVillages]);

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
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-dark)' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 280, padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Poppins', color: 'var(--text-primary)' }}>🏛️ {t('manageVillages')}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{t('total')}: {villages.length} {t('villages')}</p>
          </div>
          <button onClick={() => { setNewVillageModal(true); setError(''); }} className="btn-primary" style={{ fontSize: 13 }}>
            ➕ {t('addVillage')}
          </button>
        </div>

        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('villageName')}</th>
                <th>{t('villageCode')}</th>
                <th>{t('mandalName')}</th>
                <th>Assigned Secretary</th>
                <th>{t('status')}</th>
                <th>{t('joined')}</th>
              </tr>
            </thead>
            <tbody>
              {dataLoading ? [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(6)].map((_, j) => <td key={j}><div className="skeleton" style={{ height: 20, borderRadius: 4 }} /></td>)}
                </tr>
              )) : villages.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
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
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>⚠️ Vacant</span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: v.active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: v.active ? '#22c55e' : '#ef4444' }}>
                      {v.active ? `● ${t('active')}` : `○ ${t('inactive')}`}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(v.createdAt).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {newVillageModal && (
        <div className="modal-overlay" onClick={() => setNewVillageModal(false)}>
          <div className="modal-content" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>➕ {t('addVillage')}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">{t('villageName')}</label>
                <input 
                  value={villageForm.name} 
                  onChange={e => setVillageForm(f => ({ ...f, name: e.target.value }))} 
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
                <label className="label">{t('mandalName')}</label>
                <input 
                  value={villageForm.mandal} 
                  onChange={e => setVillageForm(f => ({ ...f, mandal: e.target.value }))} 
                  className="input-field" 
                  placeholder="e.g. Serilingampally" 
                />
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
