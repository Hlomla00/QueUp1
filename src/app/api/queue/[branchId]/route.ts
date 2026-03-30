/**
 * GET /api/queue/[branchId]
 *
 * Returns live queue status for a branch:
 *  - branch document (current queue, congestion, wait, status)
 *  - active tickets (WAITING + CALLED), sorted by position
 *  - latest Edge AI prediction
 *
 * Used by: citizen tracking dashboard, 3D visualisation, consultant dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBranch, getBranchActiveTickets, getLatestPrediction } from '@/lib/firestore';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  const { branchId } = await params;

  const [branch, tickets, prediction] = await Promise.all([
    getBranch(branchId),
    getBranchActiveTickets(branchId),
    getLatestPrediction(branchId),
  ]);

  if (!branch) {
    return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
  }

  return NextResponse.json({
    branch,
    tickets,
    prediction,
    liveStats: {
      waiting: tickets.filter(t => t.status === 'WAITING').length,
      called: tickets.filter(t => t.status === 'CALLED').length,
      estimatedWait: branch.estimatedWait,
      congestionLevel: branch.congestionLevel,
      branchStatus: branch.branchStatus,
      surgeProbability: branch.surgeProbability ?? null,
      bestTimeToVisit: branch.bestTimeToVisit ?? null,
    },
  });
}
