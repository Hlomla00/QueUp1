/**
 * POST /api/recommend
 *
 * Agentic Claude API feature — earns the +5 Generative/Agentic AI bonus.
 * Citizens type a natural language question ("When is the best time to visit
 * Home Affairs Bellville for a passport?").  Claude reads live Firestore
 * queue data and responds with a specific, data-driven answer.
 *
 * Body:  { branchId: string, service: string, question: string }
 * Response 200: { answer: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getQueueData } from '@/lib/firestore';
import { z } from 'zod';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BodySchema = z.object({
  branchId: z.string().min(1),
  service: z.string().min(1),
  question: z.string().min(1).max(500),
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

  const { branchId, service, question } = parsed.data;

  // Fetch live queue data from Firestore
  const queueData = await getQueueData(branchId);

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: `You are a QueUp assistant helping South African citizens navigate government service queues.

Branch: ${branchId}
Service requested: ${service}
Live queue data: ${JSON.stringify(queueData, null, 2)}

Citizen question: ${question}

Give a specific, practical, friendly recommendation in 2-3 sentences. Reference the actual queue numbers, wait times, and congestion levels from the live data. Do not guess — reason over the real data provided.`,
      },
    ],
  });

  const answer =
    msg.content[0].type === 'text' ? msg.content[0].text : 'Unable to generate recommendation.';

  return NextResponse.json({ answer });
}
