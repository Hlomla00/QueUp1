/**
 * GET /api/branches
 *
 * Returns all active branches with their live queue state.
 * Used by: 3D visualisation (Three.js pillar heights), browse page, redirect AI.
 *
 * Query params:
 *   ?open=true   — only return OPEN branches
 *   ?dept=HOME_AFFAIRS  — filter by department
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllBranches, getOpenBranches } from '@/lib/firestore';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const onlyOpen = searchParams.get('open') === 'true';
  const dept = searchParams.get('dept');

  let branches = onlyOpen ? await getOpenBranches() : await getAllBranches();

  if (dept) {
    branches = branches.filter(
      b => b.department.toUpperCase() === dept.toUpperCase()
    );
  }

  return NextResponse.json({ branches });
}
