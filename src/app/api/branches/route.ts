/**
 * GET /api/branches
 * Mock implementation — returns hardcoded branch data without Firestore.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MOCK_BRANCHES = [
  {
    id: 'ha-bellville',
    name: 'Home Affairs Bellville',
    address: 'Voortrekker Road, Bellville',
    city: 'Cape Town',
    province: 'Western Cape',
    department: 'HA',
    lat: -33.9000, lng: 18.6294,
    currentQueue: 12,
    estimatedWait: 84,
    congestionLevel: 'MODERATE',
    branchStatus: 'OPEN',
    dailyCapacity: 80,
    isActive: true,
    surgeProbability: 35,
    bestTimeToVisit: '14:00–15:00 (quieter period)',
  },
  {
    id: 'ha-cbd',
    name: 'Home Affairs Cape Town CBD',
    address: '56 Barrack Street, Cape Town',
    city: 'Cape Town',
    province: 'Western Cape',
    department: 'HA',
    lat: -33.9253, lng: 18.4234,
    currentQueue: 5,
    estimatedWait: 35,
    congestionLevel: 'LOW',
    branchStatus: 'OPEN',
    dailyCapacity: 80,
    isActive: true,
    surgeProbability: 10,
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
    currentQueue: 80,
    estimatedWait: 280,
    congestionLevel: 'HIGH',
    branchStatus: 'FULL',
    dailyCapacity: 80,
    isActive: true,
    surgeProbability: 95,
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
    currentQueue: 8,
    estimatedWait: 56,
    congestionLevel: 'LOW',
    branchStatus: 'OPEN',
    dailyCapacity: 100,
    isActive: true,
    surgeProbability: 10,
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
    currentQueue: 3,
    estimatedWait: 21,
    congestionLevel: 'LOW',
    branchStatus: 'OPEN',
    dailyCapacity: 60,
    isActive: true,
    surgeProbability: 10,
    bestTimeToVisit: '09:00–10:00 (quietest period)',
  },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const onlyOpen = searchParams.get('open') === 'true';
  const dept = searchParams.get('dept');

  let branches = MOCK_BRANCHES;

  if (onlyOpen) {
    branches = branches.filter(b => b.branchStatus === 'OPEN');
  }

  if (dept) {
    branches = branches.filter(
      b => b.department.toUpperCase() === dept.toUpperCase()
    );
  }

  return NextResponse.json({ branches });
}
