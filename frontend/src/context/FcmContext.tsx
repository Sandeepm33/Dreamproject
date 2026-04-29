'use client';
/**
 * FcmProvider
 *
 * Wraps the entire app to:
 * 1. Initialize FCM after a user logs in
 * 2. Show a banner asking for notification permission
 * 3. Display foreground push notifications as in-app toasts
 * 4. Clean up tokens on logout
 *
 * Place inside <AuthProvider> in layout.tsx.
 */
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFcm } from '@/hooks/useFcm';

/* ─────────────────────────────────────────────────────────────
   Toast notification types
───────────────────────────────────────────────────────────── */
interface Toast {
  id: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  createdAt: number;
}

interface FcmContextType {
  permissionStatus: string;
  requestPermission: () => Promise<boolean>;
  toasts: Toast[];
  dismissToast: (id: string) => void;
}

const FcmContext = createContext<FcmContextType | null>(null);

export function useFcmContext() {
  const ctx = useContext(FcmContext);
  if (!ctx) throw new Error('useFcmContext must be used inside FcmProvider');
  return ctx;
}

/* ─────────────────────────────────────────────────────────────
   Provider Component
───────────────────────────────────────────────────────────── */
export function FcmProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdCounter = useRef(0);
  const lastReceivedRef = useRef<{ title: string; body: string; time: number } | null>(null);

  const addToast = useCallback((title: string, body: string, data?: Record<string, string>) => {
    // Deduplication check: Ignore identical notifications within 2 seconds
    const now = Date.now();
    if (
      lastReceivedRef.current &&
      lastReceivedRef.current.title === title &&
      lastReceivedRef.current.body === body &&
      now - lastReceivedRef.current.time < 2000
    ) {
      console.log('🚫 FCM Duplicate toast blocked:', { title, body });
      return;
    }
    lastReceivedRef.current = { title, body, time: now };

    console.log('📬 FCM Notification Received:', { title, body, data });
    
    // BROADCAST an event so dashboards can auto-refresh their data
    window.dispatchEvent(new CustomEvent('fcm-message-received', { detail: { title, body, data } }));

    const id = `toast-${Date.now()}-${toastIdCounter.current++}`;
    setToasts((prev) => [...prev.slice(-4), { id, title, body, data, createdAt: Date.now() }]); // keep max 5

    // Auto-dismiss after 6 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const { permissionStatus, requestPermission, cleanupToken } = useFcm({
    onMessage: addToast,
    autoRequest: true, // FORCED ON FOR TESTING
  });

  // Clean up FCM token when user logs out
  const prevUserRef = useRef(user);
  useEffect(() => {
    if (prevUserRef.current && !user) {
      // User just logged out
      cleanupToken();
    }
    prevUserRef.current = user;
  }, [user, cleanupToken]);

  return (
    <FcmContext.Provider value={{ permissionStatus, requestPermission, toasts, dismissToast }}>
      {children}

      {/* ── Foreground Toast Notifications ── */}
      <div
        style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          pointerEvents: 'none',
        }}
        aria-live="polite"
        aria-label="Push notifications"
      >
        {toasts.map((toast) => (
          <FcmToast key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>

      {/* ── Permission Banner (shows when permission not yet granted) ── */}
      {user && permissionStatus === 'default' && (
        <NotificationPermissionBanner onRequest={requestPermission} />
      )}
    </FcmContext.Provider>
  );
}

/* ─────────────────────────────────────────────────────────────
   Toast Component
───────────────────────────────────────────────────────────── */
function FcmToast({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const url = toast.data?.url;

  return (
    <div
      onClick={() => {
        if (url) window.location.href = url;
        onDismiss(toast.id);
      }}
      title={url ? 'Click to view' : undefined}
      style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        color: '#f1f5f9',
        borderRadius: '12px',
        padding: '14px 18px',
        minWidth: '300px',
        maxWidth: '380px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        pointerEvents: 'all',
        cursor: url ? 'pointer' : 'default',
        borderLeft: '4px solid #3b82f6',
        animation: 'slideInRight 0.3s ease',
        position: 'relative',
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(120%); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#60a5fa' }}>
          🔔 {toast.title}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '1rem',
            lineHeight: 1,
            padding: '0 2px',
          }}
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
      <span style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.4 }}>
        {toast.body}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Permission Banner
───────────────────────────────────────────────────────────── */
function NotificationPermissionBanner({ onRequest }: { onRequest: () => void }) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9998,
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        color: '#f1f5f9',
        borderRadius: '14px',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        border: '1px solid #334155',
        maxWidth: '480px',
        width: 'calc(100% - 2rem)',
      }}
    >
      <span style={{ fontSize: '1.5rem' }}>🔔</span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem' }}>
          Enable Push Notifications
        </p>
        <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
          Get instant alerts when your complaints are updated.
        </p>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button
          id="fcm-enable-btn"
          onClick={() => { onRequest(); setVisible(false); }}
          style={{
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '7px 14px',
            fontWeight: 600,
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          Enable
        </button>
        <button
          onClick={() => setVisible(false)}
          style={{
            background: 'transparent',
            color: '#94a3b8',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '7px 12px',
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          Later
        </button>
      </div>
    </div>
  );
}
