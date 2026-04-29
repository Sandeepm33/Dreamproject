/**
 * Firebase Cloud Messaging Service Worker
 * Handles background push notifications when the app is not in focus.
 *
 * IMPORTANT: This file MUST be at the root of /public so it is served
 * from the same origin as the app (Next.js copies /public to /).
 */

// Import Firebase scripts from CDN (must match your firebase SDK version)
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDTVPWqCTpGIKDZUVytsw4FYUlk6s7N8n4",
  authDomain: "panchayatapp-7302f.firebaseapp.com",
  projectId: "panchayatapp-7302f",
  storageBucket: "panchayatapp-7302f.firebasestorage.app",
  messagingSenderId: "694839234687",
  appId: "1:694839234687:web:3e8baab392681f62b9af4a",
});

const messaging = firebase.messaging();

/**
 * Handle background messages.
 * The notification is displayed automatically by the browser when
 * the app is in the background or closed.
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);

  // IF the payload already has a notification object, the browser handles 
  // displaying it automatically based on the 'notification' and 'webpush' 
  // fields in the FCM message. Calling showNotification() here would 
  // cause a second, duplicate notification to appear.
  if (payload.notification) {
    console.log('[SW] Browser handling notification automatically.');
    return;
  }

  const { title = 'SGPIMS Notification', body = '' } = payload.data || {};
  const data = payload.data || {};

  const notificationOptions = {
    body,
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    image: data.image || data.imageUrl,
    data: {
      url: data.url || data.clickAction || '/',
      ...data,
    },
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  self.registration.showNotification(title, notificationOptions);
});

/**
 * Handle notification click — opens/focuses the app and navigates to the URL.
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event);
  event.notification.close();

  const url = event.notification.data?.url || '/';
  const fullUrl = self.location.origin + url;

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If app is already open, focus and navigate it
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(fullUrl);
            return;
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(fullUrl);
        }
      })
  );
});
