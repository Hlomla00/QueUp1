/**
 * GET  /api/ticket/[ticketId]  — fetch a single ticket
 * PATCH /api/ticket/[ticketId]  — update ticket status (consultant actions)
 *
 * Used by: consultant dashboard (call next, mark served, no-show)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTicket, updateTicketStatus, type TicketStatus } from '@/lib/firestore';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { sendWhatsAppMessage, MSG } from '@/lib/whatsapp';

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

  // Fire-and-forget: send WhatsApp notification for status changes
  const newStatus = parsed.data.status;
  if (newStatus === 'CALLED' || newStatus === 'SERVED' || newStatus === 'CANCELLED') {
    sendWhatsAppNotification(ticketId, newStatus as TicketStatus).catch(console.error);
  }

  return NextResponse.json({ ok: true });
}

async function sendWhatsAppNotification(ticketId: string, status: TicketStatus) {
  // Find the WhatsApp session linked to this ticket
  const q = query(
    collection(db, 'whatsappSessions'),
    where('ticketId', '==', ticketId),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return; // No WhatsApp session → nothing to send

  const session = snap.docs[0].data();
  const phone: string = session.phone;
  const ticketNumber: string = session.ticketNumber ?? '';
  const branchName: string  = session.branchName ?? '';

  if (status === 'CALLED') {
    await sendWhatsAppMessage(phone, MSG.yourTurn(ticketNumber, branchName));
  } else if (status === 'CANCELLED') {
    await sendWhatsAppMessage(phone, MSG.cancelled());
  }
}
