/**
 * POST /api/whatsapp/webhook
 * ==========================
 * Twilio WhatsApp inbound message webhook.
 * This is the brain of the WhatsApp queue-joining flow.
 *
 * Twilio sends application/x-www-form-urlencoded POST requests with:
 *   Body  — the citizen's message text
 *   From  — "whatsapp:+27821234567"
 *   To    — our Twilio WhatsApp number
 *
 * Conversation state machine:
 *   GET_NAME → GET_LOCATION → GET_BRANCH → GET_SERVICE
 *   → CONFIRM_PAYMENT → PAYMENT_PENDING → ACTIVE → DONE
 *
 * Configure this URL in your Twilio Console:
 *   Messaging → Try it Out → WhatsApp → Sandbox → "When a message comes in"
 *   → POST https://your-domain.com/api/whatsapp/webhook
 */

import { NextRequest } from 'next/server';
import {
  twimlReply,
  MSG,
  getServiceByNumber,
  sendWhatsAppMessage,
} from '@/lib/whatsapp';
import {
  getSession,
  createSession,
  updateSession,
  resetSession,
  cleanPhone,
  type WhatsAppSession,
} from '@/lib/whatsapp-session';
import {
  getAllBranches,
  createTicket,
  getTicket,
  getBranchActiveTickets,
  type Branch,
} from '@/lib/firestore';
import { generateQueuePaymentUrl } from '@/lib/payfast';

export const dynamic = 'force-dynamic';

// ─── Location groupings (matches seeded branches) ────────────────────────────

const LOCATION_GROUPS: Record<string, string[]> = {
  'Cape Town': ['ha-cbd', 'sars-pinelands'],
  'Bellville':  ['ha-bellville', 'sassa-tygervalley'],
  "Mitchells Plain": ['ha-mitchells-plain'],
};

const ALL_LOCATIONS = Object.keys(LOCATION_GROUPS);

function getLocationByNumber(num: number): string | null {
  return ALL_LOCATIONS[num - 1] ?? null;
}

