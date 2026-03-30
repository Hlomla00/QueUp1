/**
 * GET  /api/ticket/[ticketId]  — fetch a single ticket
 * PATCH /api/ticket/[ticketId]  — update ticket status (consultant actions)
 *
 * Used by: consultant dashboard (call next, mark served, no-show)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTicket, updateTicketStatus, type TicketStatus } from '@/lib/firestore';
import { z } from 'zod';

const PatchSchema = z.object({
  status: z.enum(['WAITING', 'CALLED', 'SERVED', 'NO_SHOW', 'CANCELLED']),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await params;
  const ticket = await getTicket(ticketId);
  if (!ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  }
  return NextResponse.json({ ticket });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  await updateTicketStatus(ticketId, parsed.data.status as TicketStatus);
  return NextResponse.json({ ok: true });
}
