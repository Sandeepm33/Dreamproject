'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

// ─────────────────────────────────────────────
// Emergency Types Configuration
// ─────────────────────────────────────────────
const EMERGENCY_TYPES = [
  { id: 'FIRE',        emoji: '🔥', label: 'Fire',               sublabel: 'Building / Forest fire',    color: '#ff4500', bg: 'rgba(255,69,0,0.12)',       border: 'rgba(255,69,0,0.4)' },
  { id: 'FLOOD',       emoji: '🌊', label: 'Flood',              sublabel: 'Waterlogging / Flash flood', color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)',    border: 'rgba(14,165,233,0.4)' },
  { id: 'ELECTRICITY', emoji: '⚡', label: 'Electricity Hazard', sublabel: 'Live wire / Outage',         color: '#facc15', bg: 'rgba(250,204,21,0.12)',    border: 'rgba(250,204,21,0.4)' },
  { id: 'MEDICAL',     emoji: '🚑', label: 'Medical Emergency',  sublabel: 'Mass casualty / Epidemic',  color: '#f43f5e', bg: 'rgba(244,63,94,0.12)',     border: 'rgba(244,63,94,0.4)' },
  { id: 'DANGER',      emoji: '🐍', label: 'Dangerous Situation',sublabel: 'Threat / Wild animal',      color: '#f97316', bg: 'rgba(249,115,22,0.12)',    border: 'rgba(249,115,22,0.4)' },
  { id: 'OTHER',       emoji: '🚨', label: 'Other Emergency',    sublabel: 'Specify in message',        color: '#a855f7', bg: 'rgba(168,85,247,0.12)',    border: 'rgba(168,85,247,0.4)' },
];

