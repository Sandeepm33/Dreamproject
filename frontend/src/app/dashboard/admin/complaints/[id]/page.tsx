'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api, getFullImageUrl } from '@/lib/api';

const catIcons: Record<string, string> = { water: '💧', roads: '🛣️', electricity: '⚡', sanitation: '🧹', others: '📋' };
const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

import { useLanguage } from '@/context/LanguageContext';

export default function AdminComplaintDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [complaint, setComplaint] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [officers, setOfficers] = useState<any[]>([]);
  const [remark, setRemark] = useState('');
  const [assignOfficer, setAssignOfficer] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'details' | 'history' | 'remarks'>('details');
  const [showSuccess, setShowSuccess] = useState(false);
  const [villageMap, setVillageMap] = useState<Record<string, string>>({});
  const [districtMap, setDistrictMap] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedText, setTranslatedText] = useState('');

  useEffect(() => {
    Promise.all([api.getVillages(), api.getDistricts()]).then(([vRes, dRes]) => {
      const vMap: any = {}; vRes.villages?.forEach((v: any) => vMap[v._id] = v.name); setVillageMap(vMap);
      const dMap: any = {}; dRes.districts?.forEach((d: any) => dMap[d._id] = d.name); setDistrictMap(dMap);
    }).catch(() => { });
  }, []);

  const fetch = useCallback(async () => {
    try {
      const [cRes, oRes] = await Promise.all([api.getComplaint(id as string), api.getOfficers()]);
      setComplaint(cRes.complaint);
      setOfficers(oRes.officers || []);
      setNewStatus(cRes.complaint.status);
      setAssignOfficer(cRes.complaint.assignedTo?._id || '');
    } catch { }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { if (user) fetch(); }, [user, fetch]);

  // AUTO-REFRESH on new notification
  useEffect(() => {
    const handleRefresh = () => {
      console.log('🔄 Detail Page Refresh Triggered by FCM');
      fetch();
    };
    window.addEventListener('fcm-message-received', handleRefresh);
    return () => window.removeEventListener('fcm-message-received', handleRefresh);
  }, [fetch]);

  const handleSave = async () => {
    setSaving(true);
    setShowSuccess(false);
    try {
      if (newStatus !== complaint.status) {
        await api.updateStatus(id as string, { status: newStatus, note: `Status updated by Admin to ${newStatus}` });
      }
      if (assignOfficer && assignOfficer !== complaint.assignedTo?._id) {
        const officer = officers.find(o => o._id === assignOfficer);
        await api.assignComplaint(id as string, { officerId: assignOfficer, department: officer?.department || 'General' });
      }
      if (remark.trim()) {
        await api.addRemark(id as string, remark);
        setRemark('');
      }
      await fetch();
      setShowSuccess(true);
    } catch { }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ padding: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
      <div className="skeleton" style={{ width: 600, height: 400, borderRadius: 16 }} />
    </div>
  );

  if (showSuccess) {
    return (
      <div className="animate-fade-in" style={{ padding: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100%' }}>
        <div className="glass-card" style={{ padding: 48, textAlign: 'center', maxWidth: 480 }}>
          <div style={{ fontSize: 72, marginBottom: 20, animation: 'float 2s ease-in-out infinite' }}>🎉</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>{t('savedSuccessfully' as any) || 'Changes Saved!'}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>{t('complaintUpdatedText' as any) || 'The complaint details have been updated successfully.'}</p>
          <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: '16px 24px', marginBottom: 28 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{t('complaintId' as any) || 'Complaint ID'}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)', fontFamily: 'Poppins' }}>{complaint?.complaintId}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              {t('status' as any) || 'Status'}: {t(complaint?.status === 'in_progress' ? 'inProgress' : complaint?.status as any)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => router.push('/dashboard/admin/complaints')} className="btn-primary">📋 {t('backToComplaints' as any) || 'All Complaints'}</button>
            <button onClick={() => setShowSuccess(false)} className="btn-ghost">⬅️ {t('return' as any) || 'Return'}</button>
          </div>
        </div>
        <style>{`@keyframes float { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-10px) } }`}</style>
      </div>
    );
  }

  if (!complaint) return null;
  const currentStep = ['pending', 'assigned', 'in_progress', 'resolved'].indexOf(complaint.status);
  const steps = [t('pending'), t('assigned'), t('inProgress'), t('resolved')];

  return (
    <div className="animate-fade-in">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>← {t('backToComplaints')}</button>

        <div className="responsive-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}>
          {/* Main */}
          <div>
            <div className="glass-card" style={{ padding: 24, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 24 }}>{catIcons[complaint.category] || '📋'}</span>
                    <h1 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'Poppins' }}>{complaint.title}</h1>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <code style={{ fontSize: 12, color: 'var(--accent)', background: 'rgba(245,158,11,0.1)', padding: '2px 10px', borderRadius: 6 }}>{complaint.complaintId}</code>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>📅 {new Date(complaint.createdAt).toLocaleDateString('en-IN')}</span>
                    <span style={{ fontSize: 12, color: 'var(--accent)' }}>👍 {complaint.voteCount} {t('totalVotes')}</span>
                  </div>
                </div>
                <span className={`badge badge-${complaint.status === 'in_progress' ? 'inprogress' : complaint.status}`} style={{ fontSize: 12, padding: '6px 14px' }}>
                  {t(complaint.status === 'in_progress' ? 'inProgress' : complaint.status as any).toUpperCase()}
                </span>
              </div>

              {/* Status progress */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                {steps.map((s, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      {i > 0 && <div style={{ flex: 1, height: 3, background: i <= currentStep ? 'var(--primary-light)' : 'var(--border)' }} />}
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700,
                        background: i < currentStep ? 'var(--primary-light)' : i === currentStep ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                        color: i <= currentStep ? 'white' : 'var(--text-muted)'
                      }}>
                        {i < currentStep ? '✓' : i + 1}
                      </div>
                      {i < 3 && <div style={{ flex: 1, height: 3, background: i < currentStep ? 'var(--primary-light)' : 'var(--border)' }} />}
                    </div>
                    <span style={{ fontSize: 10, color: i <= currentStep ? 'var(--text-secondary)' : 'var(--text-muted)', marginTop: 5 }}>{s}</span>
                  </div>
                ))}
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
                {(['details', 'history', 'remarks'] as const).map(tabKey => (
                  <button key={tabKey} onClick={() => setTab(tabKey)} style={{
                    padding: '8px 16px', borderRadius: '8px 8px 0 0', border: '1px solid', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    borderColor: tab === tabKey ? 'var(--border)' : 'transparent',
                    borderBottomColor: tab === tabKey ? 'var(--bg-dark)' : 'transparent',
                    background: tab === tabKey ? 'var(--bg-dark)' : 'transparent',
                    color: tab === tabKey ? 'var(--text-primary)' : 'var(--text-muted)',
                    marginBottom: -1
                  }}>
                    {tabKey === 'details' ? `📋 ${t('issueDetails')}` : tabKey === 'history' ? `📅 ${t('history')}` : `💬 ${t('remarks')}`}
                  </button>
                ))}
              </div>

              {tab === 'details' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Escalation Reason */}
                  {complaint.status === 'escalated' && complaint.escalatedReason && (
                    <div style={{ padding: '12px 16px', background: 'rgba(249,115,22,0.05)', borderRadius: 10, border: '1px solid rgba(249,115,22,0.2)', marginBottom: 12 }}>
                      <div style={{ fontSize: 11, color: '#f97316', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>🚨 {t('escalationReason' as any) || 'Escalation Reason'}</div>
                      <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{complaint.escalatedReason}</p>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
                        {t('escalatedBy' as any) || 'Escalated by'}: {complaint.escalatedBy?.name || 'Authorized Officer'} · {new Date(complaint.escalatedAt).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                  )}

                  <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('description')}</div>
                      <button 
                        onClick={async () => {
                          if (translatedText) { setTranslatedText(''); return; }
                          setIsTranslating(true);
                          try {
                            const res = await api.aiTranslate(complaint.description, 'English');
                            if (res.success) setTranslatedText(res.translated);
                          } catch (err) { console.error(err); }
                          finally { setIsTranslating(false); }
                        }}
                        disabled={isTranslating}
                        style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#3b82f6', borderRadius: 20, padding: '2px 10px', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        {isTranslating ? '⏳ Translating...' : translatedText ? '✕ Clear Translation' : '✨ AI Translate to English'}
                      </button>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.7 }}>{complaint.description}</p>
                    {translatedText && (
                      <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(59,130,246,0.05)', borderLeft: '3px solid #3b82f6', borderRadius: '0 8px 8px 0' }}>
                        <div style={{ fontSize: 10, color: '#3b82f6', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>AI Translation (English)</div>
                        <p style={{ fontSize: 13, color: 'var(--text-primary)', fontStyle: 'italic' }}>{translatedText}</p>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    {[
                      { label: t('citizen'), value: `${complaint.citizen?.name} · ${complaint.citizen?.mobile}` },
                      { label: t('village'), value: `${complaint.village?.name || villageMap[complaint.village] || villageMap[complaint.citizen?.village] || complaint.location?.village || (typeof complaint.citizen?.village === 'string' ? `${t('village')}: ${complaint.citizen.village.substring(0, 8)}...` : '—')} · ${complaint.location?.district?.name || complaint.citizen?.district?.name || districtMap[complaint.location?.district] || districtMap[complaint.citizen?.district] || (typeof (complaint.location?.district || complaint.citizen?.district) === 'string' ? (complaint.location?.district || complaint.citizen?.district) : '')}` },
                      { label: t('category'), value: `${catIcons[complaint.category]} ${t(complaint.category as any)}` },
                      { label: t('department'), value: complaint.department || '—' },
                      { label: t('officer' as any) || 'Assigned Officer', value: complaint.assignedTo?.name ? `${complaint.assignedTo.name} (${complaint.assignedTo.department || ''})` : t('notAssignedSelect') },
                      { label: t('deadline'), value: complaint.slaDeadline ? new Date(complaint.slaDeadline).toLocaleDateString('en-IN') : '—' },
                      { label: t('address'), value: complaint.location?.address || '—' },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
                          <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{value}</div>
                        </div>
                        {label === t('address') && complaint.location?.lat && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${complaint.location.lat},${complaint.location.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-accent"
                            style={{ padding: '4px 10px', fontSize: 10, marginTop: 8, display: 'flex', alignItems: 'center', gap: 5, width: 'fit-content' }}
                          >
                            🗺️ {t('getDirections')}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                  {/* Images Section */}
                  {(complaint.beforeImage || complaint.afterImage || complaint.media?.length > 0) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                        {complaint.beforeImage && (
                          <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 8, background: 'rgba(255,255,255,0.01)' }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 700 }}>📸 {t('beforeLabel')}</div>
                            <a href={getFullImageUrl(complaint.beforeImage)} target="_blank" rel="noreferrer">
                              <img src={getFullImageUrl(complaint.beforeImage)} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8 }} />
                            </a>
                          </div>
                        )}
                        {complaint.afterImage && (
                          <div style={{ border: '1px solid var(--success)', borderRadius: 12, padding: 8, background: 'rgba(34,197,94,0.03)' }}>
                            <div style={{ fontSize: 10, color: '#22c55e', marginBottom: 4, fontWeight: 700 }}>✅ {t('afterResolution')}</div>
                            <a href={getFullImageUrl(complaint.afterImage)} target="_blank" rel="noreferrer">
                              <img src={getFullImageUrl(complaint.afterImage)} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8 }} />
                            </a>
                          </div>
                        )}
                      </div>
                      {complaint.media?.length > 0 && (
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{t('additionalMedia')}</div>
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            {complaint.media.map((m: any, i: number) => (
                              <a key={i} href={getFullImageUrl(m.url)} target="_blank" rel="noreferrer">
                                <img src={getFullImageUrl(m.url)} style={{ width: 100, height: 75, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {tab === 'history' && (
                <div>
                  {complaint.statusHistory?.slice().reverse().map((h: any, i: number) => (
                    <div key={i} className="timeline-item">
                      <div className={`timeline-dot ${i === 0 ? 'active' : ''}`} />
                      <div style={{ paddingLeft: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{t(h.status === 'in_progress' ? 'inProgress' : h.status as any)}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{h.note}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {h.changedBy?.name && `By ${h.changedBy.name} · `}{new Date(h.changedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'remarks' && (
                <div>
                  {complaint.remarks?.map((r: any, i: number) => (
                    <div key={i} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{r.addedBy?.name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(r.addedAt).toLocaleDateString('en-IN')}</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{r.text}</p>
                    </div>
                  ))}
                  {!complaint.remarks?.length && <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>{t('noRemarks')}</p>}
                  {user?.role !== 'collector' && (
                    <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                      <input value={remark} onChange={e => setRemark(e.target.value)} className="input-field" placeholder={t('addRemarkPlaceholder')} />
                      <button onClick={async () => { if (remark.trim()) { await api.addRemark(id as string, remark); setRemark(''); fetch(); } }} className="btn-primary" style={{ whiteSpace: 'nowrap' }}>{t('send')}</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Panel */}
          <div>
            {user?.role !== 'collector' && (
              <div className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>{t('quickActions')}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label className="label">{t('updateStatus')}</label>
                    <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="input-field">
                      {['pending', 'assigned', 'in_progress', 'resolved', 'rejected', 'escalated'].map(s =>
                        <option key={s} value={s} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>{t(s === 'in_progress' ? 'inProgress' : s as any)}</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="label">{t('assignComplaint').replace(' Complaint', '')}</label>
                    <select value={assignOfficer} onChange={e => setAssignOfficer(e.target.value)} className="input-field">
                      <option value="">{t('notAssignedSelect')}</option>
                      {officers.map(o => (
                        <option key={o._id} value={o._id}>{o.name} · {o.department || o.role}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">{t('addNoteRemark')}</label>
                    <textarea value={remark} onChange={e => setRemark(e.target.value)} className="input-field" rows={3} placeholder={t('adminNotePlaceholder')} style={{ resize: 'none' }} />
                  </div>
                  <button onClick={handleSave} className="btn-primary" disabled={saving}>{saving ? `⏳ ${t('saving')}` : `💾 ${t('saveChanges')}`}</button>
                </div>
              </div>
            )}

            {/* Citizen Info */}
            <div className="glass-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>👤 {t('citizenInfo')}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(45,106,79,0.2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'var(--primary-light)' }}>
                  {complaint.citizen?.name?.[0]}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{complaint.citizen?.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>📞 {complaint.citizen?.mobile}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {complaint.citizen?.email && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>📧 {complaint.citizen.email}</div>}
                {(complaint.village || complaint.citizen?.village || complaint.location?.village) && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    📍 {complaint.village?.name || villageMap[complaint.village] ||
                      (typeof complaint.citizen?.village === 'object' ? complaint.citizen.village.name :
                        (villageMap[complaint.citizen?.village] || complaint.location?.village || complaint.citizen?.village))}
                    {(complaint.location?.district || complaint.citizen?.district) && (
                      ` · ${complaint.location?.district?.name || complaint.citizen?.district?.name ||
                      districtMap[complaint.location?.district] || districtMap[complaint.citizen?.district] ||
                      (typeof (complaint.location?.district || complaint.citizen?.district) === 'string' ? (complaint.location?.district || complaint.citizen?.district) : '')}`
                    )}
                  </div>
                )}
              </div>
              {complaint.escalation?.level !== 'none' && (
                <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 8 }}>
                  <p style={{ fontSize: 12, color: '#f97316', fontWeight: 600 }}>🚨 {t('escalatedTo')} {complaint.escalation?.level}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
