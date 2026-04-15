'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

export default function NotificationsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const typeIcons: Record<string,string> = {
    complaint_created:'📋', status_update:'🔄', escalation:'🚨',
    vote:'👍', resolution:'✅', general:'📢'
  };

  const fetch = useCallback(async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
      setUnread(res.unreadCount || 0);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (user) fetch(); }, [user, fetch]);

  const markRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? {...n, isRead:true} : n));
      setUnread(u => Math.max(0, u-1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.markAllRead();
      setNotifications(prev => prev.map(n => ({...n, isRead:true})));
      setUnread(0);
    } catch {}
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'panchayat_secretary' || user?.role === 'collector';
  const basePath = isAdmin ? '/dashboard/admin' : '/dashboard/citizen';

  const localizeNotif = (title: string, message: string, complaintId?: string) => {
    let finalTitle = title;
    let finalMessage = message;

    // Localize Titles
    if (title === 'Status Updated') finalTitle = t('statusUpdatedTitle');
    if (title === 'Complaint Assigned') finalTitle = t('complaintAssignedTitle');
    if (title === 'Complaint Submitted') finalTitle = t('complaintSubmittedTitle');

    // Localize Messages
    if (message.includes('status changed to')) {
      const match = message.match(/Your complaint (.*) status changed to (.*)\./);
      if (match) {
        const id = match[1];
        const statusRaw = match[2];
        const statusKey = statusRaw === 'in_progress' ? 'inProgress' : statusRaw;
        finalMessage = t('notifStatusChanged').replace('{id}', id).replace('{status}', t(statusKey as any));
      }
    } else if (message.includes('has been assigned to')) {
      const match = message.match(/Your complaint (.*) has been assigned to (.*)\./);
      if (match) {
        const id = match[1];
        const dept = match[2];
        finalMessage = t('notifAssignedTo').replace('{id}', id).replace('{dept}', dept);
      }
    } else if (message.includes('has been successfully submitted')) {
       finalMessage = t('notifSubmittedSuccess').replace('{id}', complaintId || '');
    }

    return { title: finalTitle, message: finalMessage };
  };

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg-dark)' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 280, padding: '28px', minHeight: '100vh' }}>
        <div style={{ maxWidth:680, margin:'0 auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
            <div>
              <h1 style={{ fontSize:24, fontWeight:800, fontFamily:'Poppins', color:'var(--text-primary)' }}>
                🔔 {t('notifications')} {unread > 0 && <span style={{ fontSize:14,background:'var(--accent)',color:'#0a0f0d',borderRadius:20,padding:'2px 10px',marginLeft:8 }}>{t('newNotifications').replace('{count}', unread.toString())}</span>}
              </h1>
              <p style={{ color:'var(--text-muted)', fontSize:14 }}>{t('totalNotifications').replace('{count}', notifications.length.toString())}</p>
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} className="btn-ghost" style={{ fontSize:13 }}>{t('markAllRead')}</button>
            )}
          </div>

          {/* Admin Broadcast Section */}
          {isAdmin && <AdminBroadcast t={t} />}

          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[...Array(5)].map((_,i) => <div key={i} className="skeleton" style={{ height:80, borderRadius:14 }} />)}
            </div>
          ) : notifications.length === 0 ? (
            <div className="glass-card" style={{ padding:'60px', textAlign:'center' }}>
              <div style={{ fontSize:56, marginBottom:16 }}>🔕</div>
              <p style={{ color:'var(--text-muted)', fontSize:15 }}>{t('noNotifications')}</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {notifications.map(n => {
                const { title, message } = localizeNotif(n.title, n.message, n.complaint?.complaintId);
                return (
                  <div key={n._id} onClick={() => { if (!n.isRead) markRead(n._id); if (n.complaint) router.push(`${basePath}/complaints/${n.complaint._id}`); }}
                    style={{ padding:'16px 20px', borderRadius:14, border:`1px solid ${n.isRead ? 'var(--border)' : 'rgba(245,158,11,0.3)'}`, background:n.isRead ? 'rgba(255,255,255,0.01)' : 'rgba(245,158,11,0.05)', cursor:'pointer', transition:'all 0.2s', display:'flex', gap:14, alignItems:'flex-start' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(45,106,79,0.5)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = n.isRead ? 'var(--border)' : 'rgba(245,158,11,0.3)'; }}>
                    <div style={{ width:42,height:42,borderRadius:12,background:`rgba(${n.isRead?'255,255,255':'245,158,11'},0.05)`,border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0 }}>
                      {typeIcons[n.type] || '📢'}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                        <div style={{ fontSize:14, fontWeight:n.isRead ? 500 : 700, color:'var(--text-primary)' }}>{title}</div>
                        {!n.isRead && <div style={{ width:8,height:8,borderRadius:'50%',background:'var(--accent)',flexShrink:0,marginTop:6 }} />}
                      </div>
                      <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:3 }}>{message}</div>
                      {n.imageUrl && (
                        <div style={{ marginTop: 10 }}>
                          <img src={n.imageUrl.startsWith('http') ? n.imageUrl : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api','') || 'http://localhost:5000'}${n.imageUrl}`} alt="Attachment" style={{ maxWidth: '100%', borderRadius: 8, maxHeight: 200, objectFit: 'cover' }} />
                        </div>
                      )}
                      {n.audioUrl && (
                        <div style={{ marginTop: 10 }}>
                          <audio controls src={n.audioUrl.startsWith('http') ? n.audioUrl : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api','') || 'http://localhost:5000'}${n.audioUrl}`} style={{ width: '100%', height: 36, outline: 'none' }} />
                        </div>
                      )}
                      {n.complaint && <div style={{ fontSize:11, color:'var(--accent)', marginTop:4 }}>📋 {n.complaint.complaintId}</div>}
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>{new Date(n.createdAt).toLocaleDateString('en-IN', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function AdminBroadcast({ t }: { t: any }) {
  const [form, setForm] = useState({ title:'', message:'', targetRole:'all' });
  const [imageFile, setImageFile] = useState<File|null>(null);
  const [audioFile, setAudioFile] = useState<File|null>(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder|null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string|null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
        setAudioFile(file);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
      setRecording(false);
    }
  };

  const deleteRecording = () => {
    setAudioFile(null);
    setRecordedUrl(null);
    if (recording) stopRecording();
  };

  const handleSend = async () => {
    if (!form.title || !form.message) return;
    setSending(true);
    let imageUrl, audioUrl;
    try {
      if (imageFile || audioFile) {
        const filesToUpload = [imageFile, audioFile].filter(Boolean) as File[];
        const res = await api.uploadFiles(filesToUpload);
        if (res.success && res.files) {
          const uploadedImg = res.files.find((f:any) => f.type === 'image');
          const uploadedAud = res.files.find((f:any) => f.type === 'audio' || f.type === 'video'); // upload api sets audio or video
          if (uploadedImg) imageUrl = uploadedImg.url;
          if (uploadedAud) audioUrl = uploadedAud.url;
        }
      }
      await api.broadcastNotification({ title:form.title, message:form.message, targetRole: form.targetRole === 'all' ? undefined : form.targetRole, imageUrl, audioUrl });
      setSent(true);
      setForm({ title:'', message:'', targetRole:'all' });
      setImageFile(null);
      setAudioFile(null);
      setRecordedUrl(null);
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      console.error(err);
    }
    finally { setSending(false); }
  };

  return (
    <div className="glass-card" style={{ padding:20, marginBottom:24, border:'1px solid rgba(245,158,11,0.2)' }}>
      <h3 style={{ fontSize:14, fontWeight:700, color:'var(--accent)', marginBottom:14 }}>📢 {t('broadcast')}</h3>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
        <div>
          <label className="label">{t('issueTitle')}</label>
          <input value={form.title} onChange={e => setForm(f => ({...f,title:e.target.value}))} className="input-field" placeholder={t('notifTitlePlaceholder')} />
        </div>
        <div>
          <label className="label">{t('target')}</label>
          <select value={form.targetRole} onChange={e => setForm(f => ({...f,targetRole:e.target.value}))} className="input-field">
            <option value="all">{t('allUsers')}</option>
            <option value="citizen">{t('citizensOnly')}</option>
            <option value="officer">{t('officersOnly')}</option>
          </select>
        </div>
      </div>
      <div style={{ marginBottom:12 }}>
        <label className="label">{t('description')}</label>
        <textarea value={form.message} onChange={e => setForm(f => ({...f,message:e.target.value}))} className="input-field" placeholder={t('notifMessagePlaceholder')} rows={2} style={{ resize:'none' }} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
        <div>
          <label className="label">📸 Image Attachment</label>
          <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} className="input-field" style={{ padding: '8px' }} />
        </div>
        <div>
          <label className="label">🎙️ Voice Message ({audioFile ? 'Selected' : 'None'})</label>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {!recordedUrl ? (
              <>
                <input type="file" accept="audio/*" onChange={e => { setAudioFile(e.target.files?.[0] || null); setRecordedUrl(null); }} className="input-field" style={{ padding: '8px', flex:1 }} />
                <button 
                  onClick={recording ? stopRecording : startRecording} 
                  className={recording ? 'btn-danger' : 'btn-ghost'}
                  style={{ whiteSpace:'nowrap', padding:'8px 12px', borderRadius:8 }}
                  type="button"
                >
                  {recording ? '⏹️ Stop' : '🎤 Speak'}
                </button>
              </>
            ) : (
              <div style={{ display:'flex', alignItems:'center', gap:8, flex:1, background:'rgba(255,255,255,0.05)', padding:'4px 8px', borderRadius:8 }}>
                <audio src={recordedUrl} controls style={{ height:30, flex:1 }} />
                <button onClick={deleteRecording} className="btn-ghost" style={{ padding:'4px 8px', color:'#ef4444' }}>🗑️</button>
              </div>
            )}
          </div>
        </div>
      </div>
      <button onClick={handleSend} className="btn-accent" disabled={sending || !form.title || !form.message} style={{ fontSize:13 }}>
        {sent ? t('sentSuccess') : sending ? `⏳ ${t('sending')}` : t('sendBroadcast')}
      </button>
    </div>
  );
}
