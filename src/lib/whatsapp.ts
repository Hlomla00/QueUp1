/**
 * QueUp WhatsApp Client
 * =====================
 * Handles all outbound WhatsApp messaging via Twilio.
 * Also exports message-builders for every step in the conversation flow
 * so the webhook handler stays clean and readable.
 *
 * Uses Twilio's WhatsApp Business API sandbox / production number.
 * Swap the "from" number for a Meta-approved Business number in production.
 */

import twilio from 'twilio';
import type { Branch } from './firestore';

// ─── Twilio client (server-side only) ────────────────────────────────────────

function getClient() {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error('Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN');
  return twilio(sid, token);
}

/** Send a WhatsApp message to a citizen's phone number */
export async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  const from = process.env.TWILIO_WHATSAPP_NUMBER ?? '+14155238886'; // Twilio sandbox default
  const client = getClient();
  await client.messages.create({
    from: `whatsapp:${from}`,
    to:   `whatsapp:${to}`,
    body,
  });
}

/**
 * Build a synchronous TwiML reply — used inside the webhook handler to
 * reply immediately without a separate outbound API call.
 */
export function twimlReply(message: string): Response {
  // Escape XML special characters
  const safe = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${safe}</Message></Response>`,
    { headers: { 'Content-Type': 'text/xml' } }
  );
}

/** Empty TwiML reply — used when we handle the response asynchronously */
export function emptyTwiml(): Response {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
    { headers: { 'Content-Type': 'text/xml' } }
  );
}

// ─── Message templates ───────────────────────────────────────────────────────

export const MSG = {
  welcome: (name?: string) =>
    name
      ? `👋 Welcome back, ${name}! What would you like to do?\n\n1️⃣ Join a queue\n2️⃣ Check my position\n\nReply *CANCEL* to start over.`
      : `👋 Welcome to *QueUp* — South Africa's smart queue system! 🇿🇦\n\nSkip the line at Home Affairs, SASSA, SARS and more.\n\nPlease enter your *first name* to get started:`,

  askLocation: (name: string, locations: string[]) =>
    `Hi ${name}! 🙏\n\nChoose your *area*:\n\n${locations
      .map((l, i) => `${i + 1}️⃣ ${l}`)
      .join('\n')}\n\nReply with a number.`,

  askBranch: (branches: Branch[]) => {
    const list = branches
      .map((b, i) => {
        const status =
          b.branchStatus === 'FULL'
            ? '🔴 FULL'
            : b.congestionLevel === 'HIGH'
            ? '🟠 Busy'
            : '🟢 Available';
        return `${i + 1}️⃣ ${b.name}\n   ${status} · ${b.currentQueue} waiting · ~${b.estimatedWait} min`;
      })
      .join('\n\n');
    return `Choose your *branch*:\n\n${list}\n\nReply with a number, or *BACK* to change area.`;
  },

  branchFull: (branchName: string, recommendation: string) =>
    `⚠️ *${branchName} is full today.*\n\nNo more tickets are being issued.\n\n🤖 *QueUp AI suggests:*\n${recommendation}\n\nReply *1* to join the recommended branch, or *CANCEL* to exit.`,

  askService: (branchName: string, queueCount: number, estimatedWait: number) =>
    `📍 *${branchName}*\n👥 ${queueCount} people waiting · ⏱ ~${estimatedWait} min\n\nSelect your *service*:\n\n1️⃣ Smart ID Card\n2️⃣ Passport Services\n3️⃣ Birth Certificate\n4️⃣ SASSA Grant\n5️⃣ Tax Query\n6️⃣ Other\n\nReply with a number, or *BACK* to change branch.`,

  confirmPayment: (
    name: string,
    branchName: string,
    serviceTitle: string,
    position: number,
    estimatedWait: number
  ) =>
    `✅ *Almost there, ${name}!*\n\n📋 *Your Queue Details*\n━━━━━━━━━━━━━━━━━━━━\nBranch:   ${branchName}\nService:  ${serviceTitle}\nPosition: #${position}\nEst. wait: ~${estimatedWait} min\n━━━━━━━━━━━━━━━━━━━━\n\n💳 *Convenience fee: R65*\nThis reserves your spot remotely — no standing in line!\n\nReply *PAY* to proceed to secure payment.\nReply *CANCEL* to exit.`,

  paymentLink: (url: string) =>
    `💳 *Tap the link below to pay securely via PayFast:*\n\n${url}\n\n⏳ Your queue position is reserved for *15 minutes*.\nOnce payment is confirmed, your digital ticket will arrive here. ✨\n\nNeed help? Reply *HELP*.`,

  ticket: (
    ticketNumber: string,
    branchName: string,
    serviceTitle: string,
    position: number,
    estimatedWait: number
  ) =>
    `🎟️ *Your QueUp Ticket*\n━━━━━━━━━━━━━━━━━━━━\nTicket:    *${ticketNumber}*\nBranch:    ${branchName}\nService:   ${serviceTitle}\nPosition:  #${position}\nEst. wait: ~${estimatedWait} min\n━━━━━━━━━━━━━━━━━━━━\n\nWe'll WhatsApp you when:\n• 10 people are ahead of you\n• 5 people are ahead of you\n• It's your turn! 🔔\n\nReply *STATUS* anytime to check your position.\n\n*QueUp — No more lines. ✊🇿🇦*`,

  statusUpdate: (ticketNumber: string, aheadCount: number, estimatedWait: number) =>
    `📊 *Queue Status Update*\n\nTicket: ${ticketNumber}\n👥 ${aheadCount} people ahead of you\n⏱ Est. wait: ~${estimatedWait} min\n\nReply *CANCEL* to leave the queue.`,

  tenAhead: (ticketNumber: string, branchName: string) =>
    `⏰ *10 people left ahead of you!*\n\nTicket: ${ticketNumber}\nBranch: ${branchName}\n\nStart making your way to the branch now. See you soon! 🚶`,

  fiveAhead: (ticketNumber: string, branchName: string) =>
    `🏃 *Only 5 people ahead of you!*\n\nTicket: ${ticketNumber}\nBranch: ${branchName}\n\nPlease head to the branch *immediately*. You're almost up! ⚡`,

  yourTurn: (ticketNumber: string, branchName: string) =>
    `🔔 *IT'S YOUR TURN!*\n\n━━━━━━━━━━━━━━━━━━━━\nTicket: *${ticketNumber}*\nBranch: ${branchName}\n━━━━━━━━━━━━━━━━━━━━\n\nPlease proceed to the counter now. 🎯`,

  cancelled: () =>
    `👋 You've been removed from the queue.\n\nReply *JOIN* anytime to start a new queue request.\n\n*QueUp — queup.co.za*`,

  help: () =>
    `ℹ️ *QueUp Help*\n\nCommands:\n• *JOIN* — Start a new queue request\n• *STATUS* — Check your current position\n• *CANCEL* — Leave the queue\n• *RESTART* — Start over\n\nFor branch info visit *queup.co.za*\n📞 Support: support@queup.co.za`,

  invalidInput: () =>
    `❓ I didn't understand that. Please reply with a *number* from the menu, or type *HELP* for assistance.`,

  error: () =>
    `⚠️ Something went wrong on our end. Please try again or visit the branch directly.\n\nType *RESTART* to start over.`,
};

// ─── Service map ──────────────────────────────────────────────────────────────

export const SERVICE_OPTIONS = [
  { num: 1, title: 'Smart ID Card',      category: 'SMART_ID'          },
  { num: 2, title: 'Passport Services',  category: 'PASSPORT'          },
  { num: 3, title: 'Birth Certificate',  category: 'BIRTH_CERTIFICATE' },
  { num: 4, title: 'SASSA Grant',        category: 'SASSA'             },
  { num: 5, title: 'Tax Query',          category: 'TAX_QUERY'         },
  { num: 6, title: 'Other',              category: 'OTHER'             },
];

export function getServiceByNumber(num: number) {
  return SERVICE_OPTIONS.find(s => s.num === num) ?? null;
}
