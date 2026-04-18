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
    // Build service account object from individual env vars
    // (avoids needing a JSON file in the repo)
    const serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
    };

    // Validate required fields
    const required = ['project_id', 'private_key', 'client_email'];
    const missing = required.filter(k => !serviceAccount[k]);

    if (missing.length > 0) {
      console.warn(`⚠️  Firebase Admin: missing env vars [${missing.join(', ')}]. Push notifications disabled.`);
      return null;
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }

    firebaseAdmin = admin;
    console.log('✅ Firebase Admin SDK initialized');
    return firebaseAdmin;
  } catch (err) {
    console.error('❌ Firebase Admin init error:', err.message);
    return null;
  }
}

module.exports = { getFirebaseAdmin };
