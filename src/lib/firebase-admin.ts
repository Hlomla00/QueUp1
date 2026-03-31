/**
 * Firebase Admin SDK initialisation (singleton).
 * Uses FIREBASE_SERVICE_ACCOUNT_KEY env var if present,
 * otherwise falls back to Application Default Credentials.
 */
import * as admin from 'firebase-admin';

function getApp(): admin.app.App {
  if (admin.apps.length > 0) return admin.apps[0]!;

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  }

  // Application Default Credentials (works on Firebase App Hosting / Cloud Run)
  return admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

export const adminApp = getApp();
export const db = admin.firestore(adminApp);
export const adminAuth = admin.auth(adminApp);
export { admin };
