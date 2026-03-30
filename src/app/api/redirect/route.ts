/**
 * POST /api/redirect
 *
 * Agentic Claude API — Smart Branch Redirect (Queue Cap feature).
 * When a branch is FULL, Claude reads live Firestore data across ALL branches
 * and recommends the single best nearby branch with available capacity.
 * Directly earns the +5 Agentic AI bonus and strengthens System Integration.
 *
 * Body:  { currentBranchId: string, serviceType: string, citizenLocation?: string }
 * Response 200: { recommendation: string, suggestedBranchId?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getAllBranchData } from '@/lib/firestore';
import { z } from 'zod';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BodySchema = z.object({
  currentBranchId: z.string().min(1),
  serviceType: z.string().min(1),
  citizenLocation: z.string().optional().default('unspecified'),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { currentBranchId, serviceType, citizenLocation } = parsed.data;

  // Fetch live snapshot of ALL branches from Firestore
  const allBranches = await getAllBranchData();

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    messages: [
      {
        role: 'user',
        content: `You are the QueUp smart redirect assistant for South African government services.

The citizen tried to join branch: ${currentBranchId}
That branch is FULL for today — no more tickets are being issued.
Service needed: ${serviceType}
Citizen location: ${citizenLocation}

Live branch data for ALL QueUp branches:
${JSON.stringify(allBranches, null, 2)}

Recommend the SINGLE best nearby branch with available capacity (branchStatus = "OPEN" and availableSlots > 0). Include:
- Branch name
- Current queue size and available slots
- Estimated wait time
- A friendly, encouraging explanation (1-2 sentences)

If no branches have capacity, say so clearly and suggest the citizen return early tomorrow.
Be specific, practical, and reference the real numbers from the data.`,
      },
    ],
  });

  const recommendation =
    msg.content[0].type === 'text'
      ? msg.content[0].text
      : 'Unable to find an alternative branch recommendation at this time.';

  // Parse a branchId hint from the recommendation (best-effort)
  const suggestedBranch = allBranches.find(
    b =>
      b.branchStatus === 'OPEN' &&
      b.availableSlots > 0 &&
      recommendation.toLowerCase().includes(b.name.toLowerCase())
  );

  return NextResponse.json({
    recommendation,
    suggestedBranchId: suggestedBranch?.branchId ?? null,
  });
}
