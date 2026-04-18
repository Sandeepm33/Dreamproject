/**
 * Firebase client-side configuration and initialization.
 * Import this module wherever you need Firebase services.
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyDTVPWqCTpGIKDZUVytsw4FYUlk6s7N8n4",
  authDomain: "panchayatapp-7302f.firebaseapp.com",
  projectId: "panchayatapp-7302f",
  storageBucket: "panchayatapp-7302f.firebasestorage.app",
  messagingSenderId: "694839234687",
  appId: "1:694839234687:web:3e8baab392681f62b9af4a",
};

// Avoid re-initializing on hot-reloads
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

/**
 * Returns the Firebase Messaging instance, or null if the browser
 * doesn't support it (e.g. Safari without permission, or SSR).
 */
export async function getMessagingInstance() {
  const supported = await isSupported();
  if (!supported) return null;
  return getMessaging(app);
}

export { app };
