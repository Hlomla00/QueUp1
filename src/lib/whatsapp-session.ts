/**
 * WhatsApp Conversation Session Manager
 * ======================================
 * Stores per-user conversation state in Firestore.
 * Collection: whatsappSessions  |  Doc ID: clean phone number (+27821234567)
 *
 * Each citizen gets one session doc that tracks exactly where they are in
 * the queue-joining flow. Sessions expire after 24 hours of inactivity.
 */

import { db } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConversationStep =
  | 'GET_NAME'           // Initial: ask for citizen's name
  | 'GET_LOCATION'       // Choose city/area
  | 'GET_BRANCH'         // Choose specific branch from filtered list
  | 'GET_SERVICE'        // Choose service at chosen branch
  | 'CONFIRM_PAYMENT'    // Show summary + ask to confirm R65 payment
  | 'PAYMENT_PENDING'    // Link sent, waiting for PayFast/Stripe callback
  | 'ACTIVE'             // Ticket issued, monitoring queue position
  | 'DONE';              // Served / cancelled

export interface WhatsAppSession {
  phone: string;              // +27821234567 (no "whatsapp:" prefix)
  step: ConversationStep;
  citizenName?: string;
  locationFilter?: string;    // e.g. "Cape Town"
  branchId?: string;
  branchName?: string;
  serviceCategory?: string;   // e.g. "SMART_ID"
  serviceTitle?: string;      // e.g. "Smart ID Card"
  ticketId?: string;
  ticketNumber?: string;
  paymentRef?: string;        // wa_{phone}_{timestamp}
  lastActivity: Timestamp;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip "whatsapp:" prefix and normalise to E.164 */
export function cleanPhone(raw: string): string {
  return raw.replace(/^whatsapp:/i, '').trim();
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function getSession(phone: string): Promise<WhatsAppSession | null> {
  const snap = await getDoc(doc(db, 'whatsappSessions', phone));
  if (!snap.exists()) return null;
  return snap.data() as WhatsAppSession;
}

export async function createSession(phone: string): Promise<WhatsAppSession> {
  const data = {
    phone,
    step: 'GET_NAME' as ConversationStep,
    lastActivity: serverTimestamp(),
  };
  await setDoc(doc(db, 'whatsappSessions', phone), data);
  return data as unknown as WhatsAppSession;
}

export async function updateSession(
  phone: string,
  updates: Partial<Omit<WhatsAppSession, 'lastActivity'>>
) {
  await updateDoc(doc(db, 'whatsappSessions', phone), {
    ...updates,
    lastActivity: serverTimestamp(),
  });
}

export async function resetSession(phone: string) {
  await setDoc(doc(db, 'whatsappSessions', phone), {
    phone,
    step: 'GET_NAME' as ConversationStep,
    lastActivity: serverTimestamp(),
  });
}
