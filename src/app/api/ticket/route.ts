/**
 * POST /api/ticket
 *
 * Creates a new queue ticket. Enforces branch daily capacity cap.
 * If the branch is full, returns 409 with a redirect prompt instead.
 * After issuing a ticket, runs the Queue Intelligence Engine to update
 * congestion, surge probability, and bestTimeToVisit in Firestore.
 *
 * Body: CreateTicketInput (see src/lib/firestore.ts)
 * Response 201: { ticket }
 * Response 409: { queued: false, branchStatus: "FULL", message }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createTicket, getBranch, type CreateTicketInput } from '@/lib/firestore';
import { runQueueIntelligence } from '@/lib/queue-intelligence';
import { z } from 'zod';

const BodySchema = z.object({
  branchId: z.string().min(1),
  citizenName: z.string().min(1).max(100),
  citizenPhone: z.string().optional(),
  category: z.enum([
    'SMART_ID',
    'PASSPORT',
    'BIRTH_CERTIFICATE',
    'TAX_QUERY',
    'SASSA',
    'MUNICIPAL_RATES',
    'OTHER',
  ]),
  isPriority: z.boolean().optional().default(false),
  channel: z.enum(['QR', 'KIOSK', 'APP']),
  paymentStatus: z.enum(['FREE', 'PENDING', 'PAID']).optional().default('FREE'),
  edgeAiPrediction: z.number().int().min(0).optional(),
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

  const input = parsed.data as CreateTicketInput;

  const result = await createTicket(input);

  if (!result.queued) {
    return NextResponse.json(result, { status: 409 });
  }

  // Fire-and-forget: run intelligence engine after ticket is issued
  getBranch(input.branchId).then(branch => {
    if (branch) runQueueIntelligence(branch).catch(console.error);
  });

  return NextResponse.json({ ticket: result.ticket }, { status: 201 });
}
