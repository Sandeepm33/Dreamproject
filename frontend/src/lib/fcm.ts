/**
 * FCM utility functions for the frontend.
 *
 * - requestPermissionAndGetToken()  → asks permission, returns FCM token
 * - saveTokenToBackend(token)       → POSTs token to /api/fcm/token
 * - deleteTokenFromBackend(token)   → DELETEs token from /api/fcm/token
 * - setupForegroundListener()       → shows in-app toast for foreground pushes
 */
import { getToken, onMessage } from 'firebase/messaging';
import { getMessagingInstance } from './firebase';

const VAPID_KEY =
  'BNxWJHplLmYhX1weVJ6si0Nj9iIv24p5wcte_Xuaxvjt7wm0QVzEFNQZU97a1BHHy1i2CAihDNmIh2JPZxCNpcw';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '');

/* ─────────────────────────────────────────────────────────────
   Permission + Token
───────────────────────────────────────────────────────────── */

/**
 * Requests notification permission and retrieves an FCM token.
 * Returns the token string, or null if permission was denied / not supported.
 */
export async function requestPermissionAndGetToken(): Promise<string | null> {
  try {
    // FCM requires a service worker
    if (!('serviceWorker' in navigator)) {
      console.warn('[FCM] Service workers not supported');
      return null;
    }

    const messaging = await getMessagingInstance();
    if (!messaging) {
      console.warn('[FCM] Messaging not supported in this browser');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[FCM] Notification permission denied');
      return null;
    }

    // Register the service worker
    await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    
    // Wait for the service worker to be READY and ACTIVE
    const registration = await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log('[FCM] Token obtained:', token.substring(0, 20) + '...');
      return token;
    }

    console.warn('[FCM] No registration token available');
    return null;
  } catch (err) {
    console.error('[FCM] requestPermissionAndGetToken error:', err);
    return null;
  }
}

/* ─────────────────────────────────────────────────────────────
   Backend token sync
───────────────────────────────────────────────────────────── */

export async function saveTokenToBackend(token: string): Promise<void> {
  try {
    const authToken = localStorage.getItem('sgpims_token');
    if (!authToken) return;

    await fetch(`${API_BASE}/api/fcm/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token, platform: 'web' }),
    });
  } catch (err) {
    console.error('[FCM] saveTokenToBackend error:', err);
  }
}

export async function deleteTokenFromBackend(token: string): Promise<void> {
  try {
    const authToken = localStorage.getItem('sgpims_token');
    if (!authToken) return;

    await fetch(`${API_BASE}/api/fcm/token`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token }),
    });
  } catch (err) {
    console.error('[FCM] deleteTokenFromBackend error:', err);
  }
}

/* ─────────────────────────────────────────────────────────────
   Foreground message listener
   (Background messages are handled by the service worker)
───────────────────────────────────────────────────────────── */

type NotificationPayload = {
  title?: string;
  body?: string;
  data?: Record<string, string>;
  imageUrl?: string;
};

/**
 * Sets up foreground push listener.
 * Calls `onMessage` callback with the parsed payload.
 * Returns an unsubscribe function.
 */
export async function setupForegroundListener(
  onNotification: (payload: NotificationPayload) => void
): Promise<() => void> {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};

  const unsubscribe = onMessage(messaging, (payload) => {
    console.log('[FCM] Foreground message received:', payload);

    const notification: NotificationPayload = {
      title: payload.notification?.title,
      body: payload.notification?.body,
      data: payload.data as Record<string, string>,
      imageUrl: payload.notification?.image,
    };

    onNotification(notification);
  });

  return unsubscribe;
}

/* ─────────────────────────────────────────────────────────────
   Token refresh handling
───────────────────────────────────────────────────────────── */

/**
 * Refreshes the stored FCM token and re-syncs with backend.
 * Call on app load after login.
 */
export async function refreshFcmToken(): Promise<string | null> {
  const token = await requestPermissionAndGetToken();
  if (token) {
    await saveTokenToBackend(token);
    // Store token so we can delete it on logout
    localStorage.setItem('sgpims_fcm_token', token);
  }
  return token;
}
