'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const ALERT_TYPES: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  FIRE:        { label: 'Fire Emergency',       emoji: '🔥', color: '#ff4500', bg: 'rgba(255,69,0,0.12)' },
  FLOOD:       { label: 'Flood Warning',        emoji: '🌊', color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)' },
  ELECTRICITY: { label: 'Electricity Hazard',   emoji: '⚡', color: '#facc15', bg: 'rgba(250,204,21,0.12)' },
  MEDICAL:     { label: 'Medical Emergency',    emoji: '🚑', color: '#f43f5e', bg: 'rgba(244,63,94,0.12)' },
  DANGER:      { label: 'Dangerous Situation',  emoji: '⚠️', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
  OTHER:       { label: 'Emergency Alert',      emoji: '🚨', color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
};

// Cached set of alert IDs that the user has dismissed this session
const dismissedAlerts = new Set<string>();

export default function EmergencyAlertBanner() {
  const { user } = useAuth();
  const [activeAlert, setActiveAlert] = useState<any | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const alertIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const soundIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastAlertIdRef = useRef<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>('');

  // --- Sound Engine: Generate a siren-like alarm using Web Audio API ---
  const startAlarm = useCallback(async () => {
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      
      // Strict Guard: Only play if an alert exists
      if (!activeAlert) {
        stopAlarm();
        return;
      }

      // CRITICAL: We must ensure context is resumed
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      if (ctx.state !== 'running') return;

      // Stop previous oscillators
      oscillatorsRef.current.forEach(o => { try { o.stop(); } catch {} });
      oscillatorsRef.current = [];

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.9);
      gainNode.connect(ctx.destination);

      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      // Siren wobble: oscillate between 600Hz and 1200Hz
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.5);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 1.0);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 1.5);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 2.0);
      
      osc.connect(gainNode);
      osc.start();
      osc.stop(ctx.currentTime + 2);
      oscillatorsRef.current.push(osc);
    } catch (e) {
      console.warn('Audio context error:', e);
    }
  }, [activeAlert]); // Added activeAlert dependency since it's used in guard

  const stopAlarm = useCallback(() => {
    oscillatorsRef.current.forEach(o => { try { o.stop(); } catch {} });
    oscillatorsRef.current = [];
    if (soundIntervalRef.current) {
      clearInterval(soundIntervalRef.current);
      soundIntervalRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.suspend();
    }
  }, []);

  // Update elapsed time every minute
  useEffect(() => {
    if (!activeAlert) return;
    
    const updateElapsed = () => {
      const diff = Date.now() - new Date(activeAlert.createdAt).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) setElapsedTime('Just now');
      else if (mins < 60) setElapsedTime(`${mins}m ago`);
      else setElapsedTime(`${Math.floor(mins/60)}h ${mins%60}m ago`);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 30000);
    return () => clearInterval(interval);
  }, [activeAlert]);

  // Global click listener to resume AudioContext (browser autoplay policy)
  useEffect(() => {
    const resumeAudio = async () => {
      if (audioCtxRef.current?.state === 'suspended') {
        await audioCtxRef.current.resume();
      }
    };
    window.addEventListener('click', resumeAudio);
    window.addEventListener('touchstart', resumeAudio);
    return () => {
      window.removeEventListener('click', resumeAudio);
      window.removeEventListener('touchstart', resumeAudio);
    };
  }, []);

  // --- Watch for visibility to trigger sound ---
  useEffect(() => {
    if (visible && activeAlert && !dismissed) {
      startAlarm();
      if (!soundIntervalRef.current) {
        soundIntervalRef.current = setInterval(startAlarm, 2000);
      }
    } else {
      stopAlarm();
    }
    return () => stopAlarm();
  }, [visible, activeAlert, dismissed, startAlarm, stopAlarm]);

  // Clean up when user logs out
  useEffect(() => {
    if (!user) {
      stopAlarm();
      setVisible(false);
      setActiveAlert(null);
      lastAlertIdRef.current = null;
    }
  }, [user, stopAlarm]);

  // --- Polling: Check for active emergency alerts ---
  const checkAlerts = useCallback(async () => {
    if (!user || user.role === 'panchayat_secretary') return;
    try {
      const res = await api.getActiveEmergencyAlerts();
      const alerts: any[] = res.alerts || [];
      
      // If we are currently showing an alert that is no longer in the active list, hide it
      if (activeAlert && !alerts.find(a => a._id === activeAlert._id)) {
        setVisible(false);
        setActiveAlert(null);
        stopAlarm();
        return;
      }

      const newAlert = alerts.find(a => !dismissedAlerts.has(a._id));
      if (newAlert) {
        if (lastAlertIdRef.current !== newAlert._id) {
          lastAlertIdRef.current = newAlert._id;
          setActiveAlert(newAlert);
          setVisible(true);
          setDismissed(false);
        }
      } else {
        if (visible) {
          setVisible(false);
          setActiveAlert(null);
          lastAlertIdRef.current = null;
          stopAlarm();
        }
      }
    } catch {}
  }, [user, visible, activeAlert, stopAlarm]);

  // Start polling interval
  useEffect(() => {
    if (!user) return;
    checkAlerts();
    alertIntervalRef.current = setInterval(checkAlerts, 15000);
    return () => {
      if (alertIntervalRef.current) clearInterval(alertIntervalRef.current);
      stopAlarm();
    };
  }, [user, checkAlerts, stopAlarm]);

  const handleAcknowledge = () => {
    if (activeAlert) dismissedAlerts.add(activeAlert._id);
    stopAlarm();
    // Force stop all oscillators immediately
    oscillatorsRef.current.forEach(o => { try { o.stop(); o.disconnect(); } catch {} });
    oscillatorsRef.current = [];
    
    setVisible(false);
    setDismissed(true);
    setActiveAlert(null);
  };

  if (!user || user.role === 'panchayat_secretary' || !visible || !activeAlert) return null;

  const info = ALERT_TYPES[activeAlert.type] || ALERT_TYPES.OTHER;
  const timeStr = new Date(activeAlert.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'emergencyFadeIn 0.3s ease'
      }}>
        <div style={{
          width: '100%', maxWidth: 540,
          margin: '0 20px',
          borderRadius: 24,
          border: `3px solid ${info.color}`,
          background: 'linear-gradient(135deg, #0a0f0d 0%, #111816 100%)',
          boxShadow: `0 0 60px ${info.color}55, 0 0 120px ${info.color}22`,
          overflow: 'hidden',
          animation: 'emergencyPulse 1s ease-in-out infinite alternate',
        }}>
          <div style={{
            background: info.color,
            padding: '10px 24px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: 3, fontFamily: 'Poppins' }}>
              🚨 EMERGENCY ALERT
            </div>
            {soundIntervalRef.current && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 20, animation: 'emergencyFadeIn 0.5s ease infinite alternate' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80' }} />
                <span style={{ fontSize: 10, color: '#fff', fontWeight: 700, textTransform: 'uppercase' }}>Sound Active</span>
              </div>
            )}
            <div style={{ marginLeft: 'auto', textAlign: 'right', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}>{timeStr}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{elapsedTime}</div>
              </div>
              <button 
                onClick={handleAcknowledge}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#fff',
                  width: 28, height: 28,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 'bold'
                }}
              >
                ✕
              </button>
            </div>
          </div>

          <div style={{ padding: '32px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div style={{
                width: 80, height: 80, borderRadius: 20,
                background: info.bg,
                border: `2px solid ${info.color}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 44,
                animation: 'emergencyBounce 0.6s ease-in-out infinite alternate'
              }}>
                {info.emoji}
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: info.color, fontFamily: 'Poppins', lineHeight: 1.2 }}>
                  {info.label}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                  Emergency Alert in {activeAlert.village?.name || 'Village'}
                </div>
              </div>
            </div>

            <div style={{
              background: info.bg,
              border: `1px solid ${info.color}33`,
              borderRadius: 14,
              padding: '16px 20px',
              marginBottom: 20,
            }}>
              <p style={{ color: '#fff', fontSize: 16, lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
                {activeAlert.message}
              </p>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '14px 18px',
              marginBottom: 24,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 8, letterSpacing: 1 }}>
                IMMEDIATE ACTION
              </div>
              {activeAlert.type === 'FIRE'        && <p style={{ color: '#fff', fontSize: 13, margin: 0 }}>🔥 Evacuate immediately. Call fire station: <strong>101</strong>.</p>}
              {activeAlert.type === 'FLOOD'       && <p style={{ color: '#fff', fontSize: 13, margin: 0 }}>🌊 Move to higher ground. Avoid flooded roads.</p>}
              {activeAlert.type === 'ELECTRICITY' && <p style={{ color: '#fff', fontSize: 13, margin: 0 }}>⚡ Do not touch electrical equipment.</p>}
              {activeAlert.type === 'MEDICAL'     && <p style={{ color: '#fff', fontSize: 13, margin: 0 }}>🚑 Call ambulance: <strong>108</strong>.</p>}
              {activeAlert.type === 'DANGER'      && <p style={{ color: '#fff', fontSize: 13, margin: 0 }}>⚠️ Stay indoors. Call police: <strong>100</strong>.</p>}
              {activeAlert.type === 'OTHER'       && <p style={{ color: '#fff', fontSize: 13, margin: 0 }}>🚨 Follow instructions from authorities.</p>}
            </div>

            <button
              onClick={handleAcknowledge}
              style={{
                width: '100%', padding: '16px', borderRadius: 14,
                background: `linear-gradient(135deg, ${info.color}, ${info.color}bb)`,
                color: '#fff', fontSize: 16, fontWeight: 800,
                border: 'none', cursor: 'pointer',
                fontFamily: 'Poppins', letterSpacing: 0.5,
                boxShadow: `0 4px 24px ${info.color}55`,
              }}
            >
              ✅ I have received this alert — Stay Safe
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes emergencyFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes emergencyPulse {
          from { box-shadow: 0 0 40px ${info.color}44, 0 0 80px ${info.color}22; }
          to   { box-shadow: 0 0 80px ${info.color}88, 0 0 160px ${info.color}44; }
        }
        @keyframes emergencyBounce { from { transform: scale(1); } to { transform: scale(1.12); } }
      `}</style>
    </>
  );
}
