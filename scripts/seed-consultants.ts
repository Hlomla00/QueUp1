/**
 * scripts/seed-consultants.ts
 *
 * Creates the two initial consultant accounts in Firebase Auth and writes
 * their profile documents to Firestore /users/{uid}.
 *
 * Run once after configuring your Firebase project:
 *   npx tsx scripts/seed-consultants.ts
 *
 * Requires these env vars in .env.local:
 *   FIREBASE_ADMIN_PROJECT_ID
 *   FIREBASE_ADMIN_CLIENT_EMAIL
 *   FIREBASE_ADMIN_PRIVATE_KEY
 *
 * Re-running is safe — existing accounts are updated rather than re-created.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import * as admin from 'firebase-admin';

// ── Initialise Admin SDK ──────────────────────────────────────────────────────

if (!admin.apps.length) {
  const projectId   = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.error(
      '❌  Missing Firebase Admin credentials.\n' +
      '   Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL,\n' +
      '   and FIREBASE_ADMIN_PRIVATE_KEY in .env.local'
    );
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    projectId,
  });
}

const authAdmin = admin.auth();
const db        = admin.firestore();

// ── Consultant definitions ────────────────────────────────────────────────────

const CONSULTANTS = [
  {
    displayName: 'Kamvelihle Ngqotywa',
    email:       'ngqotywak@gov.za',
    password:    'Consultant123',
  },
  {
    displayName: 'Hlomla Magopeni',
    email:       'magopenih@gov.za',
    password:    'Consultant123',
  },
] as const;

// ── Seed ─────────────────────────────────────────────────────────────────────

async function seedConsultant(consultant: typeof CONSULTANTS[number]) {
  const { displayName, email, password } = consultant;

  // 1. Create or retrieve Firebase Auth account
  let uid: string;
  try {
    const existing = await authAdmin.getUserByEmail(email);
    uid = existing.uid;
    console.log(`  ↩  Auth account already exists for ${email} (uid: ${uid})`);
    // Update password in case it changed
    await authAdmin.updateUser(uid, { password, displayName });
  } catch (err: unknown) {
    if ((err as { code?: string }).code !== 'auth/user-not-found') throw err;
    const created = await authAdmin.createUser({ email, password, displayName });
    uid = created.uid;
    console.log(`  ✓  Created Auth account for ${email} (uid: ${uid})`);
  }

  // 2. Write (or merge) Firestore /users/{uid} with role: consultant
  //    Department is intentionally omitted so the app assigns it on first login.
  const userRef = db.collection('users').doc(uid);
  await userRef.set(
    {
      displayName,
      email,
      role: 'consultant',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }   // preserves department if already assigned
  );
  console.log(`  ✓  Firestore /users/${uid} written for ${displayName}`);
}

async function main() {
  console.log('\n🌱  Seeding consultant accounts…\n');
  for (const consultant of CONSULTANTS) {
    console.log(`→ ${consultant.displayName} <${consultant.email}>`);
    await seedConsultant(consultant);
  }
  console.log('\n✅  Done. Consultant accounts are ready.\n');
  console.log(
    '   Each consultant will be assigned a random department\n' +
    '   from the following list on their first login:\n' +
    '   Home Affairs, SASSA, DLTC, Department of Labour, Department of Health\n'
  );
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌  Seed failed:', err);
  process.exit(1);
});
