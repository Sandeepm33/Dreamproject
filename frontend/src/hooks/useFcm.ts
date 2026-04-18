'use client';
/**
 * useFcm Hook
 *
 * Manages the entire FCM lifecycle:
 * 1. Registers the service worker
 * 2. Requests notification permission
 * 3. Gets an FCM token and saves it to the backend
 * 4. Listens for foreground messages → shows a toast
 * 5. Handles token refresh on re-mount
 * 6. Cleans up on component unmount
 *
 * Usage:
 *   const { permissionStatus, isReady, requestPermission } = useFcm();
 *
 * Place <FcmProvider> inside <AuthProvider> so it has access to the user.
 */
import { useEffect, useState, useCallback } from 'react';
import {
  requestPermissionAndGetToken,
  saveTokenToBackend,
  setupForegroundListener,
  deleteTokenFromBackend,
} from '@/lib/fcm';

export type FcmPermissionStatus = 'default' | 'granted' | 'denied' | 'unsupported';

interface UseFcmOptions {
  /** Called when a foreground message arrives */
  onMessage?: (title: string, body: string, data?: Record<string, string>) => void;
  /** Whether to auto-request permission on mount (default: false) */
  autoRequest?: boolean;
}

export function useFcm({ onMessage, autoRequest = false }: UseFcmOptions = {}) {
  const [permissionStatus, setPermissionStatus] = useState<FcmPermissionStatus>('default');
  const [isReady, setIsReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  /* ─── Initialize ─── */
  const initializeFcm = useCallback(async () => {
    if (typeof window === 'undefined') return; // SSR guard

    // Check current permission state without prompting
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setPermissionStatus('unsupported');
      return;
    }

    const currentPermission = Notification.permission as FcmPermissionStatus;
    setPermissionStatus(currentPermission);

    if (currentPermission === 'granted') {
      const existingToken = await requestPermissionAndGetToken();
      if (existingToken) {
        setToken(existingToken);
        await saveTokenToBackend(existingToken);
        localStorage.setItem('sgpims_fcm_token', existingToken);
        setIsReady(true);
      }
    }
  }, []);

  /* ─── Request permission (called by UI button) ─── */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    const newToken = await requestPermissionAndGetToken();
    if (newToken) {
      setToken(newToken);
      setPermissionStatus('granted');
      await saveTokenToBackend(newToken);
      localStorage.setItem('sgpims_fcm_token', newToken);
      setIsReady(true);
      return true;
    }
    setPermissionStatus(Notification.permission as FcmPermissionStatus);
    return false;
  }, []);

  /* ─── Cleanup token on logout ─── */
  const cleanupToken = useCallback(async () => {
    const storedToken = localStorage.getItem('sgpims_fcm_token');
    if (storedToken) {
      await deleteTokenFromBackend(storedToken);
      localStorage.removeItem('sgpims_fcm_token');
      setToken(null);
      setIsReady(false);
    }
  }, []);

  /* ─── Mount effects ─── */
  useEffect(() => {
    initializeFcm();
    if (autoRequest) requestPermission();
  }, [initializeFcm, autoRequest, requestPermission]);

  /* ─── Foreground listener ─── */
  useEffect(() => {
    if (!isReady || !onMessage) return;

    let unsubscribe: (() => void) | null = null;

    setupForegroundListener((payload) => {
      const title = payload.title || 'SGPIMS Notification';
      const body = payload.body || '';
      onMessage(title, body, payload.data);
    }).then((fn) => {
      unsubscribe = fn;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isReady, onMessage]);

  return {
    permissionStatus,
    isReady,
    token,
    requestPermission,
    cleanupToken,
  };
}
