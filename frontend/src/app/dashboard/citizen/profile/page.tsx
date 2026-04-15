'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const { t, setLanguage } = useLanguage();
  const router = useRouter();
  const [form, setForm] = useState({ 
    name: user?.name||'', 
    email: user?.email||'', 
    language: user?.language||'en' 
  });
  const [pwForm, setPwForm] = useState({ currentPassword:'', newPassword:'', confirmPassword:'' });
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [msg, setMsg] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'profile'|'security'>('profile');

  const handleSave = async () => {
    setSaving(true); setMsg('');
    try {
      const res = await api.updateProfile(form);
      updateUser(res.user);
      setLanguage(form.language as any);
      setMsg(t('profileUpdated'));
    } catch (err: any) { setMsg(`❌ ${err.message}`); }
    finally { setSaving(false); }
  };

  const handlePwChange = async () => {
    if (pwForm.newPassword !== pwForm.confirmPassword) { setPwMsg(`❌ ${t('passwordsDoNotMatch')}`); return; }
    if (pwForm.newPassword.length < 6) { setPwMsg(`❌ ${t('passwordMinLength')}`); return; }
    setChangingPw(true); setPwMsg('');
    try {
      await api.updateProfile(pwForm); // would call change-password endpoint
      setPwMsg(t('passwordChanged'));
      setPwForm({ currentPassword:'', newPassword:'', confirmPassword:'' });
    } catch (err: any) { setPwMsg(`❌ ${err.message}`); }
    finally { setChangingPw(false); }
  };

  const roleColors: Record<string,string> = { citizen:'#22c55e', admin:'#f59e0b', officer:'#0ea5e9', panchayat_secretary:'#a855f7', collector:'#e11d48' };
  const roleColor = roleColors[user?.role||'citizen'];

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg-dark)' }}>
      <Sidebar />
      <main style={{ flex:1, marginLeft:280, padding:'28px', maxWidth:'calc(100vw - 280px)' }}>
        <div style={{ maxWidth:600, margin:'0 auto' }}>
          <h1 style={{ fontSize:24, fontWeight:800, fontFamily:'Poppins', color:'var(--text-primary)', marginBottom:28 }}>👤 {t('profile')}</h1>

          {/* Profile Card */}
          <div className="glass-card" style={{ padding:28, marginBottom:20, textAlign:'center', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:4, background:`linear-gradient(90deg, ${roleColor}, var(--accent))` }} />
            <div style={{ width:80, height:80, borderRadius:'50%', background:`linear-gradient(135deg, ${roleColor}40, ${roleColor}20)`, border:`3px solid ${roleColor}60`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, margin:'0 auto 16px', fontWeight:800, color:roleColor }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <h2 style={{ fontSize:20, fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>{user?.name}</h2>
            <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:8, marginBottom:8 }}>
              <span style={{ fontSize:13, padding:'3px 14px', borderRadius:20, background:`${roleColor}18`, color:roleColor, fontWeight:600, textTransform:'capitalize', border:`1px solid ${roleColor}40` }}>{t(user?.role as any || 'citizen')}</span>
              {user?.department && <span style={{ fontSize:12, color:'var(--text-muted)' }}>· {user.department}</span>}
            </div>
            <div style={{ fontSize:13, color:'var(--text-muted)' }}>
              📱 {user?.mobile} {user?.village && `· 📍 ${(user.village as any)?.name || (typeof user.village === 'string' ? user.village : '—')}`}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', background:'rgba(0,0,0,0.3)', borderRadius:12, padding:4, marginBottom:20 }}>
            {(['profile','security'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex:1, padding:'10px', borderRadius:10, border:'none', cursor:'pointer', fontWeight:600, fontSize:14, transition:'all 0.2s', textTransform:'capitalize',
                background: activeTab===tab ? 'linear-gradient(135deg, var(--primary-light), var(--primary))' : 'transparent',
                color: activeTab===tab ? 'white' : 'var(--text-muted)' }}>
                {tab === 'profile' ? t('profileInfo') : t('security')}
              </button>
            ))}
          </div>

          {activeTab === 'profile' ? (
            <div className="glass-card" style={{ padding:28 }}>
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <div>
                  <label className="label">{t('fullName')}</label>
                  <input value={form.name} onChange={e => setForm(f => ({...f,name:e.target.value}))} className="input-field" placeholder={t('fullNamePlaceholder')} />
                </div>
                <div>
                  <label className="label">{t('emailAddr')}</label>
                  <input value={form.email} onChange={e => setForm(f => ({...f,email:e.target.value}))} className="input-field" placeholder={t('emailPlaceholder')} type="email" />
                </div>
                <div>
                  <label className="label">{t('mobileReadOnly')}</label>
                  <input value={user?.mobile || ''} readOnly className="input-field" style={{ opacity:0.6, cursor:'not-allowed' }} />
                </div>
                <div>
                  <label className="label">{t('village')}</label>
                  <input 
                    value={(user?.village as any)?.name || (typeof user?.village === 'string' ? user.village : '')} 
                    readOnly 
                    className="input-field" 
                    style={{ opacity:0.6, cursor:'not-allowed' }} 
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Jurisdiction changes are managed by the District Collector.</div>
                </div>
                <div>
                  <label className="label">{t('langPref')}</label>
                  <select 
                    value={form.language} 
                    onChange={e => {
                      const lang = e.target.value;
                      setForm(f => ({ ...f, language: lang }));
                      setLanguage(lang as any);
                    }} 
                    className="input-field"
                  >
                    <option value="en">🇬🇧 English</option>
                    <option value="te">🇮🇳 Telugu</option>
                  </select>
                </div>
                {msg && <div style={{ padding:'10px 14px', borderRadius:10, background: msg.includes('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: msg.includes('✅') ? '#22c55e' : '#ef4444', fontSize:13 }}>{msg}</div>}
                <button onClick={handleSave} className="btn-primary" disabled={saving} style={{ alignSelf:'flex-start', padding:'12px 32px' }}>
                  {saving ? `⏳ ${t('saving')}` : `💾 ${t('saveChanges')}`}
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-card" style={{ padding:28 }}>
              <h3 style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', marginBottom:16 }}>🔑 {t('changePassword')}</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div>
                  <label className="label">{t('currentPassword')}</label>
                  <input type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({...f,currentPassword:e.target.value}))} className="input-field" placeholder={t('currentPasswordPlaceholder')} />
                </div>
                <div>
                  <label className="label">{t('newPassword')}</label>
                  <input type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({...f,newPassword:e.target.value}))} className="input-field" placeholder={t('newPasswordPlaceholder')} />
                </div>
                <div>
                  <label className="label">{t('confirmNewPassword')}</label>
                  <input type="password" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({...f,confirmPassword:e.target.value}))} className="input-field" placeholder={t('confirmPasswordPlaceholder')} />
                </div>
                {pwMsg && <div style={{ padding:'10px 14px', borderRadius:10, background: pwMsg.includes('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: pwMsg.includes('✅') ? '#22c55e' : '#ef4444', fontSize:13 }}>{pwMsg}</div>}
                <button onClick={handlePwChange} className="btn-primary" disabled={changingPw} style={{ alignSelf:'flex-start', padding:'12px 28px' }}>
                  {changingPw ? `⏳ ${t('saving')}` : `🔐 ${t('changePassword')}`}
                </button>
              </div>

              <div style={{ marginTop:28, paddingTop:20, borderTop:'1px solid var(--border)' }}>
                <h3 style={{ fontSize:14, fontWeight:700, color:'#ef4444', marginBottom:12 }}>⚠️ {t('dangerZone')}</h3>
                <button onClick={async () => { await logout(); router.push('/login'); }}
                  style={{ padding:'10px 20px', borderRadius:10, border:'1px solid rgba(239,68,68,0.4)', background:'rgba(239,68,68,0.08)', color:'#ef4444', fontSize:13, fontWeight:600, cursor:'pointer', transition:'all 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(239,68,68,0.15)'}
                  onMouseLeave={e => e.currentTarget.style.background='rgba(239,68,68,0.08)'}>
                  🚪 {t('signOutSessions')}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
