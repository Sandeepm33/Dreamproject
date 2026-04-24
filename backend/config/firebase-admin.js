/**
 * Firebase Admin SDK Initialization
 * Uses service account credentials from environment variables
 * to avoid committing secrets to version control.
 */
const admin = require('firebase-admin');

let firebaseAdmin = null;

function getFirebaseAdmin() {
  if (firebaseAdmin) return firebaseAdmin;

  try {
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    if (privateKey) {
      // Robust parsing for production environments (Vercel, Amplify, etc.)
      // 1. Remove surrounding quotes if they were pasted into the env UI
      privateKey = privateKey.trim();
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.substring(1, privateKey.length - 1);
      }
      // 2. Convert literal \n strings back to actual newlines
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    const serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: privateKey,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
    };

    // Validate required fields
    const required = ['project_id', 'private_key', 'client_email'];
    const missing = required.filter(k => !serviceAccount[k]);

    if (missing.length > 0) {
      console.warn(`[FCM] Missing env vars [${missing.join(', ')}]. Push notifications will be skipped.`);
      return null;
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log(`✅ [FCM] Firebase Admin SDK initialized for project: ${serviceAccount.project_id}`);
    }

    firebaseAdmin = admin;
    return firebaseAdmin;
  } catch (err) {
    console.error('❌ [FCM] Firebase Admin init error:', err.message);
    return null;
  }
}

module.exports = { getFirebaseAdmin };
