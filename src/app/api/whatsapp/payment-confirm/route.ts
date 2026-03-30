/**
 * POST /api/whatsapp/payment-confirm
 * ====================================
 * PayFast IPN (Instant Payment Notification) handler.
 * PayFast calls this URL when a payment completes (or fails).
 *
 * What this route does:
 *  1. Validates the PayFast signature (security check)
 *  2. Looks up the WhatsApp session using m_payment_id (paymentRef)
 *  3. Creates a Firestore queue ticket (POST /api/ticket)
 *  4. Sends the digital receipt back to the citizen's WhatsApp
 *  5. Marks the session as ACTIVE
 *
 * PayFast IPN docs: https://developers.payfast.co.za/documentation#notify-url
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import { createTicket } from '@/lib/firestore';
import { updateSession } from '@/lib/whatsapp-session';
import { sendWhatsAppMessage, MSG } from '@/lib/whatsapp';

// ─── PayFast IPN validation ───────────────────────────────────────────────────

function validatePayFastIPN(params: Record<string, string>): boolean {
  // In development/sandbox, skip strict validation
  if (process.env.NODE_ENV !== 'production') return true;

  const passphrase = process.env.PAYFAST_PASSPHRASE;

  // Build the query string in the order PayFast sends it (excluding signature)
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(([k]) => k !== 'signature')
  );

  const queryString = Object.entries(filteredParams)
    .map(([k, v]) => `${k}=${encodeURIComponent(v.trim()).replace(/%20/g, '+')}`)
    .join('&');

  const toSign = passphrase
    ? `${queryString}&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}`
    : queryString;

  const expected = crypto.createHash('md5').update(toSign).digest('hex');
  return expected === params.signature;
}

// ─── IPN handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // PayFast sends application/x-www-form-urlencoded
  let params: Record<string, string> = {};
  try {
    const formData = await req.formData();
    for (const [key, value] of formData.entries()) {
      params[key] = value as string;
    }
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const paymentStatus = params.payment_status; // "COMPLETE" | "FAILED" | "CANCELLED"
  const paymentRef    = params.m_payment_id;   // our "wa_{phone}_{ts}" reference
  const amount        = params.amount_gross;

  // ── Validate signature ──────────────────────────────────────────────────
  if (!validatePayFastIPN(params)) {
    console.error('[PayFast IPN] Invalid signature', { paymentRef });
    return new Response('', { status: 200 }); // Must return 200 to PayFast
  }

  // ── Only process COMPLETE payments ────────────────────────────────────
  if (paymentStatus !== 'COMPLETE') {
    console.log(`[PayFast IPN] Non-complete payment: ${paymentStatus} for ${paymentRef}`);
    return new Response('', { status: 200 });
  }

  // ── Find the WhatsApp session by paymentRef ────────────────────────────
  const q = query(
    collection(db, 'whatsappSessions'),
    where('paymentRef', '==', paymentRef),
    limit(1)
  );
  const snap = await getDocs(q);

  if (snap.empty) {
    console.error('[PayFast IPN] Session not found for paymentRef:', paymentRef);
    return new Response('', { status: 200 });
  }

  const sessionDoc = snap.docs[0];
  const session = sessionDoc.data();
  const phone: string = session.phone;

  // Prevent double-processing
  if (session.step === 'ACTIVE' || session.ticketId) {
    return new Response('', { status: 200 });
  }

  try {
    // ── Create the queue ticket in Firestore ───────────────────────────
    const result = await createTicket({
      branchId:      session.branchId,
      citizenName:   session.citizenName,
      citizenPhone:  phone,
      category:      session.serviceCategory,
      channel:       'APP',               // WhatsApp = remote app channel
      paymentStatus: 'PAID',
    });

    if (!result.queued) {
      // Branch went full between booking and payment — refund would be needed in prod
      await sendWhatsAppMessage(
        phone,
        `⚠️ Unfortunately ${session.branchName} reached capacity before your payment was confirmed.\n\nPlease contact support@queup.co.za for a refund.\n\nSorry for the inconvenience! 🙏`
      );
      return new Response('', { status: 200 });
    }

    const ticket = result.ticket;

    // ── Update session to ACTIVE ───────────────────────────────────────
    await updateSession(phone, {
      step: 'ACTIVE',
      ticketId: ticket.ticketId,
      ticketNumber: ticket.ticketNumber,
    });

    // ── Send digital receipt to WhatsApp ───────────────────────────────
    await sendWhatsAppMessage(
      phone,
      MSG.ticket(
        ticket.ticketNumber,
        session.branchName,
        session.serviceTitle,
        ticket.queuePositionAtIssue,
        ticket.estimatedWait
      )
    );

    console.log(`[PayFast IPN] Ticket issued: ${ticket.ticketNumber} for ${phone}`);
  } catch (err) {
    console.error('[PayFast IPN] Error issuing ticket:', err);
    await sendWhatsAppMessage(
      phone,
      MSG.error()
    );
  }

  // PayFast requires 200 OK to stop retrying
  return new Response('', { status: 200 });
}
