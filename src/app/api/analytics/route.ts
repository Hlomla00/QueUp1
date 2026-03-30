/**
 * POST /api/analytics
 *
 * Writes an analytics snapshot and optionally an Edge AI prediction to Firestore.
 * Called by the Android kiosk tablet after each TFLite inference.
 *
 * Body: {
 *   branchId: string,
 *   queueCount: number,
 *   congestionLevel: "LOW" | "MODERATE" | "HIGH",
 *   prediction?: {
 *     predictedWaitMinutes: number,
 *     confidence: number,
 *     inputs: { hourOfDay: number, dayOfWeek: number, currentQueueSize: number }
 *   }
 * }
 *
 * GET /api/analytics?branchId=xxx
 *
 * Returns historical analytics for a branch (last 200 snapshots).
 * Used by the consultant dashboard charts and AI model retraining.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  writeAnalyticsSnapshot,
  writePrediction,
  getBranchHistoricalData,
  type CongestionLevel,
} from '@/lib/firestore';
import { z } from 'zod';

const PostBodySchema = z.object({
  branchId: z.string().min(1),
  queueCount: z.number().int().min(0),
  congestionLevel: z.enum(['LOW', 'MODERATE', 'HIGH']),
  prediction: z
    .object({
      predictedWaitMinutes: z.number().int().min(0),
      confidence: z.number().min(0).max(1),
      inputs: z.object({
        hourOfDay: z.number().int().min(0).max(23),
        dayOfWeek: z.number().int().min(0).max(6),
        currentQueueSize: z.number().int().min(0),
      }),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = PostBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { branchId, queueCount, congestionLevel, prediction } = parsed.data;

  await writeAnalyticsSnapshot(branchId, queueCount, congestionLevel as CongestionLevel);

  if (prediction) {
    await writePrediction({
      branchId,
      predictedWaitMinutes: prediction.predictedWaitMinutes,
      confidence: prediction.confidence,
      source: 'EDGE_AI',
      inputs: prediction.inputs,
    });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get('branchId');

  if (!branchId) {
    return NextResponse.json({ error: 'branchId query param required' }, { status: 400 });
  }

  const history = await getBranchHistoricalData(branchId, 200);
  return NextResponse.json({ history });
}
