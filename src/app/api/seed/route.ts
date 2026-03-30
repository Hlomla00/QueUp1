/**
 * GET /api/seed
 * Seeds Firestore with demo branches if they don't exist yet.
 * Run once after deployment: visit /api/seed in the browser.
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

const BRANCHES = [
  {
    id: 'ha-bellville',
    name: 'Home Affairs Bellville',
    address: 'Voortrekker Road, Bellville',
    city: 'Cape Town',
    province: 'Western Cape',
    department: 'HA',
    lat: -33.9000, lng: 18.6294,
    currentQueue: 0, estimatedWait: 0,
    congestionLevel: 'LOW', branchStatus: 'OPEN',
    dailyCapacity: 80, lastTicketIssued: null,
    isActive: true, surgeProbability: 10,
    bestTimeToVisit: '08:00–09:00 (quietest period)',
  },
  {
    id: 'ha-cbd',
    name: 'Home Affairs Cape Town CBD',
    address: '56 Barrack Street, Cape Town',
    city: 'Cape Town',
    province: 'Western Cape',
    department: 'HA',
    lat: -33.9253, lng: 18.4234,
    currentQueue: 0, estimatedWait: 0,
    congestionLevel: 'LOW', branchStatus: 'OPEN',
    dailyCapacity: 80, lastTicketIssued: null,
    isActive: true, surgeProbability: 10,
    bestTimeToVisit: '08:00–09:00 (quietest period)',
  },
  {
    id: 'ha-mitchells-plain',
    name: 'Home Affairs Mitchells Plain',
    address: 'Town Centre, Mitchells Plain',
    city: 'Cape Town',
    province: 'Western Cape',
    department: 'HA',
    lat: -34.0444, lng: 18.6271,
    currentQueue: 80, estimatedWait: 280,
    congestionLevel: 'HIGH', branchStatus: 'FULL',
    dailyCapacity: 80, lastTicketIssued: 'HA-080',
    isActive: true, surgeProbability: 95,
    bestTimeToVisit: 'Early morning tomorrow (08:00)',
  },
  {
    id: 'sassa-tygervalley',
    name: 'SASSA Tygervalley',
    address: 'Willie van Schoor Ave, Bellville',
    city: 'Cape Town',
    province: 'Western Cape',
    department: 'SA',
    lat: -33.8757, lng: 18.6321,
    currentQueue: 0, estimatedWait: 0,
    congestionLevel: 'LOW', branchStatus: 'OPEN',
    dailyCapacity: 100, lastTicketIssued: null,
    isActive: true, surgeProbability: 10,
    bestTimeToVisit: '14:00–15:00 (quietest period)',
  },
  {
    id: 'sars-pinelands',
    name: 'SARS Pinelands',
    address: 'Neels Bothma Street, Pinelands',
    city: 'Cape Town',
    province: 'Western Cape',
    department: 'SR',
    lat: -33.9329, lng: 18.5012,
    currentQueue: 0, estimatedWait: 0,
    congestionLevel: 'LOW', branchStatus: 'OPEN',
    dailyCapacity: 60, lastTicketIssued: null,
    isActive: true, surgeProbability: 10,
    bestTimeToVisit: '09:00–10:00 (quietest period)',
  },
];

export async function GET() {
  const results: string[] = [];

  for (const branch of BRANCHES) {
    const { id, ...data } = branch;
    const ref = doc(db, 'branches', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, data);
      results.push(`✅ Created: ${branch.name}`);
    } else {
      results.push(`⏭️ Exists: ${branch.name}`);
    }
  }

  return NextResponse.json({
    message: 'Seed complete',
    results,
  });
}
