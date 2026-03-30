/**
 * Firestore database layer for QueUp.
 *
 * Collections (matches PDF schema):
 *  - branches        : live branch state (queue count, congestion, cap)
 *  - queueSessions   : one session per branch per day
 *  - queueTickets    : every ticket ever issued
 *  - analytics       : time-series snapshots written on every ticket event
 *  - predictions     : Edge AI wait-time outputs written from the kiosk tablet
 *  - notifications   : outbound notification records
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CongestionLevel = 'LOW' | 'MODERATE' | 'HIGH';
export type BranchStatus = 'OPEN' | 'FULL' | 'CLOSED';
export type TicketStatus = 'WAITING' | 'CALLED' | 'SERVED' | 'NO_SHOW' | 'CANCELLED';
export type TicketChannel = 'QR' | 'KIOSK' | 'APP';
export type ServiceCategory =
  | 'SMART_ID'
  | 'PASSPORT'
  | 'BIRTH_CERTIFICATE'
  | 'TAX_QUERY'
  | 'SASSA'
  | 'MUNICIPAL_RATES'
  | 'OTHER';

export interface Branch {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  department: string;
  lat: number;
  lng: number;
  currentQueue: number;
  estimatedWait: number;         // minutes
  congestionLevel: CongestionLevel;
  branchStatus: BranchStatus;
  dailyCapacity: number;
  lastTicketIssued: string | null;
  isActive: boolean;
  bestTimeToVisit?: string;
  surgeProbability?: number;     // 0-100
}

export interface QueueSession {
  sessionId: string;
  branchId: string;
  date: string;                  // YYYY-MM-DD
  lastTicketNumber: number;
  isActive: boolean;
  openedAt: Timestamp;
  closedAt?: Timestamp;
}

export interface QueueTicket {
  ticketId: string;
  ticketNumber: string;          // e.g. "HA-042"
  branchId: string;
  sessionId: string;
  citizenName: string;
  citizenPhone?: string;
  category: ServiceCategory;
  status: TicketStatus;
  isPriority: boolean;
  channel: TicketChannel;
  paymentStatus: 'FREE' | 'PENDING' | 'PAID';
  estimatedWait: number;         // minutes at time of issue
  queuePositionAtIssue: number;
  issuedAt: Timestamp;
  calledAt?: Timestamp;
  servedAt?: Timestamp;
  edgeAiPrediction?: number;     // TFLite on-device prediction in minutes
}

export interface AnalyticsSnapshot {
  branchId: string;
  queueCount: number;
  congestionLevel: CongestionLevel;
  timestamp: Timestamp;
  dayOfWeek: number;             // 0=Sun … 6=Sat
  hourOfDay: number;             // 0-23
}

export interface Prediction {
  branchId: string;
  predictedWaitMinutes: number;
  confidence: number;            // 0-1
  generatedAt: Timestamp;
  source: 'EDGE_AI' | 'CLOUD_AI';
  inputs: {
    hourOfDay: number;
    dayOfWeek: number;
    currentQueueSize: number;
  };
}

export interface NotificationRecord {
  ticketId: string;
  type: '10_AWAY' | '5_AWAY' | 'YOUR_TURN' | 'BRANCH_FULL' | 'REDIRECT';
  sentAt: Timestamp;
  channel: 'WHATSAPP' | 'SMS' | 'IN_APP';
  delivered: boolean;
  payload?: Record<string, unknown>;
}

// ─── Branch Operations ────────────────────────────────────────────────────────

export async function getBranch(branchId: string): Promise<Branch | null> {
  const snap = await getDoc(doc(db, 'branches', branchId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Branch;
}

export async function getAllBranches(): Promise<Branch[]> {
  const snap = await getDocs(collection(db, 'branches'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Branch));
}

export async function getOpenBranches(): Promise<Branch[]> {
  const q = query(
    collection(db, 'branches'),
    where('branchStatus', '==', 'OPEN'),
    where('isActive', '==', true)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Branch));
}

export async function updateBranchQueueState(
  branchId: string,
  updates: Partial<Pick<Branch, 'currentQueue' | 'estimatedWait' | 'congestionLevel' | 'branchStatus' | 'bestTimeToVisit' | 'surgeProbability'>>
) {
  await updateDoc(doc(db, 'branches', branchId), updates);
}

// ─── Queue Session Operations ─────────────────────────────────────────────────

export async function getOrCreateTodaySession(branchId: string): Promise<QueueSession> {
  const today = new Date().toISOString().split('T')[0];
  const sessionId = `${branchId}_${today}`;
  const ref = doc(db, 'queueSessions', sessionId);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return { sessionId, ...snap.data() } as QueueSession;
  }

  const session: Omit<QueueSession, 'sessionId'> = {
    branchId,
    date: today,
    lastTicketNumber: 0,
    isActive: true,
    openedAt: serverTimestamp() as Timestamp,
  };
  await setDoc(ref, session);
  return { sessionId, ...session };
}

// ─── Ticket Operations ────────────────────────────────────────────────────────

export interface CreateTicketInput {
  branchId: string;
  citizenName: string;
  citizenPhone?: string;
  category: ServiceCategory;
  isPriority?: boolean;
  channel: TicketChannel;
  paymentStatus?: QueueTicket['paymentStatus'];
  edgeAiPrediction?: number;
}

export interface CreateTicketResult {
  ticket: QueueTicket;
  queued: true;
}

export interface QueueFullResult {
  queued: false;
  branchStatus: 'FULL';
  message: string;
}

export async function createTicket(
  input: CreateTicketInput
): Promise<CreateTicketResult | QueueFullResult> {
  const today = new Date().toISOString().split('T')[0];
  const sessionId = `${input.branchId}_${today}`;

  return runTransaction(db, async (tx) => {
    // 1. Check branch capacity
    const branchRef = doc(db, 'branches', input.branchId);
    const branchSnap = await tx.get(branchRef);
    if (!branchSnap.exists()) throw new Error(`Branch ${input.branchId} not found`);

    const branch = branchSnap.data() as Branch;
    if (branch.branchStatus === 'FULL' || branch.currentQueue >= branch.dailyCapacity) {
      return {
        queued: false,
        branchStatus: 'FULL' as const,
        message: `This branch has reached its daily capacity of ${branch.dailyCapacity} tickets. Please check a nearby branch.`,
      };
    }

    // 2. Increment session ticket counter
    const sessionRef = doc(db, 'queueSessions', sessionId);
    const sessionSnap = await tx.get(sessionRef);
    let lastTicketNumber = 0;
    if (sessionSnap.exists()) {
      lastTicketNumber = (sessionSnap.data() as QueueSession).lastTicketNumber;
    } else {
      tx.set(sessionRef, {
        branchId: input.branchId,
        date: today,
        lastTicketNumber: 0,
        isActive: true,
        openedAt: serverTimestamp(),
      });
    }

    const newTicketNumber = lastTicketNumber + 1;
    const prefix = branch.department?.substring(0, 2).toUpperCase() || 'QU';
    const ticketNumber = `${prefix}-${String(newTicketNumber).padStart(3, '0')}`;

    // 3. Estimate wait time: 3.5 min/person baseline + edge AI override
    const estimatedWait = input.edgeAiPrediction
      ? input.edgeAiPrediction
      : Math.round(branch.currentQueue * 3.5);

    // 4. Create the ticket document
    const ticketRef = doc(collection(db, 'queueTickets'));
    const ticket: Omit<QueueTicket, 'ticketId'> = {
      ticketNumber,
      branchId: input.branchId,
      sessionId,
      citizenName: input.citizenName,
      citizenPhone: input.citizenPhone,
      category: input.category,
      status: 'WAITING',
      isPriority: input.isPriority ?? false,
      channel: input.channel,
      paymentStatus: input.paymentStatus ?? 'FREE',
      estimatedWait,
      queuePositionAtIssue: branch.currentQueue + 1,
      issuedAt: serverTimestamp() as Timestamp,
      edgeAiPrediction: input.edgeAiPrediction,
    };
    tx.set(ticketRef, ticket);

    // 5. Update session counter
    tx.update(sessionRef, { lastTicketNumber: newTicketNumber });

    // 6. Increment branch queue count; set FULL if at capacity
    const newQueueSize = branch.currentQueue + 1;
    const congestionLevel: CongestionLevel =
      newQueueSize >= branch.dailyCapacity * 0.9
        ? 'HIGH'
        : newQueueSize >= branch.dailyCapacity * 0.5
        ? 'MODERATE'
        : 'LOW';

    tx.update(branchRef, {
      currentQueue: increment(1),
      estimatedWait: Math.round(newQueueSize * 3.5),
      congestionLevel,
      lastTicketIssued: ticketNumber,
      ...(newQueueSize >= branch.dailyCapacity ? { branchStatus: 'FULL' } : {}),
    });

    return {
      queued: true as const,
      ticket: { ticketId: ticketRef.id, ...ticket } as QueueTicket,
    };
  });
}

export async function getTicket(ticketId: string): Promise<QueueTicket | null> {
  const snap = await getDoc(doc(db, 'queueTickets', ticketId));
  if (!snap.exists()) return null;
  return { ticketId: snap.id, ...snap.data() } as QueueTicket;
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus) {
  const updates: Record<string, unknown> = { status };
  if (status === 'CALLED') updates.calledAt = serverTimestamp();
  if (status === 'SERVED') updates.servedAt = serverTimestamp();
  await updateDoc(doc(db, 'queueTickets', ticketId), updates);
}

export async function getBranchActiveTickets(branchId: string): Promise<QueueTicket[]> {
  const today = new Date().toISOString().split('T')[0];
  const q = query(
    collection(db, 'queueTickets'),
    where('branchId', '==', branchId),
    where('sessionId', '==', `${branchId}_${today}`),
    where('status', 'in', ['WAITING', 'CALLED']),
    orderBy('issuedAt', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ticketId: d.id, ...d.data() } as QueueTicket));
}

// ─── Analytics Operations ─────────────────────────────────────────────────────

export async function writeAnalyticsSnapshot(
  branchId: string,
  queueCount: number,
  congestionLevel: CongestionLevel
) {
  const now = new Date();
  await addDoc(collection(db, 'analytics'), {
    branchId,
    queueCount,
    congestionLevel,
    timestamp: serverTimestamp(),
    dayOfWeek: now.getDay(),
    hourOfDay: now.getHours(),
  });
}

export async function getBranchHistoricalData(
  branchId: string,
  limitCount = 200
): Promise<AnalyticsSnapshot[]> {
  const q = query(
    collection(db, 'analytics'),
    where('branchId', '==', branchId),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as AnalyticsSnapshot);
}

// ─── Prediction Operations ────────────────────────────────────────────────────

export async function writePrediction(prediction: Omit<Prediction, 'generatedAt'>) {
  await addDoc(collection(db, 'predictions'), {
    ...prediction,
    generatedAt: serverTimestamp(),
  });
}

export async function getLatestPrediction(branchId: string): Promise<Prediction | null> {
  const q = query(
    collection(db, 'predictions'),
    where('branchId', '==', branchId),
    orderBy('generatedAt', 'desc'),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as Prediction;
}

// ─── Notification Operations ──────────────────────────────────────────────────

export async function writeNotification(notification: Omit<NotificationRecord, 'sentAt'>) {
  await addDoc(collection(db, 'notifications'), {
    ...notification,
    sentAt: serverTimestamp(),
  });
}

// ─── Queue data helper (used by Claude API routes) ────────────────────────────

export async function getQueueData(branchId: string) {
  const [branch, tickets, latestPrediction] = await Promise.all([
    getBranch(branchId),
    getBranchActiveTickets(branchId),
    getLatestPrediction(branchId),
  ]);
  return { branch, activeTicketCount: tickets.length, latestPrediction };
}

export async function getAllBranchData() {
  const branches = await getAllBranches();
  return branches.map(b => ({
    branchId: b.id,
    name: b.name,
    address: b.address,
    city: b.city,
    currentQueue: b.currentQueue,
    dailyCapacity: b.dailyCapacity,
    availableSlots: Math.max(0, b.dailyCapacity - b.currentQueue),
    estimatedWait: b.estimatedWait,
    congestionLevel: b.congestionLevel,
    branchStatus: b.branchStatus,
    department: b.department,
    lat: b.lat,
    lng: b.lng,
  }));
}
