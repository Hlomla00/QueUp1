/**
 * PayFast Payment URL Generator
 * ==============================
 * South African payment gateway — PCI DSS compliant.
 * Used by the WhatsApp flow to generate a secure R65 payment link
 * that the citizen taps inside WhatsApp.
 *
 * Docs: https://developers.payfast.co.za/documentation
 */

import crypto from 'crypto';

const PAYFAST_SANDBOX = 'https://sandbox.payfast.co.za/eng/process';
const PAYFAST_LIVE    = 'https://www.payfast.co.za/eng/process';

export interface PayFastParams {
  merchantId:  string;
  merchantKey: string;
  amount:      number;        // in Rands e.g. 65.00
  itemName:    string;
  paymentId:   string;        // your internal reference (m_payment_id)
  returnUrl:   string;
  cancelUrl:   string;
  notifyUrl:   string;        // IPN webhook URL
  nameFirst?:  string;
  nameLast?:   string;
  emailAddress?: string;
  cellNumber?: string;
  sandbox?:    boolean;
}

/** Build and sign a PayFast payment URL */
export function buildPayFastUrl(params: PayFastParams): string {
  const fields: Record<string, string> = {
    merchant_id:   params.merchantId,
    merchant_key:  params.merchantKey,
    return_url:    params.returnUrl,
    cancel_url:    params.cancelUrl,
    notify_url:    params.notifyUrl,
    name_first:    params.nameFirst   ?? '',
    name_last:     params.nameLast    ?? '',
    email_address: params.emailAddress ?? '',
    cell_number:   params.cellNumber  ?? '',
    m_payment_id:  params.paymentId,
    amount:        params.amount.toFixed(2),
    item_name:     params.itemName,
  };

  // Remove empty values before signing
  const clean = Object.fromEntries(
    Object.entries(fields).filter(([, v]) => v !== '')
  );

  // Build query string in declared order (PayFast is order-sensitive)
  const queryString = Object.entries(clean)
    .map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%20/g, '+')}`)
    .join('&');

  // Add passphrase if set
  const passphrase = process.env.PAYFAST_PASSPHRASE;
  const toSign = passphrase
    ? `${queryString}&passphrase=${encodeURIComponent(passphrase).replace(/%20/g, '+')}`
    : queryString;

  const signature = crypto.createHash('md5').update(toSign).digest('hex');

  const base = params.sandbox ? PAYFAST_SANDBOX : PAYFAST_LIVE;
  return `${base}?${queryString}&signature=${signature}`;
}

/** Generate the convenience-fee payment URL for the WhatsApp flow */
export function generateQueuePaymentUrl(opts: {
  paymentRef: string;
  citizenName: string;
  phone: string;
  branchName: string;
  serviceTitle: string;
  appBaseUrl: string;
}): string {
  const [firstName, ...rest] = opts.citizenName.split(' ');
  const sandbox = process.env.NODE_ENV !== 'production';

  return buildPayFastUrl({
    merchantId:   process.env.PAYFAST_MERCHANT_ID  ?? '10000100',
    merchantKey:  process.env.PAYFAST_MERCHANT_KEY ?? 'test',
    amount:       65.00,
    itemName:     `QueUp Queue Ticket – ${opts.serviceTitle}`,
    paymentId:    opts.paymentRef,
    returnUrl:    `${opts.appBaseUrl}/payment/success?ref=${opts.paymentRef}`,
    cancelUrl:    `${opts.appBaseUrl}/payment/cancelled?ref=${opts.paymentRef}`,
    notifyUrl:    `${opts.appBaseUrl}/api/whatsapp/payment-confirm`,
    nameFirst:    firstName,
    nameLast:     rest.join(' ') || undefined,
    cellNumber:   opts.phone,
    sandbox,
  });
}
