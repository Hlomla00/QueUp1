/**
 * PATCH /api/ticket/[id]
 * Updates a ticket's status (SERVING, COMPLETED, CANCELLED, REDIRECTED).
 * Also decrements the branch queue counter when appropriate.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/lib/firebase-admin';
import { COLLECTIONS, QueueTicket, TicketStatus } from '@/lib/firestore-schema';
import { FieldValue } from 'firebase-admin/firestore';

interface PatchTicketBody {
  status: TicketStatus;
  redirectedTo?: string; // branchId when redirecting
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body: PatchTicketBody = await req.json();
    const { status, redirectedTo } = body;

    const validStatuses: TicketStatus[] = ['SERVING', 'COMPLETED', 'CANCELLED', 'REDIRECTED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const ticketRef = db.collection(COLLECTIONS.QUEUE_TICKETS).doc(id);
    const ticketSnap = await ticketRef.get();

    if (!ticketSnap.exists) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const ticket = { id: ticketSnap.id, ...ticketSnap.data() } as QueueTicket;
    const now = admin.firestore.Timestamp.now();

    const updateData: Partial<QueueTicket> & Record<string, unknown> = { status };

    if (status === 'SERVING') updateData.calledAt = now;
    if (status === 'COMPLETED' || status === 'CANCELLED' || status === 'REDIRECTED') {
      updateData.completedAt = now;
    }
    if (status === 'REDIRECTED' && redirectedTo) {
      updateData.redirectedTo = redirectedTo;
    }

    await ticketRef.update(updateData);

    // Decrement branch queue when ticket leaves the active queue
    if (['COMPLETED', 'CANCELLED', 'REDIRECTED'].includes(status)) {
      await db
        .collection(COLLECTIONS.BRANCHES)
        .doc(ticket.branchId)
        .update({
          currentQueue: FieldValue.increment(-1),
          updatedAt: now,
        });
    }

    return NextResponse.json({ success: true, id, status });
  } catch (err) {
    console.error('[PATCH /api/ticket/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const snap = await db.collection(COLLECTIONS.QUEUE_TICKETS).doc(params.id).get();
    if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ ticket: { id: snap.id, ...snap.data() } });
  } catch (err) {
    console.error('[GET /api/ticket/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
