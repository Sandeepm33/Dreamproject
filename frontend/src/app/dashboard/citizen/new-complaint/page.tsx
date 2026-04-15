'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { Mic, MicOff } from 'lucide-react';

const CATEGORIES = [
  { value: 'water', icon: '💧', color: '#38bdf8' },
  { value: 'roads', icon: '🛣️', color: '#a78bfa' },
  { value: 'electricity', icon: '⚡', color: '#fbbf24' },
  { value: 'sanitation', icon: '🧹', color: '#34d399' },
  { value: 'others', icon: '📋', color: '#94a3b8' },
];

export default function NewComplaintPage() {
  const { user, loading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: '', description: '', category: '', location: { address: '', lat: 0, lng: 0, village: '', district: '' }
  });
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<any>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [onBehalf, setOnBehalf] = useState(false);
  const [citizenMobile, setCitizenMobile] = useState('');
  const [targetCitizen, setTargetCitizen] = useState<any>(null);
  const [searchingCitizen, setSearchingCitizen] = useState(false);

  const searchCitizen = async () => {
    if (!citizenMobile) return;
    setSearchingCitizen(true);
    setError('');
    try {
      const res = await api.searchUsers({ mobile: citizenMobile, role: 'citizen' });
      if (res.users && res.users.length > 0) {
        setTargetCitizen(res.users[0]);
      } else {
        setTargetCitizen(null);
        setError(t('noCitizenFound'));
      }
    } catch {
      setError('Error searching citizen');
    } finally {
      setSearchingCitizen(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, location: { ...f.location, [e.target.name]: e.target.value } }));
  };

  const getGPS = () => {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setForm(f => ({ ...f, location: { ...f.location, lat: pos.coords.latitude, lng: pos.coords.longitude } }));
        setGpsLoading(false);
      },
      () => { setError(t('gpsError')); setGpsLoading(false); }
    );
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selected].slice(0, 5));
    selected.forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => setPreviews(prev => [...prev, ev.target?.result as string].slice(0, 5));
      reader.readAsDataURL(f);
    });
  };

  const removeFile = (i: number) => {
    setFiles(f => f.filter((_,idx) => idx !== i));
    setPreviews(p => p.filter((_,idx) => idx !== i));
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError(t('speechNotSupported'));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language === 'te' ? 'te-IN' : 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
      setError(`Speech error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setForm(f => ({ ...f, description: f.description + (f.description ? ' ' : '') + transcript }));
    };

    recognition.start();
  };

  const handleSubmit = async () => {
    if (!form.title || !form.description || !form.category) { setError(t('fillAllRequired')); return; }
    setSubmitting(true);
    setError('');
    try {
      let mediaUrls: any[] = [];
      if (files.length > 0) {
        const uploadRes = await api.uploadFiles(files);
        mediaUrls = uploadRes.files || [];
      }
      const payload = { 
        ...form, 
        media: mediaUrls, 
        citizenId: (onBehalf && targetCitizen) ? targetCitizen._id : undefined 
      };
      const res = await api.createComplaint(payload);
      setSuccess(res.complaint);
    } catch (err: any) {
      setError(err.message || t('submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-dark)' }}>
        <Sidebar />
        <main style={{ flex: 1, marginLeft: 240, padding: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-card" style={{ padding: 48, textAlign: 'center', maxWidth: 480 }}>
            <div style={{ fontSize: 72, marginBottom: 20, animation: 'float 2s ease-in-out infinite' }}>🎉</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>{t('submitted')}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>{t('issueRegisteredDesc')}</p>
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: '16px 24px', marginBottom: 28 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{t('complaintId')}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)', fontFamily: 'Poppins' }}>{success.complaintId}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{t('routedTo')}: {success.department}</div>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => router.push('/dashboard/citizen/complaints')} className="btn-primary">📋 {t('viewMyComplaints')}</button>
              <button onClick={() => { setSuccess(null); setStep(1); setForm({ title:'',description:'',category:'',location:{address:'',lat:0,lng:0,village:'',district:''} }); setFiles([]); setPreviews([]); }} className="btn-ghost">➕ {t('raiseAnother')}</button>
            </div>
          </div>
        </main>
        <style>{`@keyframes float { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-10px) } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-dark)' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 280, padding: '28px', maxWidth: 'calc(100vw - 280px)' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>← {t('back')}</button>
            <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Poppins', color: 'var(--text-primary)' }}>{t('raiseNewIssue')}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>{t('reportProblemSub')}</p>
          </div>

          {/* Step Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
            {[t('issueDetails'), t('locationMedia'), t('review')].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 40 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, transition: 'all 0.3s',
                    background: step > i+1 ? 'var(--primary-light)' : step === i+1 ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                    color: step >= i+1 ? 'white' : 'var(--text-muted)',
                    border: step === i+1 ? '2px solid var(--accent)' : '2px solid transparent',
                    boxShadow: step === i+1 ? 'var(--glow-accent)' : 'none' }}>
                    {step > i+1 ? '✓' : i+1}
                  </div>
                  <div style={{ fontSize: 10, color: step === i+1 ? 'var(--accent)' : 'var(--text-muted)', marginTop: 4, whiteSpace: 'nowrap' }}>{s}</div>
                </div>
                {i < 2 && <div style={{ flex: 1, height: 2, background: step > i+1 ? 'var(--primary-light)' : 'var(--border)', margin: '0 8px', marginBottom: 20, transition: 'background 0.3s' }} />}
              </div>
            ))}
          </div>

          <div className="glass-card" style={{ padding: 32 }}>
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Manual Entry for Admin/Officer */}
                {user?.role !== 'citizen' && (
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: 20, borderRadius: 16, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <label className="label" style={{ marginBottom: 0 }}>👥 {t('onBehalf')}</label>
                      <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', borderRadius: 20, padding: 4 }}>
                        <button onClick={() => { setOnBehalf(false); setTargetCitizen(null); }} style={{ padding: '6px 16px', borderRadius: 16, fontSize: 12, border: 'none', cursor: 'pointer', background: !onBehalf ? 'var(--accent)' : 'transparent', color: !onBehalf ? 'var(--bg-dark)' : 'var(--text-muted)', fontWeight: 600 }}>{t('myself')}</button>
                        <button onClick={() => setOnBehalf(true)} style={{ padding: '6px 16px', borderRadius: 16, fontSize: 12, border: 'none', cursor: 'pointer', background: onBehalf ? 'var(--accent)' : 'transparent', color: onBehalf ? 'var(--bg-dark)' : 'var(--text-muted)', fontWeight: 600 }}>{t('citizen')}</button>
                      </div>
                    </div>

                    {onBehalf && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <input value={citizenMobile} onChange={e => setCitizenMobile(e.target.value)} className="input-field" placeholder={t('citizenSearch')} style={{ flex: 1 }} />
                          <button onClick={searchCitizen} className="btn-ghost" disabled={searchingCitizen} style={{ whiteSpace: 'nowrap' }}>
                            {searchingCitizen ? t('searching') : `🔍 ${t('searchPrompt').split(' ')[0]}`}
                          </button>
                        </div>
                        {targetCitizen ? (
                          <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', padding: '10px 14px', borderRadius: 10, fontSize: 13, color: '#22c55e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>✅ {t('foundCitizen').replace('{name}', targetCitizen.name)}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>📍 {targetCitizen.village}</span>
                          </div>
                        ) : error && onBehalf && (
                          <div style={{ fontSize: 12, color: '#ef4444' }}>⚠️ {t('noCitizenFound')}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="label">{t('issueTitle')} <span style={{ color: '#ef4444' }}>*</span></label>
                  <input name="title" value={form.title} onChange={handleChange} className="input-field" placeholder={t('titlePlaceholder')} maxLength={200} />
                  <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{form.title.length}/200</div>
                </div>
                <div>
                  <label className="label">{t('category')} <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    {CATEGORIES.map(cat => (
                      <div key={cat.value} onClick={() => setForm(f => ({ ...f, category: cat.value }))}
                        style={{ padding: '14px 12px', borderRadius: 12, cursor: 'pointer', textAlign: 'center', border: `2px solid ${form.category === cat.value ? cat.color : 'var(--border)'}`,
                          background: form.category === cat.value ? `${cat.color}15` : 'rgba(255,255,255,0.02)', transition: 'all 0.2s' }}>
                        <div style={{ fontSize: 24, marginBottom: 6 }}>{cat.icon}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: form.category === cat.value ? cat.color : 'var(--text-primary)' }}>{t(cat.value as any)}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label className="label" style={{ marginBottom: 0 }}>{t('description')} <span style={{ color: '#ef4444' }}>*</span></label>
                    <button onClick={startListening} disabled={isListening} 
                      style={{ background: isListening ? '#ef4444' : 'rgba(45,106,79,0.1)', border: `1px solid ${isListening ? '#ef4444' : 'rgba(45,106,79,0.3)'}`, color: isListening ? 'white' : 'var(--text-primary)', borderRadius: 20, padding: '4px 12px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.3s' }}>
                      {isListening ? <MicOff size={12} /> : <Mic size={12} />}
                      {isListening ? t('listening') : t('voiceToText')}
                    </button>
                  </div>
                  <textarea name="description" value={form.description} onChange={handleChange as any} className="input-field" placeholder={t('descPlaceholder')} rows={5} maxLength={2000} style={{ resize: 'vertical' }} />
                  <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{form.description.length}/2000</div>
                </div>
                <button onClick={() => { if (!form.title || !form.category || !form.description) { setError(t('fillAllRequired')); return; } setError(''); setStep(2); }} className="btn-primary" style={{ alignSelf: 'flex-end', padding: '12px 32px' }}>
                  {t('step2Next')}
                </button>
              </div>
            )}

            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label className="label">{t('address')}</label>
                  <input name="address" value={form.location.address} onChange={handleLocationChange} className="input-field" placeholder={t('addressPlaceholder')} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="label">{t('village')}</label>
                    <input name="village" value={form.location.village || user?.village || ''} onChange={handleLocationChange} className="input-field" placeholder={t('villageName')} />
                  </div>
                  <div>
                    <label className="label">{t('district')}</label>
                    <input name="district" value={form.location.district} onChange={handleLocationChange} className="input-field" placeholder={t('districtPlaceholder')} />
                  </div>
                </div>
                <div>
                  <label className="label">GPS Coordinates</label>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <input className="input-field" readOnly placeholder="Latitude" value={form.location.lat || ''} style={{ flex: 1 }} />
                    <input className="input-field" readOnly placeholder="Longitude" value={form.location.lng || ''} style={{ flex: 1 }} />
                    <button onClick={getGPS} className="btn-ghost" style={{ whiteSpace: 'nowrap', minWidth: 120 }} disabled={gpsLoading}>
                      {gpsLoading ? t('gettingGps') : `📍 ${t('getGPS')}`}
                    </button>
                  </div>
                </div>

                {/* Media Upload */}
                <div>
                  <label className="label">{t('uploadPhotos')}</label>
                  <div onClick={() => fileRef.current?.click()} style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: '28px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary-light)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>📷</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{t('uploadDesc')}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>{t('uploadLimits')}</div>
                    <input ref={fileRef} type="file" multiple accept="image/*,video/*" onChange={handleFiles} style={{ display: 'none' }} />
                  </div>
                  {previews.length > 0 && (
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
                      {previews.map((p, i) => (
                        <div key={i} style={{ position: 'relative', width: 80, height: 80 }}>
                          <img src={p} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                          <button onClick={() => removeFile(i)} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#ef4444', border: 'none', cursor: 'pointer', color: 'white', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
                  <button onClick={() => setStep(1)} className="btn-ghost">← {t('back')}</button>
                  <button onClick={() => setStep(3)} className="btn-primary" style={{ padding: '12px 32px' }}>{t('step3Next')}</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{t('reviewSubmit')}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { label: t('issueTitle'), value: form.title },
                    { label: t('category'), value: t(form.category as any) },
                    { label: t('description'), value: form.description },
                    { label: t('address'), value: form.location.address || t('notSpecified') },
                    { label: t('attachedMedia'), value: `${files.length} ${t('fileAttached')}` },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{value}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'rgba(45,106,79,0.08)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                  ℹ️ {t('routingInfo')}
                </div>
                {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', color: '#ef4444', fontSize: 13 }}>⚠️ {error}</div>}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
                  <button onClick={() => setStep(2)} className="btn-ghost">← {t('edit')}</button>
                  <button onClick={handleSubmit} className="btn-accent" style={{ padding: '14px 40px', fontSize: 15 }} disabled={submitting}>
                    {submitting ? `⏳ ${t('submitting')}` : `🚀 ${t('submitComplaint')}`}
                  </button>
                </div>
              </div>
            )}

            {error && step < 3 && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', color: '#ef4444', fontSize: 13, marginTop: 12 }}>⚠️ {error}</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