const typeIcons: Record<string, string> = {
  complaint_created: '📋', status_update: '🔄', escalation: '🚨',
  vote: '👍', resolution: '✅', general: '📢', EMERGENCY: '🆘'
};

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────
export default function NotificationsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);

  const isSecretary = user?.role === 'panchayat_secretary' || (user?.role === 'collector' || user?.role === 'secretariat_office');
  const isAdmin = user?.role === 'admin' || isSecretary;
  const basePath = isAdmin ? '/dashboard/admin' : '/dashboard/citizen';

  const loadNotifications = useCallback(async () => {
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
      setUnread(res.unreadCount || 0);
    } catch {}
    finally { setLoading(false); }
  }, []);

  const loadActiveAlerts = useCallback(async () => {
    if (!isSecretary) return;
    try {
      const res = await api.getActiveEmergencyAlerts();
      setActiveAlerts(res.alerts || []);
    } catch {}
  }, [isSecretary]);

  useEffect(() => {
    if (user) {
      loadNotifications();
      loadActiveAlerts();
    }
  }, [user, loadNotifications, loadActiveAlerts]);

  // Auto-refresh every 10s
  useEffect(() => {
    if (!user) return;
    const t1 = setInterval(loadNotifications, 10000);
    const t2 = setInterval(loadActiveAlerts, 15000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [user, loadNotifications, loadActiveAlerts]);

  const markRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnread(u => Math.max(0, u - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnread(0);
    } catch {}
  };

  const deleteNotif = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
      // Re-fetch unread count
      const res = await api.getNotifications();
      setUnread(res.unreadCount || 0);
    } catch (err: any) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const clearAll = async () => {
    if (!window.confirm(t('confirmClearAll') || 'Clear all notifications?')) return;
    try {
      await api.clearAllNotifications();
      setNotifications([]);
      setUnread(0);
    } catch (err: any) {
      alert('Failed to clear: ' + err.message);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    if (!window.confirm('Delete this alert permanently?')) return;
    try {
      await api.deleteEmergencyAlert(alertId);
      await loadActiveAlerts();
    } catch {}
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await api.resolveEmergencyAlert(alertId);
      await loadActiveAlerts();
    } catch {}
  };

  const localizeNotif = (title: string, message: string, complaintId?: string) => {
    let finalTitle = title;
    let finalMessage = message;
    if (title === 'Status Updated') finalTitle = t('statusUpdatedTitle');
    if (title === 'Complaint Assigned') finalTitle = t('complaintAssignedTitle');
    if (title === 'Complaint Submitted') finalTitle = t('complaintSubmittedTitle');
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
        finalMessage = t('notifAssignedTo').replace('{id}', match[1]).replace('{dept}', match[2]);
      }
    } else if (message.includes('has been successfully submitted')) {
      finalMessage = t('notifSubmittedSuccess').replace('{id}', complaintId || '');
    }
    return { title: finalTitle, message: finalMessage };
  };

  return (
    <div className="animate-fade-in">
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

          {/* ── Page Header ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Poppins', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                🔔 {t('notifications')}
                {unread > 0 && (
                  <span style={{ fontSize: 14, background: 'var(--accent)', color: '#0a0f0d', borderRadius: 20, padding: '2px 10px' }}>
                    {t('newNotifications').replace('{count}', unread.toString())}
                  </span>
                )}
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{t('totalNotifications').replace('{count}', notifications.length.toString())}</p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {unread > 0 && (
                <button onClick={markAllRead} className="btn-ghost" style={{ fontSize: 13, padding: '8px 12px' }}>{t('markAllRead')}</button>
              )}
              {isSecretary && notifications.length > 0 && (
                <button onClick={clearAll} className="btn-ghost" style={{ fontSize: 13, color: '#ef4444', padding: '8px 12px' }}>🗑️ {t('clearAll') || 'Clear'}</button>
              )}
            </div>
          </div>

          {/* ── 🚨 EMERGENCY BUTTON (Secretary/Collector only) ── */}
          {isSecretary && (
            <EmergencySection
              activeAlerts={activeAlerts}
              onLaunch={() => setShowEmergencyModal(true)}
              onResolve={handleResolveAlert}
              onDelete={handleDeleteAlert}
            />
          )}

          {/* ── Admin Broadcast ── */}
          {isAdmin && <AdminBroadcast t={t} onSuccess={loadNotifications} />}

          {/* ── Notifications list ── */}
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 14 }} />)}
            </div>
          ) : notifications.length === 0 ? (
            <div className="glass-card" style={{ padding: '60px', textAlign: 'center' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🔕</div>
              <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>{t('noNotifications')}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {notifications.map(n => {
                const { title, message } = localizeNotif(n.title, n.message, n.complaint?.complaintId);
                const isEmergency = n.type === 'EMERGENCY';
                return (
                  <div
                    key={n._id}
                    onClick={() => { if (!n.isRead) markRead(n._id); if (n.complaint) router.push(`${basePath}/complaints/${n.complaint._id}`); }}
                    style={{
                      padding: '16px 20px', borderRadius: 14, cursor: 'pointer', transition: 'all 0.2s',
                      display: 'flex', gap: 14, alignItems: 'flex-start',
                      border: isEmergency ? '1px solid rgba(255,69,0,0.5)' : `1px solid ${n.isRead ? 'var(--border)' : 'rgba(245,158,11,0.3)'}`,
                      background: isEmergency ? 'rgba(255,69,0,0.06)' : n.isRead ? 'rgba(255,255,255,0.01)' : 'rgba(245,158,11,0.05)',
                      animation: isEmergency && !n.isRead ? 'emergencyGlow 2s ease-in-out infinite alternate' : 'none',
                      position: 'relative'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = isEmergency ? 'rgba(255,69,0,0.8)' : 'rgba(45,106,79,0.5)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = isEmergency ? 'rgba(255,69,0,0.5)' : n.isRead ? 'var(--border)' : 'rgba(245,158,11,0.3)'; }}
                  >
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: isEmergency ? 'rgba(255,69,0,0.15)' : `rgba(${n.isRead ? '255,255,255' : '245,158,11'},0.05)`, border: `1px solid ${isEmergency ? 'rgba(255,69,0,0.4)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                      {typeIcons[n.type] || '📢'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ fontSize: 14, fontWeight: n.isRead ? 500 : 700, color: isEmergency ? '#ff6b35' : 'var(--text-primary)' }}>{title}</div>
                        {!n.isRead && <div style={{ width: 8, height: 8, borderRadius: '50%', background: isEmergency ? '#ff4500' : 'var(--accent)', flexShrink: 0, marginTop: 6 }} />}
                      </div>
                      {isSecretary && (
                        <button
                          onClick={(e) => deleteNotif(e, n._id)}
                          style={{
                            position: 'absolute', top: 12, right: 12,
                            background: 'rgba(255,255,255,0.05)', border: 'none',
                            color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
                            width: 24, height: 24, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 14, transition: 'all 0.2s', zIndex: 5
                          }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = '#ef4444'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                          title="Delete"
                        >
                          ✕
                        </button>
                      )}
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>{message}</div>
                      {n.complaint && <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4 }}>📋 {n.complaint.complaintId}</div>}
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
    </div>

      {/* Emergency Modal */}
      {showEmergencyModal && (
        <EmergencyModal
          onClose={() => setShowEmergencyModal(false)}
          onSuccess={() => { setShowEmergencyModal(false); loadActiveAlerts(); loadNotifications(); }}
        />
      )}

      <style>{`
        @keyframes emergencyGlow {
          from { box-shadow: 0 0 0 rgba(255,69,0,0); }
          to   { box-shadow: 0 0 16px rgba(255,69,0,0.3); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────
// Emergency section – displayed only for Secretary
// ─────────────────────────────────────────────
function EmergencySection({ activeAlerts, onLaunch, onResolve, onDelete }: { activeAlerts: any[]; onLaunch: () => void; onResolve: (id: string) => void; onDelete: (id: string) => void }) {
  const COLORS: Record<string, string> = {
    FIRE: '#ff4500', FLOOD: '#0ea5e9', ELECTRICITY: '#facc15',
    MEDICAL: '#f43f5e', DANGER: '#f97316', OTHER: '#a855f7'
  };
  const EMOJIS: Record<string, string> = {
    FIRE: '🔥', FLOOD: '🌊', ELECTRICITY: '⚡', MEDICAL: '🚑', DANGER: '⚠️', OTHER: '🚨'
  };

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Emergency Button */}
      <div style={{
        borderRadius: 20, padding: 24,
        background: 'linear-gradient(135deg, rgba(255,45,0,0.08) 0%, rgba(200,0,0,0.04) 100%)',
        border: '1.5px solid rgba(255,69,0,0.4)',
        marginBottom: activeAlerts.length > 0 ? 16 : 0,
        display: 'flex', alignItems: 'center', gap: 20,
        boxShadow: '0 4px 24px rgba(255,69,0,0.1)',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#ff6b35', fontFamily: 'Poppins', marginBottom: 4 }}>
            🆘 Village Emergency
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', maxWidth: '100%', lineHeight: 1.5 }}>
            Press to send an immediate high-priority alert to all registered citizens and officers in your village.
          </div>
        </div>
        <button
          id="emergency-trigger-btn"
          onClick={onLaunch}
          style={{
            padding: '14px 28px',
            borderRadius: 14,
            background: 'linear-gradient(135deg, #ff4500, #cc2200)',
            color: '#fff',
            fontWeight: 900,
            fontSize: 15,
            fontFamily: 'Poppins',
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0,
            width: '100%',
            maxWidth: '240px',
            letterSpacing: 0.5,
            boxShadow: '0 4px 20px rgba(255,69,0,0.5)',
            transition: 'all 0.2s',
            animation: 'emergencyBtnPulse 2s ease-in-out infinite',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(255,69,0,0.7)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(255,69,0,0.5)'; }}
        >
          🚨 EMERGENCY
        </button>
      </div>

      {/* Active Alerts Panel */}
      {activeAlerts.length > 0 && (
        <div style={{ borderRadius: 16, padding: '16px 20px', background: 'rgba(255,69,0,0.06)', border: '1px solid rgba(255,69,0,0.3)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#ff6b35', marginBottom: 12, letterSpacing: 1 }}>
            🔴 ACTIVE ONGOING ALERTS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeAlerts.map(a => {
              const c = COLORS[a.type] || '#a855f7';
              const e = EMOJIS[a.type] || '🚨';
              return (
                <div key={a._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: `1px solid ${c}33` }}>
                  <span style={{ fontSize: 22 }}>{e}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: c }}>{a.type}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{a.message}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                      {new Date(a.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  {/* <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => onResolve(a._id)}
                      style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                    >
                      ✅ Resolve
                    </button>
                    <button
                      onClick={() => onDelete(a._id)}
                      style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                    >
                      🗑️ Delete
                    </button>
                  </div> */}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes emergencyBtnPulse {
          0%, 100% { box-shadow: 0 4px 20px rgba(255,69,0,0.5); }
          50%       { box-shadow: 0 4px 36px rgba(255,69,0,0.9), 0 0 0 6px rgba(255,69,0,0.15); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────
// Emergency Modal with 2-step verification
// ─────────────────────────────────────────────
function EmergencyModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);       // 1=select type, 2=confirm+PIN, 3=sending
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [locationDesc, setLocationDesc] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [countdownActive, setCountdownActive] = useState(false);
  const [villages, setVillages] = useState<any[]>([]);
  const [targetVillageId, setTargetVillageId] = useState<string>('');

  // Fetch villages if user is collector
  useEffect(() => {
    if ((user?.role === 'collector' || user?.role === 'secretariat_office')) {
      api.getVillages().then(res => setVillages(res.villages || []));
    }
  }, [user]);

  // Set initial target village for secretary
  useEffect(() => {
    if (user?.role === 'panchayat_secretary' && user.village) {
      setTargetVillageId((user.village as any)._id || user.village);
    }
  }, [user]);

  // The PIN is last 4 digits of the user's mobile number
  const expectedPin = user?.mobile ? user.mobile.slice(-4) : '0000';

  const selectedTypeInfo = EMERGENCY_TYPES.find(t => t.id === selectedType);

  const handleNext = () => {
    if (step === 1 && selectedType && message.trim()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 2) { setStep(1); setPin(''); setPinError(''); setCountdownActive(false); if (countdownRef.current) clearInterval(countdownRef.current); setCountdown(5); }
  };

  const startCountdown = () => {
    if (pin.length !== 4) { setPinError('Enter 4-digit PIN (last 4 digits of your mobile number)'); return; }
    if (pin !== expectedPin) { setPinError('Incorrect PIN. Please try again.'); setPin(''); return; }
    setPinError('');
    setCountdownActive(true);
    setCountdown(5);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSend = async () => {
    if (countdown > 0) return;
    setSending(true);
    setSent(false);
    try {
      await api.createEmergencyAlert({
        type: selectedType!,
        message,
        villageId: targetVillageId,
        location: locationDesc ? { description: locationDesc } : undefined,
      });
      setSent(true);
      setTimeout(() => onSuccess(), 1500);
    } catch (err: any) {
      setPinError(err.message || 'Failed to send alert');
      setSending(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current); }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 8000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.2s ease',
    }}>
      <div style={{
        width: '100%', maxWidth: 560, margin: '20px',
        maxHeight: 'calc(100vh - 40px)',
        display: 'flex', flexDirection: 'column',
        borderRadius: 24, overflow: 'hidden',
        background: 'linear-gradient(135deg, #0d1512 0%, #111816 100%)',
        border: `2px solid ${selectedTypeInfo ? selectedTypeInfo.color + '88' : 'rgba(255,69,0,0.4)'}`,
        boxShadow: `0 24px 80px rgba(0,0,0,0.8)`,
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(255,69,0,0.08)', borderBottom: '1px solid rgba(255,69,0,0.2)',
          flexShrink: 0
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#ff6b35', fontFamily: 'Poppins' }}>
              🚨 Emergency Alert
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              Step {step} of 2 — {step === 1 ? 'Select Type & Message' : 'Confirm & Send'}
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {/* Step progress bar */}
        <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <div style={{ height: '100%', width: step === 1 ? '50%' : '100%', background: 'linear-gradient(90deg, #ff4500, #ff6b35)', transition: 'width 0.4s ease' }} />
        </div>

        <div className="custom-scrollbar" style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* ─── STEP 1: Choose Type + Message ─── */}
          {step === 1 && (
            <>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 14 }}>
                Select Emergency Type:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 20 }}>
                {EMERGENCY_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    style={{
                      padding: '12px 14px', borderRadius: 14, textAlign: 'left', cursor: 'pointer',
                      background: selectedType === type.id ? type.bg : 'rgba(255,255,255,0.03)',
                      border: `2px solid ${selectedType === type.id ? type.border : 'rgba(255,255,255,0.08)'}`,
                      transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 10,
                    }}
                    onMouseEnter={e => { if (selectedType !== type.id) e.currentTarget.style.borderColor = type.border + '88'; }}
                    onMouseLeave={e => { if (selectedType !== type.id) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                  >
                    <span style={{ fontSize: 22 }}>{type.emoji}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: selectedType === type.id ? type.color : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{type.label}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{type.sublabel}</div>
                    </div>
                  </button>
                ))}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>
                  Describe the Emergency: <span style={{ color: '#ff4500' }}>*</span>
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="e.g. Fire broke out near the school building. Immediate help needed."
                  rows={3}
                  className="input-field"
                  style={{ resize: 'none', borderColor: message ? 'rgba(255,69,0,0.4)' : undefined }}
                />
              </div>

              {(user?.role === 'collector' || user?.role === 'secretariat_office') && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>
                    🎯 Target Village: <span style={{ color: '#ff4500' }}>*</span>
                  </label>
                  <select
                    value={targetVillageId}
                    onChange={e => setTargetVillageId(e.target.value)}
                    className="input-field"
                    style={{ borderColor: targetVillageId ? 'rgba(255,69,0,0.4)' : undefined }}
                  >
                    <option value="">Select Village...</option>
                    {villages.map(v => (
                      <option key={v._id} value={v._id}>{v.name} ({v.villageCode})</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>
                  📍 Location Description (Optional):
                </label>
                <input
                  value={locationDesc}
                  onChange={e => setLocationDesc(e.target.value)}
                  placeholder="e.g. Near the old banyan tree, main road"
                  className="input-field"
                />
              </div>

              <button
                onClick={handleNext}
                disabled={!selectedType || !message.trim() || !targetVillageId}
                style={{
                  width: '100%', padding: '14px', borderRadius: 12, fontSize: 15, fontWeight: 800,
                  fontFamily: 'Poppins', border: 'none', cursor: (!selectedType || !message.trim() || !targetVillageId) ? 'not-allowed' : 'pointer',
                  background: (!selectedType || !message.trim() || !targetVillageId) ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #ff4500, #cc2200)',
                  color: (!selectedType || !message.trim() || !targetVillageId) ? 'rgba(255,255,255,0.3)' : '#fff',
                  transition: 'all 0.2s',
                  boxShadow: (!selectedType || !message.trim() || !targetVillageId) ? 'none' : '0 4px 20px rgba(255,69,0,0.4)',
                }}
              >
                Next: Confirm & Send →
              </button>
            </>
          )}

          {/* ─── STEP 2: PIN confirmation + send ─── */}
          {step === 2 && selectedTypeInfo && (
            <>
              {/* Summary box */}
              <div style={{
                padding: '16px 18px', borderRadius: 14, marginBottom: 20,
                background: selectedTypeInfo.bg,
                border: `1px solid ${selectedTypeInfo.border}`,
                display: 'flex', gap: 14, alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: 36 }}>{selectedTypeInfo.emoji}</span>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: selectedTypeInfo.color, fontFamily: 'Poppins' }}>{selectedTypeInfo.label}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>{message}</div>
                  {locationDesc && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>📍 {locationDesc}</div>}
                </div>
              </div>

              {/* Scope info */}
              <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 20, fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
                High priority alert will be broadcasted to all citizens and officers.
              </div>

              {/* PIN entry (last 4 digits of mobile) */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 8 }}>
                  🔒 Enter your Security PIN to confirm:
                </label>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>
                  Your PIN = last 4 digits of your registered mobile number
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="password"
                    maxLength={4}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={pin}
                    onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setPinError(''); }}
                    placeholder="• • • •"
                    className="input-field"
                    style={{ letterSpacing: 8, fontSize: 20, textAlign: 'center', fontWeight: 800, flex: 1, borderColor: pinError ? '#ef4444' : pin.length === 4 ? 'rgba(34,197,94,0.6)' : undefined }}
                    disabled={countdownActive}
                  />
                  {!countdownActive && (
                    <button
                      onClick={startCountdown}
                      disabled={pin.length !== 4}
                      style={{
                        padding: '0 16px', borderRadius: 10,
                        background: pin.length === 4 ? 'rgba(255,69,0,0.2)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${pin.length === 4 ? 'rgba(255,69,0,0.5)' : 'rgba(255,255,255,0.1)'}`,
                        color: pin.length === 4 ? '#ff6b35' : 'rgba(255,255,255,0.3)', cursor: pin.length === 4 ? 'pointer' : 'not-allowed',
                        fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
                      }}
                    >
                      Verify →
                    </button>
                  )}
                </div>
                {pinError && <div style={{ fontSize: 12, color: '#ef4444', marginTop: 6 }}>⚠️ {pinError}</div>}
              </div>

              {/* Countdown / Send button */}
              {countdownActive && (
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  {countdown > 0 ? (
                    <div style={{ padding: '14px', borderRadius: 12, background: 'rgba(255,69,0,0.08)', border: '1px solid rgba(255,69,0,0.3)' }}>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
                        PIN verified ✅ — Sending in
                      </div>
                      <div style={{ fontSize: 48, fontWeight: 900, color: '#ff4500', fontFamily: 'Poppins', lineHeight: 1, animation: 'emergencyBounce 0.5s ease-in-out infinite alternate' }}>
                        {countdown}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>
                        Alert sends in {countdown} second{countdown !== 1 ? 's' : ''}…
                      </div>
                    </div>
                  ) : sent ? (
                    <div style={{ padding: '20px', borderRadius: 12, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.4)', textAlign: 'center' }}>
                      <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#22c55e', fontFamily: 'Poppins' }}>Alert Sent!</div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>All citizens have been notified.</div>
                    </div>
                  ) : (
                    <button
                      onClick={handleSend}
                      disabled={sending}
                      style={{
                        width: '100%', padding: '16px', borderRadius: 12, fontSize: 16, fontWeight: 900,
                        fontFamily: 'Poppins', border: 'none', cursor: sending ? 'wait' : 'pointer',
                        background: sending ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #ff4500, #cc1100)',
                        color: sending ? 'rgba(255,255,255,0.3)' : '#fff',
                        boxShadow: sending ? 'none' : '0 4px 24px rgba(255,69,0,0.6)',
                        animation: !sending ? 'emergencyBtnPulse 1.5s ease-in-out infinite' : 'none',
                      }}
                    >
                      {sending ? '⏳ Sending Alert...' : '🚨 SEND EMERGENCY ALERT NOW'}
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={handleBack}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer', padding: 0 }}
              >
                ← Back
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
        @keyframes emergencyBounce { from { transform:scale(1); } to { transform:scale(1.08); } }
        @keyframes emergencyBtnPulse {
          0%, 100% { box-shadow: 0 4px 24px rgba(255,69,0,0.6); }
          50%       { box-shadow: 0 4px 40px rgba(255,69,0,1), 0 0 0 6px rgba(255,69,0,0.2); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────
// Admin broadcast panel (unchanged from original)
// ─────────────────────────────────────────────
function AdminBroadcast({ t, onSuccess }: { t: any, onSuccess: () => void }) {
  const [form, setForm] = useState({ title: '', message: '', targetRole: 'all' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setRecordedUrl(URL.createObjectURL(blob));
        setAudioFile(new File([blob], 'recording.webm', { type: 'audio/webm' }));
      };
      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch {}
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
      setRecording(false);
    }
  };

  const handleSend = async () => {
    if (!form.title || !form.message) return;
    setSending(true);
    let imageUrl, audioUrl;
    try {
      if (imageFile || audioFile) {
        const res = await api.uploadFiles([imageFile, audioFile].filter(Boolean) as File[]);
        if (res.success && res.files) {
          const img = res.files.find((f: any) => f.type === 'image');
          const aud = res.files.find((f: any) => f.type === 'audio' || f.type === 'video');
          if (img) imageUrl = img.url;
          if (aud) audioUrl = aud.url;
        }
      }
      await api.broadcastNotification({ title: form.title, message: form.message, targetRole: form.targetRole === 'all' ? undefined : form.targetRole, imageUrl, audioUrl });
      setSent(true);
      onSuccess();
      setForm({ title: '', message: '', targetRole: 'all' });
      setImageFile(null); setAudioFile(null); setRecordedUrl(null);
      setTimeout(() => setSent(false), 3000);
    } catch {}
    finally { setSending(false); }
  };

  return (
    <div className="glass-card" style={{ padding: 20, marginBottom: 24, border: '1px solid rgba(245,158,11,0.2)' }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginBottom: 14 }}>📢 {t('broadcast')}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label className="label">{t('issueTitle')}</label>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input-field" placeholder={t('notifTitlePlaceholder')} />
        </div>
        <div>
          <label className="label">{t('target')}</label>
          <select value={form.targetRole} onChange={e => setForm(f => ({ ...f, targetRole: e.target.value }))} className="input-field">
            <option value="all">{t('allUsers')}</option>
            <option value="citizen">{t('citizensOnly')}</option>
            <option value="officer">{t('officersOnly')}</option>
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label className="label">{t('description')}</label>
        <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} className="input-field" placeholder={t('notifMessagePlaceholder')} rows={2} style={{ resize: 'none' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <label className="label">📸 Image Attachment</label>
          <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} className="input-field" style={{ padding: '8px' }} />
        </div>
        <div>
          <label className="label">🎙️ Voice Message ({audioFile ? 'Selected' : 'None'})</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!recordedUrl ? (
              <>
                <input type="file" accept="audio/*" onChange={e => { setAudioFile(e.target.files?.[0] || null); setRecordedUrl(null); }} className="input-field" style={{ padding: '8px', flex: 1 }} />
                <button onClick={recording ? stopRecording : startRecording} className={recording ? 'btn-danger' : 'btn-ghost'} style={{ whiteSpace: 'nowrap', padding: '8px 12px', borderRadius: 8 }} type="button">
                  {recording ? '⏹️ Stop' : '🎤 Speak'}
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: 8 }}>
                <audio src={recordedUrl} controls style={{ height: 30, flex: 1 }} />
                <button onClick={() => { setAudioFile(null); setRecordedUrl(null); if (recording) stopRecording(); }} className="btn-ghost" style={{ padding: '4px 8px', color: '#ef4444' }}>🗑️</button>
              </div>
            )}
          </div>
        </div>
      </div>
      <button onClick={handleSend} className="btn-accent" disabled={sending || !form.title || !form.message} style={{ fontSize: 13 }}>
        {sent ? t('sentSuccess') : sending ? `⏳ ${t('sending')}` : t('sendBroadcast')}
      </button>
    </div>
  );
}
