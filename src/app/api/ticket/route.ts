/**
 * POST /api/ticket
 * Issues a new queue ticket and runs the Queue Intelligence Engine.
 *
 * Returns 409 when branch is at full capacity (triggers BranchFullModal on client).
 */
import { NextRequest, NextResponse } from 'next/server';
import { db, admin } from '@/lib/firebase-admin';
import { COLLECTIONS, QueueTicket, TicketSource, Branch } from '@/lib/firestore-schema';
import { computeQueueIntelligence } from '@/lib/queue-intelligence';
import { FieldValue } from 'firebase-admin/firestore';

export interface CreateTicketBody {
  branchId: string;
  citizenName: string;
  citizenPhone: string;
  serviceType: string;
  serviceLabel: string;
  source?: TicketSource;
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateTicketBody = await req.json();

    const { branchId, citizenName, citizenPhone, serviceType, serviceLabel, source = 'web' } = body;

    if (!branchId || !citizenName || !citizenPhone || !serviceType) {
      return NextResponse.json(
        { error: 'Missing required fields: branchId, citizenName, citizenPhone, serviceType' },
        { status: 400 }
      );
    }

    // ── Fetch branch ──────────────────────────────────────────────────────────
    const branchRef = db.collection(COLLECTIONS.BRANCHES).doc(branchId);
    const branchSnap = await branchRef.get();

    if (!branchSnap.exists) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    const branch = { id: branchSnap.id, ...branchSnap.data() } as Branch;

    // ── Queue Intelligence Engine ─────────────────────────────────────────────
    const ticketsSnap = await db
      .collection(COLLECTIONS.QUEUE_TICKETS)
      .where('branchId', '==', branchId)
      .where('status', 'in', ['WAITING', 'SERVING'])
      .count()
      .get();

    const activeCount = ticketsSnap.data().count;
    const intelligence = computeQueueIntelligence(branch, activeCount);

    // ── 409 when branch is full ───────────────────────────────────────────────
    if (intelligence.isFull) {
      return NextResponse.json(
        {
          error: 'BRANCH_FULL',
          message: `${branch.name} has reached capacity (${branch.capacity} people). Please try a nearby branch.`,
          branchId,
          branchName: branch.name,
          currentQueue: branch.currentQueue,
          capacity: branch.capacity,
          congestionLevel: intelligence.congestionLevel,
        },
        { status: 409 }
      );
    }

    // ── Create ticket document ────────────────────────────────────────────────
    const now = admin.firestore.Timestamp.now();
    const ticketData: Omit<QueueTicket, 'id'> = {
      branchId,
      branchName: branch.name,
      ticketNumber: intelligence.ticketNumber,
      citizenName,
      citizenPhone,
      serviceType,
      serviceLabel: serviceLabel || serviceType,
      status: 'WAITING',
      position: intelligence.position,
      estimatedWaitMinutes: intelligence.estimatedWaitMinutes,
      tfliteWaitPrediction: intelligence.tfliteWaitPrediction,
      issuedAt: now,
      calledAt: null,
      completedAt: null,
      source,
      redirectedTo: null,
      notified: false,
    };

    const ticketRef = await db.collection(COLLECTIONS.QUEUE_TICKETS).add(ticketData);

    // ── Update branch queue count ─────────────────────────────────────────────
    await branchRef.update({
      currentQueue: FieldValue.increment(1),
      congestionLevel: intelligence.congestionLevel,
      updatedAt: now,
    });

    // ── Notification record ───────────────────────────────────────────────────
    await db.collection(COLLECTIONS.NOTIFICATIONS).add({
      ticketId: ticketRef.id,
      branchId,
      citizenPhone,
      type: 'QUEUE_JOINED',
      message: `You are #${intelligence.ticketNumber} at ${branch.name}. Est. wait: ${intelligence.estimatedWaitMinutes} min.`,
      channel: 'whatsapp',
      status: 'PENDING',
      sentAt: null,
      createdAt: now,
    });

    return NextResponse.json(
      {
        success: true,
        ticket: {
          id: ticketRef.id,
          ...ticketData,
        },
        intelligence: {
          estimatedWaitMinutes: intelligence.estimatedWaitMinutes,
          tfliteWaitPrediction: intelligence.tfliteWaitPrediction,
          congestionLevel: intelligence.congestionLevel,
          position: intelligence.position,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('[POST /api/ticket]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
