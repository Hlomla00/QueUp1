/**
 * GET /api/seed
 * Seeds Firestore with realistic demo data for all departments.
 * Uses Admin SDK — bypasses Firestore security rules.
 * Call once after deploy: /api/seed?force=true to reset all data.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ─── Branch definitions ───────────────────────────────────────────────────────

const BRANCHES = [
  // HOME AFFAIRS
  {
    id: 'ha-bellville',
    name: 'Home Affairs Bellville',
    address: '2 Voortrekker Rd, Bellville',
    city: 'Cape Town', province: 'Western Cape',
    department: 'Home Affairs',
    ticketPrefix: 'HA',
    lat: -33.8998, lng: 18.6308,
    congestionLevel: 'MODERATE', branchStatus: 'OPEN',
    dailyCapacity: 80, isActive: true, surgeProbability: 45,
    bestTimeToVisit: '08:00–09:00 (quietest period)',
    demoQueueSize: 23,
    departments: [
      { id: 'identity', name: 'Identity Documents', services: ['Smart ID Card (New)', 'Smart ID Card (Renewal)', 'Temporary ID Certificate'] },
      { id: 'travel', name: 'Travel Documents', services: ['Passport (New)', 'Passport (Renewal)', 'Emergency Travel Certificate'] },
      { id: 'civil', name: 'Civil Registration', services: ['Birth Certificate', 'Marriage Certificate', 'Death Certificate'] },
    ],
  },
  {
    id: 'ha-cbd',
    name: 'Home Affairs Cape Town CBD',
    address: '56 Barrack St, Cape Town City Centre',
    city: 'Cape Town', province: 'Western Cape',
    department: 'Home Affairs',
    ticketPrefix: 'HA',
    lat: -33.9249, lng: 18.4241,
    congestionLevel: 'HIGH', branchStatus: 'OPEN',
    dailyCapacity: 60, isActive: true, surgeProbability: 78,
    bestTimeToVisit: 'Tomorrow morning 08:00–09:00',
    demoQueueSize: 51,
    departments: [
      { id: 'identity', name: 'Identity Documents', services: ['Smart ID Card (New)', 'Smart ID Card (Renewal)'] },
      { id: 'travel', name: 'Travel Documents', services: ['Passport (New)', 'Passport (Renewal)'] },
      { id: 'civil', name: 'Civil Registration', services: ['Birth Certificate', 'Marriage Certificate', 'Death Certificate'] },
    ],
  },
  {
    id: 'ha-mitchells-plain',
    name: 'Home Affairs Mitchells Plain',
    address: 'Shop 23, Town Centre Mall, Mitchells Plain',
    city: 'Cape Town', province: 'Western Cape',
    department: 'Home Affairs',
    ticketPrefix: 'HA',
    lat: -34.0344, lng: 18.6154,
    congestionLevel: 'LOW', branchStatus: 'OPEN',
    dailyCapacity: 50, isActive: true, surgeProbability: 15,
    bestTimeToVisit: 'Now is a great time!',
    demoQueueSize: 8,
    departments: [
      { id: 'identity', name: 'Identity Documents', services: ['Smart ID Card (New)', 'Smart ID Card (Renewal)', 'Temporary ID Certificate'] },
      { id: 'civil', name: 'Civil Registration', services: ['Birth Certificate', 'Marriage Certificate', 'Death Certificate'] },
    ],
  },
  {
    id: 'ha-khayelitsha',
    name: 'Home Affairs Khayelitsha',
    address: 'Khayelitsha Mall, Steve Biko Drive',
    city: 'Cape Town', province: 'Western Cape',
    department: 'Home Affairs',
    ticketPrefix: 'HA',
    lat: -34.0363, lng: 18.6892,
    congestionLevel: 'HIGH', branchStatus: 'OPEN',
    dailyCapacity: 70, isActive: true, surgeProbability: 65,
    bestTimeToVisit: 'Early morning 08:00',
    demoQueueSize: 41,
    departments: [
      { id: 'identity', name: 'Identity Documents', services: ['Smart ID Card (New)', 'Smart ID Card (Renewal)'] },
      { id: 'travel', name: 'Travel Documents', services: ['Passport (New)', 'Passport (Renewal)'] },
      { id: 'civil', name: 'Civil Registration', services: ['Birth Certificate', 'Marriage Certificate'] },
    ],
  },

  // SASSA
  {
    id: 'sassa-bellville',
    name: 'SASSA Bellville',
    address: 'Willie van Schoor Ave, Bellville',
    city: 'Cape Town', province: 'Western Cape',
    department: 'SASSA',
    ticketPrefix: 'SA',
    lat: -33.8757, lng: 18.6321,
    congestionLevel: 'MODERATE', branchStatus: 'OPEN',
    dailyCapacity: 100, isActive: true, surgeProbability: 35,
    bestTimeToVisit: '14:00–15:00 (quietest period)',
    demoQueueSize: 32,
    departments: [
      { id: 'grants', name: 'Social Grants', services: ['Old Age Pension', 'Disability Grant', 'Child Support Grant', 'Foster Child Grant'] },
      { id: 'status', name: 'Grant Status & Updates', services: ['Grant Status Check', 'Banking Details Update', 'Address Change'] },
    ],
  },
  {
    id: 'sassa-khayelitsha',
    name: 'SASSA Khayelitsha',
    address: 'Site B, Ntlazane Rd, Khayelitsha',
    city: 'Cape Town', province: 'Western Cape',
    department: 'SASSA',
    ticketPrefix: 'SA',
    lat: -34.0190, lng: 18.6780,
    congestionLevel: 'HIGH', branchStatus: 'OPEN',
    dailyCapacity: 120, isActive: true, surgeProbability: 70,
    bestTimeToVisit: 'Early morning 07:30',
    demoQueueSize: 88,
    departments: [
      { id: 'grants', name: 'Social Grants', services: ['Old Age Pension', 'Disability Grant', 'Child Support Grant'] },
      { id: 'status', name: 'Grant Status & Updates', services: ['Grant Status Check', 'Banking Details Update'] },
    ],
  },

  // SARS
  {
    id: 'sars-pinelands',
    name: 'SARS Pinelands',
    address: 'Neels Bothma Street, Pinelands',
    city: 'Cape Town', province: 'Western Cape',
    department: 'SARS',
    ticketPrefix: 'SR',
    lat: -33.9329, lng: 18.5012,
    congestionLevel: 'LOW', branchStatus: 'OPEN',
    dailyCapacity: 60, isActive: true, surgeProbability: 10,
    bestTimeToVisit: '09:00–10:00 (quietest period)',
    demoQueueSize: 12,
    departments: [
      { id: 'tax-personal', name: 'Personal Tax', services: ['Income Tax Return (ITR12)', 'Tax Clearance Certificate', 'Tax Number Registration'] },
      { id: 'tax-business', name: 'Business Tax', services: ['Company Tax Return', 'VAT Registration', 'PAYE Registration'] },
    ],
  },

  // HOSPITALS
  {
    id: 'hospital-groote',
    name: 'Groote Schuur Hospital',
    address: 'Main Road, Observatory',
    city: 'Cape Town', province: 'Western Cape',
    department: 'Groote Schuur Hospital',
    ticketPrefix: 'HO',
    lat: -33.9416, lng: 18.4645,
    congestionLevel: 'HIGH', branchStatus: 'OPEN',
    dailyCapacity: 200, isActive: true, surgeProbability: 60,
    bestTimeToVisit: 'Early morning or late afternoon',
    demoQueueSize: 112,
    departments: [
      { id: 'outpatients', name: 'Outpatients', services: ['General Consultation', 'Specialist Referral', 'Follow-up Appointment'] },
      { id: 'pharmacy', name: 'Pharmacy', services: ['Prescription Collection', 'New Prescription', 'Chronic Medication'] },
      { id: 'admin', name: 'Patient Administration', services: ['New Patient Registration', 'Medical Records', 'Billing Enquiry'] },
    ],
  },
  {
    id: 'hospital-tyger',
    name: 'Tygerberg Hospital',
    address: 'Francie van Zijl Dr, Parow Valley',
    city: 'Cape Town', province: 'Western Cape',
    department: 'Tygerberg Hospital',
    ticketPrefix: 'HO',
    lat: -33.8878, lng: 18.6165,
    congestionLevel: 'MODERATE', branchStatus: 'OPEN',
    dailyCapacity: 180, isActive: true, surgeProbability: 40,
    bestTimeToVisit: '10:00–12:00',
    demoQueueSize: 74,
    departments: [
      { id: 'outpatients', name: 'Outpatients', services: ['General Consultation', 'Specialist Referral', 'Paediatrics'] },
      { id: 'pharmacy', name: 'Pharmacy', services: ['Prescription Collection', 'New Prescription', 'Chronic Medication'] },
      { id: 'admin', name: 'Patient Administration', services: ['New Patient Registration', 'Medical Records'] },
    ],
  },
  {
    id: 'hospital-mitchells',
    name: "Mitchell's Plain Hospital",
    address: "Mitchells Plain Town Centre",
    city: 'Cape Town', province: 'Western Cape',
    department: "Mitchell's Plain Hospital",
    ticketPrefix: 'HO',
    lat: -34.0540, lng: 18.6274,
    congestionLevel: 'MODERATE', branchStatus: 'OPEN',
    dailyCapacity: 150, isActive: true, surgeProbability: 35,
    bestTimeToVisit: '09:00–11:00',
    demoQueueSize: 45,
    departments: [
      { id: 'outpatients', name: 'Outpatients', services: ['General Consultation', 'Specialist Referral'] },
      { id: 'pharmacy', name: 'Pharmacy', services: ['Prescription Collection', 'Chronic Medication'] },
    ],
  },

  // MAGISTRATE
  {
    id: 'magistrate-cbd',
    name: 'Cape Town Magistrate Court',
    address: 'Keerom Street, Cape Town CBD',
    city: 'Cape Town', province: 'Western Cape',
    department: 'Cape Town Magistrate',
    ticketPrefix: 'MA',
    lat: -33.9265, lng: 18.4178,
    congestionLevel: 'LOW', branchStatus: 'OPEN',
    dailyCapacity: 80, isActive: true, surgeProbability: 20,
    bestTimeToVisit: '08:30–10:00',
    demoQueueSize: 18,
    departments: [
      { id: 'civil', name: 'Civil Matters', services: ['Small Claims (under R20 000)', 'Maintenance Orders', 'Interdicts', 'Eviction Orders'] },
      { id: 'admin', name: 'Administration', services: ['Case Status Enquiry', 'Document Submission', 'Fine Payment'] },
    ],
  },

  // DLTC
  {
    id: 'dltc-milnerton',
    name: 'DLTC Milnerton',
    address: 'Race Course Rd, Milnerton',
    city: 'Cape Town', province: 'Western Cape',
    department: 'DLTC Milnerton',
    ticketPrefix: 'DL',
    lat: -33.8670, lng: 18.4930,
    congestionLevel: 'LOW', branchStatus: 'OPEN',
    dailyCapacity: 70, isActive: true, surgeProbability: 15,
    bestTimeToVisit: '08:00–09:30',
    demoQueueSize: 15,
    departments: [
      { id: 'driving', name: 'Driving Licences', services: ["Driver's Licence (First Application)", "Driver's Licence Renewal", 'Learner\'s Licence Test', 'Professional Driving Permit (PDP)'] },
      { id: 'vehicle', name: 'Vehicle Registration', services: ['New Vehicle Registration', 'Change of Ownership', 'Licence Disc Renewal', 'Roadworthy Certificate'] },
    ],
  },
  {
    id: 'dltc-parow',
    name: 'DLTC Parow',
    address: 'Voortrekker Rd, Parow',
    city: 'Cape Town', province: 'Western Cape',
    department: 'DLTC Parow',
    ticketPrefix: 'DL',
    lat: -33.9000, lng: 18.5850,
    congestionLevel: 'MODERATE', branchStatus: 'OPEN',
    dailyCapacity: 65, isActive: true, surgeProbability: 30,
    bestTimeToVisit: '09:00–10:00',
    demoQueueSize: 28,
    departments: [
      { id: 'driving', name: 'Driving Licences', services: ["Driver's Licence (First Application)", "Driver's Licence Renewal", 'Learner\'s Licence Test'] },
      { id: 'vehicle', name: 'Vehicle Registration', services: ['New Vehicle Registration', 'Change of Ownership', 'Licence Disc Renewal'] },
    ],
  },

  // MUNICIPALITY
  {
    id: 'municipality-cbd',
    name: 'Cape Town Municipality',
    address: '12 Hertzog Blvd, Cape Town CBD',
    city: 'Cape Town', province: 'Western Cape',
    department: 'Cape Town Municipality',
    ticketPrefix: 'MU',
    lat: -33.9241, lng: 18.4241,
    congestionLevel: 'MODERATE', branchStatus: 'OPEN',
    dailyCapacity: 100, isActive: true, surgeProbability: 25,
    bestTimeToVisit: '10:00–12:00',
    demoQueueSize: 37,
    departments: [
      { id: 'rates', name: 'Rates & Taxes', services: ['Rates Account Enquiry', 'Rates Rebate Application', 'Valuation Objection', 'Payment Arrangement'] },
      { id: 'utilities', name: 'Water & Electricity', services: ['New Connection', 'Meter Reading Dispute', 'Fault Reporting', 'Account Query'] },
      { id: 'permits', name: 'Licences & Permits', services: ['Business Licence', 'Building Plans', 'Event Permit'] },
    ],
  },

  // DEPT OF LABOUR
  {
    id: 'labour-bellville',
    name: 'Dept of Labour Bellville',
    address: 'Cnr Voortrekker & Durban Rd, Bellville',
    city: 'Cape Town', province: 'Western Cape',
    department: 'Dept of Labour',
    ticketPrefix: 'LA',
    lat: -33.8990, lng: 18.6283,
    congestionLevel: 'MODERATE', branchStatus: 'OPEN',
    dailyCapacity: 90, isActive: true, surgeProbability: 30,
    bestTimeToVisit: '09:00–11:00',
    demoQueueSize: 29,
    departments: [
      { id: 'uif', name: 'UIF Claims', services: ['Unemployment Benefits', 'Maternity Benefits', 'Illness Benefits', 'Death Benefits'] },
      { id: 'employment', name: 'Employment Services', services: ['Job Registration', 'Learnership Application', 'Skills Development', 'Employer Registration'] },
      { id: 'compliance', name: 'Labour Compliance', services: ['Complaint Against Employer', 'Mediation Request', 'Compliance Inspection'] },
    ],
  },
];

// ─── Service category mapping ─────────────────────────────────────────────────

function deptToCategory(dept: string): string {
  const map: Record<string, string> = {
    'identity': 'SMART_ID',
    'travel': 'PASSPORT',
    'civil': 'BIRTH_CERTIFICATE',
    'grants': 'SASSA',
    'status': 'SASSA',
    'tax-personal': 'TAX_QUERY',
    'tax-business': 'TAX_QUERY',
    'outpatients': 'OTHER',
    'pharmacy': 'OTHER',
    'admin': 'OTHER',
    'driving': 'MUNICIPAL_RATES',
    'vehicle': 'MUNICIPAL_RATES',
    'civil-mag': 'OTHER',
    'rates': 'MUNICIPAL_RATES',
    'utilities': 'MUNICIPAL_RATES',
    'permits': 'MUNICIPAL_RATES',
    'uif': 'OTHER',
    'employment': 'OTHER',
    'compliance': 'OTHER',
  };
  return map[dept] || 'OTHER';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomName(): string {
  const names = [
    'Thabo Nkosi', 'Nomsa Dlamini', 'Sipho Khumalo', 'Zanele Mokoena',
    'Lungelo Zulu', 'Ayanda Mthembu', 'Bongani Sithole', 'Nandi Ndlela',
    'Vuyo Madlala', 'Khanya Ntuli', 'Sifiso Mahlangu', 'Lindiwe Shabalala',
    'Thandeka Cele', 'Mpho Molefe', 'Kagiso Dube', 'Refilwe Setswalo',
    'Pieter van der Berg', 'Fatima Isaacs', 'Sadia Mohamed', 'Yusuf Arendse',
    'Charlotte Müller', 'Andre Botha', 'Priya Naidoo', 'Ravi Govender',
  ];
  return names[Math.floor(Math.random() * names.length)];
}

function minutesAgo(n: number): Date {
  return new Date(Date.now() - n * 60 * 1000);
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const force = req.nextUrl.searchParams.get('force') === 'true';
  const results: string[] = [];

  try {
    // Lazy-import admin SDK so it only loads in Node.js runtime
    const { db } = await import('@/lib/firebase-admin');
    const { FieldValue } = await import('firebase-admin/firestore');

    const today = new Date().toISOString().split('T')[0];
    const batch = db.batch();

    for (const branch of BRANCHES) {
      const { id, departments, demoQueueSize, ticketPrefix, ...branchData } = branch;

      // Compute initial estimated wait: 3.5 min/person
      const estimatedWait = Math.round(demoQueueSize * 3.5);

      // ── Write branch document ──
      const branchRef = db.collection('branches').doc(id);
      const existing = await branchRef.get();
      if (!existing.exists || force) {
        batch.set(branchRef, {
          ...branchData,
          departments: departments.map(d => ({ id: d.id, name: d.name })),
          services: departments.flatMap(d => d.services),
          currentQueue: demoQueueSize,
          estimatedWait,
          nowServing: null,
          lastTicketIssued: `${ticketPrefix}-${String(demoQueueSize).padStart(3, '0')}`,
          seededAt: FieldValue.serverTimestamp(),
        });
        results.push(`✅ Branch: ${branch.name}`);
      } else {
        results.push(`⏭️  Branch exists: ${branch.name}`);
      }

      // ── Create today's queue session ──
      const sessionId = `${id}_${today}`;
      const sessionRef = db.collection('queueSessions').doc(sessionId);
      const sessionSnap = await sessionRef.get();

      if (!sessionSnap.exists || force) {
        batch.set(sessionRef, {
          branchId: id,
          date: today,
          lastTicketNumber: demoQueueSize,
          isActive: true,
          openedAt: FieldValue.serverTimestamp(),
        });
      }

      // ── Delete old demo tickets for this branch if force reset ──
      if (force) {
        const oldTickets = await db.collection('queueTickets')
          .where('branchId', '==', id)
          .where('isDemo', '==', true)
          .get();
        oldTickets.docs.forEach(d => batch.delete(d.ref));
      }

      // ── Seed demo queue tickets ──
      const existingTickets = await db.collection('queueTickets')
        .where('branchId', '==', id)
        .where('status', '==', 'WAITING')
        .get();

      if (existingTickets.size < 3 || force) {
        const dept = departments[0];
        const firstService = dept.services[0];
        const category = deptToCategory(dept.id);

        for (let i = 1; i <= demoQueueSize; i++) {
          const ticketNumber = `${ticketPrefix}-${String(i).padStart(3, '0')}`;
          const issuedAt = minutesAgo(demoQueueSize - i + Math.floor(Math.random() * 5));
          const citizenName = randomName();
          const serviceIdx = Math.floor(Math.random() * dept.services.length);

          const ticketRef = db.collection('queueTickets').doc(`${id}_${today}_${String(i).padStart(3, '0')}`);
          batch.set(ticketRef, {
            ticketNumber,
            branchId: id,
            branchName: branch.name,
            sessionId,
            citizenName,
            citizenPhone: null,
            category,
            serviceLabel: dept.services[serviceIdx],
            departmentId: dept.id,
            departmentName: dept.name,
            status: 'WAITING',
            isPriority: i === 1 && branch.demoQueueSize > 10,
            channel: i % 3 === 0 ? 'KIOSK' : 'QR',
            paymentStatus: 'FREE',
            estimatedWait: Math.round(i * 3.5),
            queuePositionAtIssue: i,
            issuedAt,
            calledAt: null,
            servedAt: null,
            isDemo: true,
          });
        }
        results.push(`  ↳ Seeded ${demoQueueSize} tickets for ${branch.name}`);
      } else {
        results.push(`  ↳ Tickets exist for ${branch.name} (${existingTickets.size} active)`);
      }
    }

    await batch.commit();

    return NextResponse.json({
      ok: true,
      message: 'Seed complete',
      branches: BRANCHES.length,
      results,
    });
  } catch (err: unknown) {
    console.error('[/api/seed]', err);
    return NextResponse.json({
      ok: false,
      error: String(err),
      hint: 'Check FIREBASE_SERVICE_ACCOUNT_KEY env var is set',
    }, { status: 500 });
  }
}
