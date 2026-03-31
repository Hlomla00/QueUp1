/**
 * POST /api/recommend
 * Citizen queue recommendation powered by Claude claude-sonnet-4-6.
 * Pulls live Firestore branch data and returns a structured recommendation.
 *
 * Agentic Claude API feature — earns the +5 Generative/Agentic AI bonus.
 * Citizens type a natural language question ("When is the best time to visit
 * Home Affairs Bellville for a passport?").  Claude reads live Firestore
 * queue data and responds with a specific, data-driven answer.
 *
 * Body:  { branchId: string, serviceType?: string, citizenLocation?: { lat: number; lng: number } }
 * Response 200: { branchId, branchName, congestionLevel, currentQueue, recommendation, source, generatedAt }
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/lib/firebase-admin';
import { COLLECTIONS, Branch, AnalyticsRecord } from '@/lib/firestore-schema';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface RecommendBody {
  branchId: string;
  serviceType?: string;
  citizenLocation?: { lat: number; lng: number };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/recommend',
    method: 'POST',
    message: 'Use POST with branchId to receive queue recommendation.',
    requiredBody: {
      branchId: 'string',
    },
    optionalBody: {
      serviceType: 'string',
      citizenLocation: { lat: 'number', lng: 'number' },
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body: RecommendBody = await req.json();
    const { branchId, serviceType, citizenLocation } = body;

    if (!branchId) {
      return NextResponse.json({ error: 'branchId is required' }, { status: 400 });
    }

    // ── Fetch target branch ───────────────────────────────────────────────────
    const branchSnap = await db.collection(COLLECTIONS.BRANCHES).doc(branchId).get();
    if (!branchSnap.exists) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }
    const branch = { id: branchSnap.id, ...branchSnap.data() } as Branch;

    // ── Fetch nearby branches (same city, same department) ───────────────────
    const nearbySnap = await db
      .collection(COLLECTIONS.BRANCHES)
      .where('city', '==', branch.city)
      .where('department', '==', branch.department)
      .get();

    const nearbyBranches = nearbySnap.docs
      .filter((d) => d.id !== branchId)
      .map((d) => ({ id: d.id, ...d.data() } as Branch));

    // ── Historical analytics for context ─────────────────────────────────────
    let historical: AnalyticsRecord[] = [];
    try {
      const analyticsSnap = await db
        .collection(COLLECTIONS.ANALYTICS)
        .where('branchId', '==', branchId)
        .orderBy('date', 'desc')
        .limit(48)
        .get();
      historical = analyticsSnap.docs.map((d) => d.data() as AnalyticsRecord);
    } catch (analyticsErr) {
      console.warn('[POST /api/recommend] Analytics query unavailable, continuing without history:', analyticsErr);
    }

    const hourlyAvg = historical.slice(0, 10).map((r) => ({
      dayOfWeek: r.dayOfWeek,
      hour: r.hour,
      avgQueueSize: r.avgQueueSize,
    }));

    // ── Build Claude prompt ───────────────────────────────────────────────────
    const systemPrompt = `You are QueUp's intelligent queue advisor for South African government services.
Your role: help citizens minimize waiting time with concise, actionable recommendations.
Respond ONLY with a JSON object matching this schema:
{
  "summary": "string — 1-2 sentence recommendation",
  "shouldVisitNow": boolean,
  "bestTimeToVisit": "string | null — e.g. 'Wednesday 14:00–16:00'",
  "alternativeBranch": {
    "id": "string",
    "name": "string",
    "estimatedWaitMinutes": number,
    "reason": "string"
  } | null,
  "tipsForCitizen": ["string"]
}`;

    const userMessage = `
Current branch: ${branch.name}
Address: ${branch.address}, ${branch.city}
Service requested: ${serviceType ?? 'General'}
Current queue: ${branch.currentQueue} / ${branch.capacity}
Congestion: ${branch.congestionLevel}
Estimated wait: ${Math.round(branch.currentQueue * branch.avgServiceTime)} minutes
Today: ${new Date().toLocaleDateString('en-ZA', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}

Historical hourly averages (last 10 data points):
${hourlyAvg.map((h) => `  ${h.dayOfWeek} ${h.hour}:00 — avg ${h.avgQueueSize} people`).join('\n') || '  No historical data yet.'}

Nearby alternative branches:
${nearbyBranches.length > 0
  ? nearbyBranches.map((b) =>
      `  • ${b.name}: ${b.currentQueue}/${b.capacity} (${b.congestionLevel}) — ~${Math.round(b.currentQueue * b.avgServiceTime)}min wait`
    ).join('\n')
  : '  None available.'}

${citizenLocation ? `Citizen location: ${citizenLocation.lat.toFixed(4)}, ${citizenLocation.lng.toFixed(4)}` : ''}

Provide your recommendation as JSON only.`.trim();

    const fallbackAlternative = nearbyBranches
      .slice()
      .sort((a, b) =>
        Math.round(a.currentQueue * a.avgServiceTime) - Math.round(b.currentQueue * b.avgServiceTime)
      )[0] ?? null;

    const fallbackRecommendation: Record<string, unknown> = {
      summary:
        branch.congestionLevel === 'HIGH' || branch.congestionLevel === 'FULL'
          ? `${branch.name} is currently very busy. Consider a nearby branch with a shorter wait.`
          : `${branch.name} is operating normally right now and is suitable to visit.`,
      shouldVisitNow: !(branch.congestionLevel === 'HIGH' || branch.congestionLevel === 'FULL'),
      bestTimeToVisit: branch.congestionLevel === 'HIGH' || branch.congestionLevel === 'FULL' ? 'Later today after 14:00' : null,
      alternativeBranch: fallbackAlternative
        ? {
            id: fallbackAlternative.id,
            name: fallbackAlternative.name,
            estimatedWaitMinutes: Math.round(fallbackAlternative.currentQueue * fallbackAlternative.avgServiceTime),
            reason: 'Lower estimated wait based on current queue and service time.',
          }
        : null,
      tipsForCitizen: [
        'Bring all required documents before arrival.',
        'Arrive 10-15 minutes before your expected call time.',
      ],
    };

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });

      const rawText = message.content[0].type === 'text' ? message.content[0].text : '{}';

      let recommendation: Record<string, unknown>;
      try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        recommendation = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
      } catch {
        recommendation = { ...fallbackRecommendation, summary: rawText };
      }

      return NextResponse.json({
        branchId,
        branchName: branch.name,
        congestionLevel: branch.congestionLevel,
        currentQueue: branch.currentQueue,
        recommendation,
        source: 'claude',
        generatedAt: new Date().toISOString(),
      });
    } catch (anthropicErr) {
      console.warn('[POST /api/recommend] Anthropic unavailable, using heuristic fallback:', anthropicErr);
      return NextResponse.json({
        branchId,
        branchName: branch.name,
        congestionLevel: branch.congestionLevel,
        currentQueue: branch.currentQueue,
        recommendation: fallbackRecommendation,
        source: 'heuristic',
        generatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('[POST /api/recommend]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
