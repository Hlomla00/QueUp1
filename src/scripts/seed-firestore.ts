/**
 * Firestore Demo Data Seeder
 * ==========================
 * Populates Firestore with the demo branches and initial state needed for
 * the MICT SETA National Finals demo (two-credential flow from the PDF).
 *
 * Usage:
 *   npx tsx src/scripts/seed-firestore.ts
 *
 * Set GOOGLE_APPLICATION_CREDENTIALS or NEXT_PUBLIC_FIREBASE_* env vars first.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// ─── Init ─────────────────────────────────────────────────────────────────────
if (!getApps().length) {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    initializeApp({ credential: cert(process.env.GOOGLE_APPLICATION_CREDENTIALS) });
  } else {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      }),
    });
  }
}

const db = getFirestore();

// ─── Branch data ──────────────────────────────────────────────────────────────

const BRANCHES = [
  {
    id: 'ha-bellville',
    name: 'Home Affairs Bellville',
    address: 'Voortrekker Road, Bellville',
    city: 'Cape Town',
    province: 'Western Cape',
    department: 'Home Affairs',
    lat: -33.9000,
    lng: 18.6294,
    currentQueue: 34,
    estimatedWait: 119,
    congestionLevel: 'MODERATE',
    branchStatus: 'OPEN',
    dailyCapacity: 80,
    lastTicketIssued: 'HA-034',
    isActive: true,
    bestTimeToVisit: '15:00–16:00 (avg 12 people in queue)',
    surgeProbability: 45,
  },
  {
    id: 'ha-cbd',
    name: 'Home Affairs Cape Town CBD',
    address: '56 Barrack Street, Cape Town',
    city: 'Cape Town',
    province: 'Western Cape',
    department: 'Home Affairs',
    lat: -33.9253,
    lng: 18.4234,
    currentQueue: 23,
    estimatedWait: 80,
    congestionLevel: 'MODERATE',
    branchStatus: 'OPEN',
    dailyCapacity: 80,
    lastTicketIssued: 'HA-023',
    isActive: true,
    bestTimeToVisit: '08:00–09:00 (avg 8 people in queue)',
    surgeProbability: 30,
  },
  {
    id: 'ha-mitchells-plain',
    name: 'Home Affairs Mitchells Plain',
    address: 'Town Centre, Mitchells Plain',
    city: 'Cape Town',
    province: 'Western Cape',
    department: 'Home Affairs',
    lat: -34.0444,
    lng: 18.6271,
    // Pre-set FULL for the hlomla2 demo credential
    currentQueue: 80,
    estimatedWait: 280,
    congestionLevel: 'HIGH',
    branchStatus: 'FULL',
    dailyCapacity: 80,
    lastTicketIssued: 'HA-080',
    isActive: true,
    bestTimeToVisit: 'Early morning tomorrow (08:00)',
    surgeProbability: 95,
  },
  {
    id: 'sassa-tygervalley',
    name: 'SASSA Tygervalley',
    address: 'Willie van Schoor Ave, Bellville',
    city: 'Cape Town',
    province: 'Western Cape',
    department: 'SASSA',
    lat: -33.8757,
    lng: 18.6321,
    currentQueue: 12,
    estimatedWait: 42,
    congestionLevel: 'LOW',
    branchStatus: 'OPEN',
    dailyCapacity: 100,
    lastTicketIssued: 'SA-012',
    isActive: true,
    bestTimeToVisit: '14:00–15:00 (avg 9 people in queue)',
    surgeProbability: 15,
  },
  {
    id: 'sars-pinelands',
    name: 'SARS Pinelands',
    address: 'Neels Bothma Street, Pinelands',
    city: 'Cape Town',
    province: 'Western Cape',
    department: 'SARS',
    lat: -33.9329,
    lng: 18.5012,
    currentQueue: 7,
    estimatedWait: 25,
    congestionLevel: 'LOW',
    branchStatus: 'OPEN',
    dailyCapacity: 60,
    lastTicketIssued: 'SR-007',
    isActive: true,
    surgeProbability: 10,
  },
];

// ─── Consultant/staff accounts (demo credentials) ─────────────────────────────

const DEMO_USERS = [
  {
    uid: 'hlomla1',
    email: 'hlomla1@queup.co.za',
    displayName: 'Hlomla Ndaba (Normal Flow)',
    role: 'citizen',
    defaultBranchId: 'ha-bellville',
  },
  {
    uid: 'hlomla2',
    email: 'hlomla2@queup.co.za',
    displayName: 'Hlomla Ndaba (Full Branch)',
    role: 'citizen',
    defaultBranchId: 'ha-mitchells-plain',
  },
  {
    uid: 'staff-ha-bellville',
    email: 'staff@ha-bellville.queup.co.za',
    displayName: 'Sipho Nkosi',
    role: 'consultant',
    assignedBranchId: 'ha-bellville',
  },
];

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('Seeding Firestore demo data...\n');

  // Branches
  for (const branch of BRANCHES) {
    const { id, ...data } = branch;
    await db.collection('branches').doc(id).set(data);
    console.log(`  ✓ Branch: ${branch.name} [${branch.branchStatus}]`);
  }

  // Demo users (in a real deployment these are Firebase Auth users)
  for (const user of DEMO_USERS) {
    await db.collection('users').doc(user.uid).set(user);
    console.log(`  ✓ User: ${user.displayName} (${user.role})`);
  }

  // Today's queue sessions for open branches
  const today = new Date().toISOString().split('T')[0];
  for (const branch of BRANCHES.filter(b => b.branchStatus !== 'CLOSED')) {
    const sessionId = `${branch.id}_${today}`;
    await db.collection('queueSessions').doc(sessionId).set({
      branchId: branch.id,
      date: today,
      lastTicketNumber: branch.currentQueue,
      isActive: true,
      openedAt: Timestamp.now(),
    });
    console.log(`  ✓ Session: ${sessionId}`);
  }

  console.log('\nSeed complete. Ready for demo.');
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
