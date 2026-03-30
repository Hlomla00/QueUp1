/**
 * Queue Intelligence Engine
 *
 * Runs in the Next.js backend (cloud AI layer, Layer 4 in the PDF).
 * Every time a ticket is created this engine:
 *  1. Compares current queue size to historical averages for this time slot
 *  2. Calculates a surge probability score (0-100%) for the next 60 min
 *  3. Derives a congestion level: LOW / MODERATE / HIGH
 *  4. Suggests bestTimeToVisit using historical data
 *
 * These results are written back to Firestore so the citizen dashboard
 * and the 3D visualisation reflect up-to-date intelligence.
 */

import {
  type AnalyticsSnapshot,
  type CongestionLevel,
  type Branch,
  writeAnalyticsSnapshot,
  updateBranchQueueState,
  getBranchHistoricalData,
} from './firestore';

// ─── Congestion thresholds ────────────────────────────────────────────────────

export function deriveCongestionLevel(
  currentQueue: number,
  dailyCapacity: number
): CongestionLevel {
  const ratio = currentQueue / dailyCapacity;
  if (ratio >= 0.75) return 'HIGH';
  if (ratio >= 0.40) return 'MODERATE';
  return 'LOW';
}

// ─── Historical average for a specific time slot ──────────────────────────────

function getSlotAverage(
  history: AnalyticsSnapshot[],
  dayOfWeek: number,
  hourOfDay: number
): number {
  const relevant = history.filter(
    s => s.dayOfWeek === dayOfWeek && s.hourOfDay === hourOfDay
  );
  if (relevant.length === 0) return 0;
  return relevant.reduce((sum, s) => sum + s.queueCount, 0) / relevant.length;
}

// ─── Surge probability (0-100) ────────────────────────────────────────────────
//
// Logic: compare current queue to average for the next two hours.
// If current is significantly above the forward average, surge is likely.

export function calculateSurgeProbability(
  currentQueue: number,
  history: AnalyticsSnapshot[],
  dayOfWeek: number,
  hourOfDay: number
): number {
  // Average queue for current hour and next hour
  const avgNow = getSlotAverage(history, dayOfWeek, hourOfDay);
  const avgNext = getSlotAverage(history, dayOfWeek, (hourOfDay + 1) % 24);

  // If no history, use a simple heuristic: peak hours (8-12, 13-15 Monday)
  if (avgNow === 0 && avgNext === 0) {
    const isPeakHour = hourOfDay >= 8 && hourOfDay <= 12;
    const isMonday = dayOfWeek === 1;
    return isPeakHour && isMonday ? 75 : isPeakHour ? 50 : 20;
  }

  const forwardAvg = (avgNow + avgNext) / 2;
  if (forwardAvg === 0) return 20;

  const ratio = currentQueue / forwardAvg;
  // ratio > 1.5 → very likely surge (>80%); ratio < 0.5 → unlikely (<20%)
  const raw = Math.min(100, Math.max(0, (ratio - 0.5) * 80));
  return Math.round(raw);
}

// ─── Best time to visit suggestion ───────────────────────────────────────────

export function suggestBestTimeToVisit(
  history: AnalyticsSnapshot[],
  dayOfWeek: number
): string {
  if (history.length === 0) {
    return 'Early morning (08:00–09:00) or late afternoon (15:00–16:00) tend to be quieter.';
  }

  // Find the hour with the lowest average queue for this day of week
  const hourAverages: { hour: number; avg: number }[] = [];
  for (let h = 7; h <= 16; h++) {
    hourAverages.push({ hour: h, avg: getSlotAverage(history, dayOfWeek, h) });
  }

  hourAverages.sort((a, b) => a.avg - b.avg);
  const best = hourAverages[0];

  if (!best || best.avg === 0) {
    return 'Early morning (08:00–09:00) typically has the shortest queues.';
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(best.hour)}:00–${pad(best.hour + 1)}:00 (avg ${Math.round(best.avg)} people in queue)`;
}

// ─── Main intelligence update function ───────────────────────────────────────
//
// Call this from /api/ticket after a new ticket is created.

export async function runQueueIntelligence(branch: Branch): Promise<void> {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const hourOfDay = now.getHours();

  // 1. Write analytics snapshot
  const congestion = deriveCongestionLevel(branch.currentQueue, branch.dailyCapacity);
  await writeAnalyticsSnapshot(branch.id, branch.currentQueue, congestion);

  // 2. Load recent history (last 200 snapshots)
  const history = await getBranchHistoricalData(branch.id, 200);

  // 3. Surge probability
  const surgeProbability = calculateSurgeProbability(
    branch.currentQueue,
    history,
    dayOfWeek,
    hourOfDay
  );

  // 4. Best time to visit
  const bestTimeToVisit = suggestBestTimeToVisit(history, dayOfWeek);

  // 5. Estimated wait: 3.5 min/person, adjusted up during surge
  const surgeMultiplier = surgeProbability > 70 ? 1.4 : surgeProbability > 40 ? 1.2 : 1.0;
  const estimatedWait = Math.round(branch.currentQueue * 3.5 * surgeMultiplier);

  // 6. Write back to Firestore
  await updateBranchQueueState(branch.id, {
    congestionLevel: congestion,
    estimatedWait,
    surgeProbability,
    bestTimeToVisit,
  });
}
