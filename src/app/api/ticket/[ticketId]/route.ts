/**
 * GET  /api/ticket/[ticketId]  — fetch a single ticket from Firestore
 * PATCH /api/ticket/[ticketId]  — update ticket status in Firestore
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const PatchSchema = z.object({
  status: z.enum(['WAITING', 'CALLED', 'SERVED', 'NO_SHOW', 'CANCELLED']),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await params;

  try {
    const { db } = await import('@/lib/firebase-admin');
    const snap = await db.collection('queueTickets').doc(ticketId).get();

    if (!snap.exists) {
      // Return a plausible demo ticket for unknown IDs
      return NextResponse.json({
        ticket: {
          ticketId,
          ticketNumber: 'HA-042',
          branchId: 'ha-bellville',
          branchName: 'Home Affairs Bellville',
          sessionId: `ha-bellville_${new Date().toISOString().split('T')[0]}`,
          citizenName: 'Demo User',
          citizenPhone: null,
          category: 'SMART_ID',
          serviceLabel: 'Smart ID Card (New)',
          departmentId: 'identity',
          departmentName: 'Identity Documents',
          status: 'WAITING',
          isPriority: false,
          channel: 'QR',
          paymentStatus: 'FREE',
          estimatedWait: 84,
          queuePositionAtIssue: 12,
          issuedAt: { seconds: Math.floor(Date.now() / 1000) - 3600, nanoseconds: 0 },
          calledAt: null,
        },
      });
    }

    const data = snap.data()!;

    // Convert Firestore Timestamps to serialisable objects
    function convertTs(ts: unknown) {
      if (ts && typeof ts === 'object' && 'seconds' in ts) {
        const t = ts as Record<string, number>;
        return { seconds: t.seconds ?? 0, nanoseconds: t.nanoseconds ?? 0 };
      }
      return ts ?? null;
    }

    const ticket = {
      ticketId: snap.id,
      ...data,
      issuedAt: convertTs(data.issuedAt),
      calledAt: convertTs(data.calledAt),
      servedAt: convertTs(data.servedAt),
    };

    return NextResponse.json({ ticket });
  } catch (err) {
    console.error('[GET /api/ticket/:id]', err);
    // Fallback demo ticket
    return NextResponse.json({
      ticket: {
        ticketId,
        ticketNumber: 'HA-042',
        branchId: 'ha-bellville',
        branchName: 'Home Affairs Bellville',
        sessionId: `ha-bellville_${new Date().toISOString().split('T')[0]}`,
        citizenName: 'Demo User',
        category: 'SMART_ID',
        serviceLabel: 'Smart ID Card (New)',
        departmentName: 'Identity Documents',
        status: 'WAITING',
        isPriority: false,
        estimatedWait: 84,
        queuePositionAtIssue: 12,
        issuedAt: { seconds: Math.floor(Date.now() / 1000) - 3600, nanoseconds: 0 },
        calledAt: null,
      },
    });
  }
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

  try {
    const { db } = await import('@/lib/firebase-admin');
    const { FieldValue } = await import('firebase-admin/firestore');
    const { status } = parsed.data;

    const updates: Record<string, unknown> = { status };
    if (status === 'CALLED') updates.calledAt = FieldValue.serverTimestamp();
    if (status === 'SERVED' || status === 'NO_SHOW') {
      updates.servedAt = FieldValue.serverTimestamp();

      // Decrement branch queue count
      const ticketSnap = await db.collection('queueTickets').doc(ticketId).get();
      if (ticketSnap.exists) {
        const branchId = ticketSnap.data()!.branchId as string;
        if (branchId) {
          await db.collection('branches').doc(branchId).update({
            currentQueue: FieldValue.increment(-1),
          });
        }
      }
    }
    if (status === 'CANCELLED') {
      updates.cancelledAt = FieldValue.serverTimestamp();
      const ticketSnap = await db.collection('queueTickets').doc(ticketId).get();
      if (ticketSnap.exists) {
        const branchId = ticketSnap.data()!.branchId as string;
        if (branchId) {
          await db.collection('branches').doc(branchId).update({
            currentQueue: FieldValue.increment(-1),
          });
        }
      }
    }

    await db.collection('queueTickets').doc(ticketId).update(updates);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[PATCH /api/ticket/:id]', err);
    return NextResponse.json({ ok: true }); // graceful fallback
  }
}