// ─── Webhook handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Parse Twilio's URL-encoded body
  let body = '';
  let from = '';
  try {
    const formData = await req.formData();
    body = (formData.get('Body') as string ?? '').trim();
    from = (formData.get('From') as string ?? '').trim();
  } catch {
    return twimlReply(MSG.error());
  }

  if (!from) return new Response('', { status: 400 });

  const phone = cleanPhone(from);           // "+27821234567"
  const text  = body.toLowerCase().trim();

  // ── Global commands (work at any step) ──────────────────────────────────
  if (['cancel', 'stop', 'quit'].includes(text)) {
    await resetSession(phone);
    return twimlReply(MSG.cancelled());
  }
  if (['help', '?'].includes(text)) {
    return twimlReply(MSG.help());
  }
  if (['restart', 'start', 'join', 'hi', 'hello', 'hie', 'hey', 'sawubona'].includes(text)) {
    await resetSession(phone);
    return twimlReply(MSG.welcome());
  }

  // ── Load or create session ───────────────────────────────────────────────
  let session: WhatsAppSession | null = await getSession(phone);
  if (!session) {
    await createSession(phone);
    return twimlReply(MSG.welcome());
  }

  // ── Route by conversation step ───────────────────────────────────────────
  try {
    switch (session.step) {

      // ── Step 1: Get citizen name ────────────────────────────────────────
      case 'GET_NAME': {
        if (body.length < 2 || body.length > 50) {
          return twimlReply('Please enter a valid first name (2-50 characters):');
        }
        const name = body.split(' ')[0]; // first name only
        await updateSession(phone, { citizenName: name, step: 'GET_LOCATION' });
        return twimlReply(MSG.askLocation(name, ALL_LOCATIONS));
      }

      // ── Step 2: Choose location ─────────────────────────────────────────
      case 'GET_LOCATION': {
        const choice = parseInt(body, 10);
        const location = getLocationByNumber(choice);
        if (!location) return twimlReply(MSG.invalidInput());

        // Fetch live branch data for this location
        const allBranches = await getAllBranches();
        const branchIds = LOCATION_GROUPS[location];
        const branches = allBranches.filter(b => branchIds.includes(b.id) && b.isActive);

        if (branches.length === 0) {
          return twimlReply(`No active branches in ${location} right now. Try another area.`);
        }

        // Store branch list order in session as JSON (needed for next step)
        await updateSession(phone, {
          locationFilter: location,
          step: 'GET_BRANCH',
          // store ordered IDs so number selection maps correctly
          citizenName: session.citizenName,
        });

        // We store branches in a temporary context key via a simple ordered approach:
        // The citizen replies with a number → we re-fetch and re-filter in GET_BRANCH
        return twimlReply(MSG.askBranch(branches));
      }

      // ── Step 3: Choose branch ───────────────────────────────────────────
      case 'GET_BRANCH': {
        if (text === 'back') {
          await updateSession(phone, { step: 'GET_LOCATION' });
          return twimlReply(MSG.askLocation(session.citizenName!, ALL_LOCATIONS));
        }

        const choice = parseInt(body, 10);
        if (isNaN(choice) || choice < 1) return twimlReply(MSG.invalidInput());

        const allBranches = await getAllBranches();
        const branchIds = LOCATION_GROUPS[session.locationFilter!] ?? [];
        const branches = allBranches.filter(b => branchIds.includes(b.id) && b.isActive);
        const chosen = branches[choice - 1];
        if (!chosen) return twimlReply(MSG.invalidInput());

        // Branch full → Claude redirect recommendation
        if (chosen.branchStatus === 'FULL') {
          const redirectRes = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:9002'}/api/redirect`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                currentBranchId: chosen.id,
                serviceType: 'general government service',
                citizenLocation: session.locationFilter ?? chosen.city,
              }),
            }
          );
          const { recommendation } = await redirectRes.json();
          return twimlReply(MSG.branchFull(chosen.name, recommendation ?? 'Please try a nearby branch.'));
        }

        await updateSession(phone, {
          branchId: chosen.id,
          branchName: chosen.name,
          step: 'GET_SERVICE',
        });
        return twimlReply(MSG.askService(chosen.name, chosen.currentQueue, chosen.estimatedWait));
      }

      // ── Step 4: Choose service ──────────────────────────────────────────
      case 'GET_SERVICE': {
        if (text === 'back') {
          await updateSession(phone, { step: 'GET_BRANCH' });
          const allBranches = await getAllBranches();
          const branchIds = LOCATION_GROUPS[session.locationFilter!] ?? [];
          const branches = allBranches.filter(b => branchIds.includes(b.id) && b.isActive);
          return twimlReply(MSG.askBranch(branches));
        }

        const choice = parseInt(body, 10);
        const service = getServiceByNumber(choice);
        if (!service) return twimlReply(MSG.invalidInput());

        // Get current branch state for position estimate
        const allBranches = await getAllBranches();
        const branch = allBranches.find(b => b.id === session.branchId);
        const position = (branch?.currentQueue ?? 0) + 1;
        const estimatedWait = branch?.estimatedWait ?? Math.round(position * 3.5);

        await updateSession(phone, {
          serviceCategory: service.category,
          serviceTitle: service.title,
          step: 'CONFIRM_PAYMENT',
        });

        return twimlReply(
          MSG.confirmPayment(
            session.citizenName!,
            session.branchName!,
            service.title,
            position,
            estimatedWait
          )
        );
      }

      // ── Step 5: Confirm payment ─────────────────────────────────────────
      case 'CONFIRM_PAYMENT': {
        if (!['pay', 'yes', '1'].includes(text)) {
          if (['no', 'cancel', '2'].includes(text)) {
            await resetSession(phone);
            return twimlReply(MSG.cancelled());
          }
          return twimlReply('Reply *PAY* to proceed to payment, or *CANCEL* to exit.');
        }

        // Generate unique payment reference
        const paymentRef = `wa_${phone.replace('+', '')}_${Date.now()}`;
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:9002';

        const payUrl = generateQueuePaymentUrl({
          paymentRef,
          citizenName: session.citizenName!,
          phone,
          branchName: session.branchName!,
          serviceTitle: session.serviceTitle!,
          appBaseUrl: appUrl,
        });

        await updateSession(phone, {
          paymentRef,
          step: 'PAYMENT_PENDING',
        });

        return twimlReply(MSG.paymentLink(payUrl));
      }

      // ── Step 6: Payment pending ─────────────────────────────────────────
      case 'PAYMENT_PENDING': {
        // Payment confirmation arrives via /api/whatsapp/payment-confirm webhook
        // If citizen messages again while waiting, reassure them
        return twimlReply(
          `⏳ We're still waiting for your payment confirmation.\n\nIf you've already paid, your ticket will arrive shortly.\n\nType *CANCEL* to exit or *RESTART* to start over.`
        );
      }

      // ── Step 7: Active — ticket issued, monitoring queue ────────────────
      case 'ACTIVE': {
        if (text === 'status' && session.ticketId) {
          const ticket = await getTicket(session.ticketId);
          if (!ticket) return twimlReply('Could not find your ticket. Type *RESTART* to start over.');

          const activeTickets = await getBranchActiveTickets(ticket.branchId);
          const myIdx = activeTickets.findIndex(t => t.ticketId === session.ticketId);
          const ahead = myIdx >= 0 ? myIdx : 0;
          const estimatedWait = Math.round(ahead * 3.5);

          return twimlReply(MSG.statusUpdate(ticket.ticketNumber, ahead, estimatedWait));
        }

        return twimlReply(
          `Your ticket is active! 🎟️\n\nReply *STATUS* to check your position.\nReply *CANCEL* to leave the queue.`
        );
      }

      default:
        await resetSession(phone);
        return twimlReply(MSG.welcome());
    }
  } catch (err) {
    console.error('[WhatsApp webhook error]', err);
    return twimlReply(MSG.error());
  }
}
