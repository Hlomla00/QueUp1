/**
 * GET /api/analytics/[branchId]
 * Returns aggregated analytics and historical queue data for a branch.
 * Used by ThreeJsMap, the admin dashboard, and Claude recommendation engine.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { COLLECTIONS, AnalyticsRecord, Branch } from '@/lib/firestore-schema';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ branchId: string }> }
) {
  try {
    const { branchId } = await params;
    const { searchParams } = new URL(req.url);
    const days = Math.min(parseInt(searchParams.get('days') ?? '7'), 30);

    // ── Branch snapshot ───────────────────────────────────────────────────────
    const branchSnap = await db.collection(COLLECTIONS.BRANCHES).doc(branchId).get();
    if (!branchSnap.exists) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }
    const branch = { id: branchSnap.id, ...branchSnap.data() } as Branch;

    // ── Analytics records ─────────────────────────────────────────────────────
    const analyticsSnap = await db
      .collection(COLLECTIONS.ANALYTICS)
      .where('branchId', '==', branchId)
      .orderBy('date', 'desc')
      .limit(days * 24)
      .get();

    const records: AnalyticsRecord[] = analyticsSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<AnalyticsRecord, 'id'>),
    }));

    // ── Live ticket counts ────────────────────────────────────────────────────
    const [waitingSnap, completedTodaySnap] = await Promise.all([
      db
        .collection(COLLECTIONS.QUEUE_TICKETS)
        .where('branchId', '==', branchId)
        .where('status', 'in', ['WAITING', 'SERVING'])
        .count()
        .get(),
      db
        .collection(COLLECTIONS.QUEUE_TICKETS)
        .where('branchId', '==', branchId)
        .where('status', '==', 'COMPLETED')
        .count()
        .get(),
    ]);

    // ── Historical hourly averages (for Claude recommendation input) ──────────
    const hourlyAverages: { dayOfWeek: string; hour: number; avgQueueSize: number }[] = [];
    const hourMap = new Map<string, { total: number; count: number }>();

    for (const r of records) {
      const key = `${r.dayOfWeek}-${r.hour}`;
      const existing = hourMap.get(key) ?? { total: 0, count: 0 };
      hourMap.set(key, {
        total: existing.total + r.avgQueueSize,
        count: existing.count + 1,
      });
    }

    hourMap.forEach(({ total, count }, key) => {
      const [dayOfWeek, hourStr] = key.split('-');
      hourlyAverages.push({
        dayOfWeek,
        hour: parseInt(hourStr),
        avgQueueSize: Math.round(total / count),
      });
    });

    return NextResponse.json({
      branch,
      live: {
        currentQueue: branch.currentQueue,
        waitingTickets: waitingSnap.data().count,
        completedToday: completedTodaySnap.data().count,
        congestionLevel: branch.congestionLevel,
        loadPercent: Math.round((branch.currentQueue / branch.capacity) * 100),
      },
      analytics: records,
      historicalData: hourlyAverages.sort((a, b) => a.hour - b.hour),
    });
  } catch (err) {
    console.error('[GET /api/analytics/[branchId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
