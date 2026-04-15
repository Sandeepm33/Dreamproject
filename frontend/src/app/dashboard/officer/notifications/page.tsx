'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import { api } from '@/lib/api';

export default function OfficerNotificationsPage() {
  const { user } = useAuth();
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

  const basePath = '/dashboard/officer';

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg-dark)' }}>
      <Sidebar />
      <main style={{ flex:1, marginLeft:280, padding:'28px', maxWidth:'calc(100vw - 280px)' }}>
        <div style={{ maxWidth:680, margin:'0 auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
            <div>
              <h1 style={{ fontSize:24, fontWeight:800, fontFamily:'Poppins', color:'var(--text-primary)' }}>
                🔔 Notifications {unread > 0 && <span style={{ fontSize:14,background:'var(--accent)',color:'#0a0f0d',borderRadius:20,padding:'2px 10px',marginLeft:8 }}>{unread} new</span>}
              </h1>
              <p style={{ color:'var(--text-muted)', fontSize:14 }}>{notifications.length} total notifications</p>
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} className="btn-ghost" style={{ fontSize:13 }}>✓ Mark all read</button>
            )}
          </div>

          {loading ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {[...Array(5)].map((_,i) => <div key={i} className="skeleton" style={{ height:80, borderRadius:14 }} />)}
            </div>
          ) : notifications.length === 0 ? (
            <div className="glass-card" style={{ padding:'60px', textAlign:'center' }}>
              <div style={{ fontSize:56, marginBottom:16 }}>🔕</div>
              <p style={{ color:'var(--text-muted)', fontSize:15 }}>No notifications yet</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {notifications.map(n => (
                <div key={n._id} onClick={() => { if (!n.isRead) markRead(n._id); if (n.complaint) router.push(`${basePath}/assigned`); }}
                  style={{ padding:'16px 20px', borderRadius:14, border:`1px solid ${n.isRead ? 'var(--border)' : 'rgba(245,158,11,0.3)'}`, background:n.isRead ? 'rgba(255,255,255,0.01)' : 'rgba(245,158,11,0.05)', cursor:'pointer', transition:'all 0.2s', display:'flex', gap:14, alignItems:'flex-start' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(45,106,79,0.5)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = n.isRead ? 'var(--border)' : 'rgba(245,158,11,0.3)'; }}>
                  <div style={{ width:42,height:42,borderRadius:12,background:`rgba(${n.isRead?'255,255,255':'245,158,11'},0.05)`,border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0 }}>
                    {typeIcons[n.type] || '📢'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div style={{ fontSize:14, fontWeight:n.isRead ? 500 : 700, color:'var(--text-primary)' }}>{n.title}</div>
                      {!n.isRead && <div style={{ width:8,height:8,borderRadius:'50%',background:'var(--accent)',flexShrink:0,marginTop:6 }} />}
                    </div>
                    <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:3 }}>{n.message}</div>
                    {n.complaint && <div style={{ fontSize:11, color:'var(--accent)', marginTop:4 }}>📋 {n.complaint.complaintId}</div>}
                    <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>{new Date(n.createdAt).toLocaleDateString('en-IN', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
