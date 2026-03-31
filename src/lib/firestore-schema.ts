/**
 * QueUp — Firestore collection schemas & TypeScript types.
 *
 * Collections
 * ───────────
 *  branches        – physical service branches
 *  queueTickets    – individual citizen tickets
 *  analytics       – hourly aggregated stats per branch
 *  predictions     – TFLite / ML model predictions
 *  notifications   – WhatsApp / SMS / push records
 */
import { Timestamp } from 'firebase-admin/firestore';

// ─────────────────────────────────────────────
// branches
// ─────────────────────────────────────────────
export interface Branch {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  coordinates: { lat: number; lng: number };
  serviceTypes: string[];          // e.g. ['smart_id', 'passport', 'birth_cert']
  capacity: number;                // max simultaneous queue slots
  currentQueue: number;            // live count
  avgServiceTime: number;          // minutes per citizen
  isOpen: boolean;
  openHours: { open: string; close: string }; // "08:00" / "16:00"
  congestionLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'FULL';
  department: string;              // e.g. 'Home Affairs'
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─────────────────────────────────────────────
// queueTickets
// ─────────────────────────────────────────────
export type TicketStatus = 'WAITING' | 'SERVING' | 'COMPLETED' | 'CANCELLED' | 'REDIRECTED';
export type TicketSource = 'kiosk' | 'qr' | 'web' | 'android';

export interface QueueTicket {
  id: string;
  branchId: string;
  branchName: string;
  ticketNumber: string;            // e.g. "B-047"
  citizenName: string;
  citizenPhone: string;
  serviceType: string;             // e.g. 'smart_id'
  serviceLabel: string;            // e.g. 'Smart ID Card'
  status: TicketStatus;
  position: number;                // queue position at issue time
  estimatedWaitMinutes: number;    // from Queue Intelligence Engine
  tfliteWaitPrediction: number;    // from TFLite edge model
  issuedAt: Timestamp;
  calledAt: Timestamp | null;
  completedAt: Timestamp | null;
  source: TicketSource;
  redirectedTo: string | null;     // branchId if redirected
  notified: boolean;
}

// ─────────────────────────────────────────────
// analytics
// ─────────────────────────────────────────────
export interface AnalyticsRecord {
  id: string;
  branchId: string;
  date: string;                    // "YYYY-MM-DD"
  hour: number;                    // 0-23
  dayOfWeek: string;               // 'Monday' … 'Sunday'
  avgQueueSize: number;
  avgWaitMinutes: number;
  ticketsIssued: number;
  ticketsCompleted: number;
  ticketsCancelled: number;
  peakHour: number;
  congestionDistribution: { LOW: number; MODERATE: number; HIGH: number };
  createdAt: Timestamp;
}

// ─────────────────────────────────────────────
// predictions
// ─────────────────────────────────────────────
export interface Prediction {
  id: string;
  branchId: string;
  predictedAt: Timestamp;
  hour: number;
  dayOfWeek: number;               // 0 = Sunday
  predictedQueueSize: number;
  predictedWaitMinutes: number;
  confidence: number;              // 0-1
  modelVersion: string;            // e.g. "tflite_v1"
  inputFeatures: {
    hourOfDay: number;
    dayOfWeek: number;
    queueSize: number;
  };
}

// ─────────────────────────────────────────────
// notifications
// ─────────────────────────────────────────────
export type NotificationType =
  | 'QUEUE_JOINED'
  | 'ALMOST_YOUR_TURN'
  | 'YOUR_TURN'
  | 'REDIRECT'
  | 'CANCELLED';

export type NotificationChannel = 'sms' | 'whatsapp' | 'push';
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface Notification {
  id: string;
  ticketId: string;
  branchId: string;
  citizenPhone: string;
  type: NotificationType;
  message: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  sentAt: Timestamp | null;
  createdAt: Timestamp;
}

// ─────────────────────────────────────────────
// Collection name constants
// ─────────────────────────────────────────────
export const COLLECTIONS = {
  BRANCHES: 'branches',
  QUEUE_TICKETS: 'queueTickets',
  ANALYTICS: 'analytics',
  PREDICTIONS: 'predictions',
  NOTIFICATIONS: 'notifications',
} as const;

// ─────────────────────────────────────────────
// Seed data – Cape Town branches for the demo
// ─────────────────────────────────────────────
import { FieldValue } from 'firebase-admin/firestore';

export const SEED_BRANCHES: Omit<Branch, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Home Affairs Bellville',
    address: '2 Voortrekker Rd, Bellville',
    city: 'Cape Town',
    province: 'Western Cape',
    coordinates: { lat: -33.8998, lng: 18.6308 },
    serviceTypes: ['smart_id', 'passport', 'birth_cert', 'marriage_cert'],
    capacity: 80,
    currentQueue: 23,
    avgServiceTime: 12,
    isOpen: true,
    openHours: { open: '08:00', close: '16:00' },
    congestionLevel: 'MODERATE',
    department: 'Home Affairs',
  },
  {
    name: 'Home Affairs Cape Town CBD',
    address: '56 Barrack St, Cape Town City Centre',
    city: 'Cape Town',
    province: 'Western Cape',
    coordinates: { lat: -33.9249, lng: 18.4241 },
    serviceTypes: ['smart_id', 'passport', 'birth_cert'],
    capacity: 60,
    currentQueue: 57,
    avgServiceTime: 10,
    isOpen: true,
    openHours: { open: '08:00', close: '15:30' },
    congestionLevel: 'FULL',
    department: 'Home Affairs',
  },
  {
    name: 'Home Affairs Mitchells Plain',
    address: 'Shop 23, Town Centre Mall, Mitchells Plain',
    city: 'Cape Town',
    province: 'Western Cape',
    coordinates: { lat: -34.0344, lng: 18.6154 },
    serviceTypes: ['smart_id', 'birth_cert', 'marriage_cert'],
    capacity: 50,
    currentQueue: 8,
    avgServiceTime: 11,
    isOpen: true,
    openHours: { open: '08:00', close: '16:00' },
    congestionLevel: 'LOW',
    department: 'Home Affairs',
  },
  {
    name: 'SASSA Goodwood',
    address: '111 Jan van Riebeeck Dr, Goodwood',
    city: 'Cape Town',
    province: 'Western Cape',
    coordinates: { lat: -33.9078, lng: 18.5533 },
    serviceTypes: ['grant_application', 'grant_status', 'disability'],
    capacity: 100,
    currentQueue: 41,
    avgServiceTime: 15,
    isOpen: true,
    openHours: { open: '07:30', close: '15:30' },
    congestionLevel: 'MODERATE',
    department: 'SASSA',
  },
  {
    name: 'DLTC Milnerton',
    address: 'Race Course Rd, Milnerton',
    city: 'Cape Town',
    province: 'Western Cape',
    coordinates: { lat: -33.8670, lng: 18.4930 },
    serviceTypes: ['drivers_license', 'learners_license', 'vehicle_reg'],
    capacity: 70,
    currentQueue: 15,
    avgServiceTime: 20,
    isOpen: true,
    openHours: { open: '08:00', close: '15:00' },
    congestionLevel: 'LOW',
    department: 'DLTC',
  },
];
