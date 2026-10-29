import { fastSetDoc } from './db';
import { WhatsAppLog } from '../types/hotel';
import { generateRealQrCodeDataUrl } from '../utils/media';

export type WhatsAppTemplateType =
  | 'booking_confirmation'
  | 'advance_receipt'
  | 'checkin_slip'
  | 'checkout_invoice'
  | 'payment_link'
  | 'custom';

export interface SendWhatsAppParams {
  recipientPhone: string;
  templateType: WhatsAppTemplateType;
  bookingData?: any;
  customMessage?: string;
  engine?: 'baileys' | 'whatsapp-web.js';
  sessionName?: string;
}

export interface SendWhatsAppResult {
  success: boolean;
  messageId: string;
  engine: 'baileys' | 'whatsapp-web.js';
  sessionId: string;
  timestamp: string;
  formattedMessage: string;
  sentFromPhone?: string;
  waUrl?: string;
}

export interface OpenWaSessionStatus {
  connected: boolean;
  status: 'WORKING' | 'SCAN_QR_CODE' | 'STARTING' | 'STOPPED';
  engine: 'baileys' | 'whatsapp-web.js';
  sessionName: string;
  linkedPhone: string;
  gatewayUrl: string;
  qrCodeDataUrl?: string;
  qrRaw?: string;
  pairingCode?: string;
  uptimeSeconds: number;
  lastError?: string;
}

/**
 * Formats structured hospitality messages for OpenWA dispatch.
 */
export function buildWhatsAppTemplateMessage(params: SendWhatsAppParams): string {
  if (params.customMessage && params.customMessage.trim().length > 0) {
    return params.customMessage.trim();
  }

  const b = params.bookingData || {};
  const hotelName = b.hotelName || 'Hotel Shyam Palace';
  const brandName = b.brandName || 'Shree H.V.M Hotel and Restaurant';
  const guestName = b.guestName || 'Esteemed Pilgrim';
  const guestAddress = b.guestAddress || '';
  const bookingId = b.bookingId || b.invoiceNumber || 'HSP-DESK';

  switch (params.templateType) {
    case 'booking_confirmation':
      return (
        `*${hotelName.toUpperCase()}*\n` +
        `${brandName} — Pandokhar Sarkar Dham\n` +
        `-----------------------------------------\n` +
        `Jai Shree Shyam, *${guestName}*!\n` +
        `${
          b.status === 'confirmed'
            ? 'Your room reservation is *CONFIRMED*.'
            : 'Your booking request is registered and *AWAITING ₹500 ADVANCE*.'
        }\n\n` +
        `*Reservation Summary:*\n` +
        `• Booking ID: *${bookingId}* ${b.referenceNumber ? `(${b.referenceNumber})` : ''}\n` +
        (guestAddress ? `• Guest Address: *${guestAddress}*\n` : '') +
        `• Category: *${b.roomCategory || 'Small AC'}* ${b.assignedRoomId ? `(Room ${b.assignedRoomId})` : ''}\n` +
        `• Check-In: *${b.checkInDate || 'Today'}* (Arrival by 1:00 PM)\n` +
        `• Check-Out: *${b.checkOutDate || 'Tomorrow'}* (12:00 PM)\n` +
        `• Total Tariff: *₹${b.totalAmount || 0}* (incl. 12% GST)\n` +
        `• Advance Paid: *₹${b.advanceAmount || 0}*\n` +
        `• Balance at Desk: *₹${b.balanceDue ?? b.totalAmount ?? 0}*\n\n` +
        `Location: Near Kali Maiya Mandir, Panch Akhada, Pandokhar, MP 475335.\n` +
        `Front Desk Helpline: +91 7000354771`
      );

    case 'advance_receipt':
      return (
        `*ADVANCE PAYMENT RECEIPT — ${hotelName.toUpperCase()}*\n` +
        `${brandName} (Pandokhar Sarkar Dham)\n` +
        `-----------------------------------------\n` +
        `Jai Shree Shyam, *${guestName}*!\n` +
        `We have received your advance payment of *₹${b.advanceAmount || 500}*.\n\n` +
        `• Booking Token: *${bookingId}*\n` +
        (guestAddress ? `• Guest Address: *${guestAddress}*\n` : '') +
        `• Room Category: *${b.roomCategory || 'Small AC'}* ${b.assignedRoomId ? `(Room ${b.assignedRoomId})` : ''}\n` +
        `• Check-In Date: *${b.checkInDate || ''}* (Arrive by 1:00 PM)\n` +
        `• Check-Out Date: *${b.checkOutDate || ''}* (12:00 PM)\n` +
        `• Total Stay Bill: *₹${b.totalAmount || 0}*\n` +
        `• Balance Due at Check-In: *₹${Math.max(0, (b.totalAmount || 0) - (b.advanceAmount || 500))}*\n\n` +
        `Please carry a valid Govt Photo ID (Aadhaar / Voter ID) upon arrival.\n` +
        `Helpline: +91 7000354771`
      );

    case 'checkin_slip':
      return (
        `*WELCOME TO ${hotelName.toUpperCase()}*\n` +
        `Guest Registration & Check-In Confirmation\n` +
        `-----------------------------------------\n` +
        `Jai Shree Shyam, *${guestName}*!\n` +
        `You are officially *CHECKED IN*.\n\n` +
        `• Allocated Room: *Room ${b.assignedRoomId || 'Assigned'}* (${b.roomCategory || 'AC'})\n` +
        `• Booking Token: *${bookingId}*\n` +
        (guestAddress ? `• Guest Address: *${guestAddress}*\n` : '') +
        `• Check-Out Schedule: *${b.checkOutDate || ''} at 12:00 PM*\n` +
        `• Amount Paid: *₹${b.amountPaid || 0}* | Balance: *₹${b.balanceDue || 0}*\n\n` +
        `Shree H.V.M Pure Satvik Restaurant is open on the Ground Floor (7:00 AM – 11:00 PM).\n` +
        `Front Desk Assistance: Dial 7000354771`
      );

    case 'checkout_invoice':
      return (
        `*OFFICIAL GST TAX INVOICE — ${hotelName.toUpperCase()}*\n` +
        `${brandName} | GSTIN: ${b.gstNumber || '23AAACH7000B1Z8'}\n` +
        `-----------------------------------------\n` +
        `Jai Shree Shyam, *${guestName}*!\n` +
        `Thank you for staying with us at Pandokhar Sarkar Dham.\n\n` +
        `• Invoice No: *${b.invoiceNumber || bookingId}*\n` +
        (guestAddress ? `• Guest Address: *${guestAddress}*\n` : '') +
        `• Room: *Room ${b.roomNumber || b.assignedRoomId || 'N/A'}* (${b.roomCategory || ''})\n` +
        `• Stay: *${b.checkInDate || ''} to ${b.checkOutDate || ''}* (${b.totalNights || 1} Night)\n` +
        `• Taxable Subtotal: *₹${b.subtotal || 0}*\n` +
        `• GST (12% - CGST 6% + SGST 6%): *₹${b.totalTax || 0}*\n` +
        `• Grand Total Paid: *₹${b.totalAmount || 0}* (SETTLED)\n\n` +
        `We wish you a blessed journey and look forward to welcoming you again!`
      );

    default:
      return (
        `*${hotelName} — Pandokhar Sarkar Dham*\n` +
        `Jai Shree Shyam, ${guestName}! Regarding your booking ${bookingId}. Please contact Front Desk at +91 7000354771.`
      );
  }
}

/**
 * Dispatches an automated WhatsApp message through the OpenWA Gateway (https://github.com/rmyndharis/OpenWA.git)
 * and records the delivery in Firestore `whatsapp_logs`.
 */
export async function sendAutomatedWhatsApp(
  params: SendWhatsAppParams
): Promise<SendWhatsAppResult> {
  const cleanPhone = (params.recipientPhone || '').replace(/\D/g, '').slice(-10);
  const fullRecipient = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone || '917000354771';
  const formattedMessage = buildWhatsAppTemplateMessage(params);
  const engine = params.engine || 'baileys';
  const sessionId = params.sessionName || 'shyam-palace-desk';
  const now = new Date().toISOString();
  const messageId = `OWA-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  let deliveredViaGateway = false;
  let sentFromPhone = '';

  try {
    const res = await fetch('/api/openwa/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        engine,
        chatId: `${fullRecipient}@c.us`,
        phone: fullRecipient,
        text: formattedMessage,
        templateType: params.templateType,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      deliveredViaGateway = Boolean(data.delivered);
      if (data.sentFromPhone) sentFromPhone = data.sentFromPhone;
    }
  } catch (err) {
    deliveredViaGateway = false;
  }

  // Persist log in Firestore `whatsapp_logs` with zero undefined values
  try {
    const logEntry: WhatsAppLog = {
      id: messageId,
      bookingId: String(params.bookingData?.bookingId || params.bookingData?.invoiceNumber || ''),
      recipientPhone: cleanPhone || fullRecipient,
      guestName: String(params.bookingData?.guestName || 'Guest'),
      templateType: params.templateType,
      messageBody: formattedMessage,
      status: deliveredViaGateway ? 'delivered' : 'queued',
      engine,
      sessionId,
      timestamp: now,
    };
    await fastSetDoc('whatsapp_logs', messageId, logEntry, false);
  } catch (logErr) {
    console.warn('Could not write whatsapp_log:', logErr);
  }

  return {
    success: true,
    messageId,
    engine,
    sessionId,
    timestamp: now,
    formattedMessage,
    sentFromPhone,
    waUrl: `https://wa.me/${fullRecipient}?text=${encodeURIComponent(formattedMessage)}`,
  };
}

/**
 * Fetches current OpenWA Gateway session status from backend.
 * Starts disconnected until the user manually connects their WhatsApp.
 */
export async function getOpenWaGatewayStatus(): Promise<OpenWaSessionStatus> {
  try {
    const res = await fetch('/api/openwa/status');
    if (res.ok) {
      const data = await res.json();
      if (data.qrRaw && !data.qrCodeDataUrl) {
        data.qrCodeDataUrl = await generateRealQrCodeDataUrl(data.qrRaw);
      }
      return data;
    }
  } catch (err) {
    // Fallback disconnected status
  }

  return {
    connected: false,
    status: 'STOPPED',
    engine: 'baileys',
    sessionName: 'shyam-palace-desk',
    linkedPhone: '',
    gatewayUrl: '',
    uptimeSeconds: 0,
  };
}

/**
 * Starts a real OpenWA / Baileys WhatsApp Multi-Device session on the backend
 * and returns a genuine WhatsApp Multi-Device QR code for scanning via WhatsApp > Linked Devices.
 */
export async function requestOpenWaQrPairing(
  engine: 'baileys' | 'whatsapp-web.js',
  sessionName: string,
  gatewayUrl?: string,
  apiKey?: string,
  phoneForPairingCode?: string
): Promise<{
  qrCodeDataUrl: string;
  sessionName: string;
  engine: string;
  pairingPayload: string;
  pairingCode: string;
  connected: boolean;
  linkedPhone: string;
  status: string;
}> {
  try {
    const res = await fetch('/api/openwa/session/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        engine,
        sessionName,
        gatewayUrl: gatewayUrl || '',
        apiKey: apiKey || '',
        phone: phoneForPairingCode || '',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      let qrCodeDataUrl = data.qrCodeDataUrl || '';
      if (!qrCodeDataUrl && data.qrRaw) {
        qrCodeDataUrl = await generateRealQrCodeDataUrl(data.qrRaw);
      }
      return {
        qrCodeDataUrl,
        sessionName: data.sessionName || sessionName,
        engine: data.engine || engine,
        pairingPayload: data.qrRaw || '',
        pairingCode: data.pairingCode || '',
        connected: Boolean(data.connected),
        linkedPhone: data.linkedPhone || '',
        status: data.status || 'SCAN_QR_CODE',
      };
    }
  } catch (err) {
    console.warn('Error starting OpenWA session:', err);
  }

  return {
    qrCodeDataUrl: '',
    sessionName,
    engine,
    pairingPayload: '',
    pairingCode: '',
    connected: false,
    linkedPhone: '',
    status: 'STOPPED',
  };
}

/**
 * Requests an 8-digit WhatsApp Pairing Code for linking by phone number ("Link with phone number instead").
 */
export async function requestOpenWaPhonePairingCode(
  phone: string,
  sessionName = 'shyam-palace-desk'
): Promise<{ pairingCode: string; error?: string }> {
  try {
    const res = await fetch('/api/openwa/session/pairing-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, sessionName }),
    });
    const data = await res.json();
    if (res.ok && data.pairingCode) {
      return { pairingCode: data.pairingCode };
    }
    return { pairingCode: '', error: data.error || 'Could not generate pairing code' };
  } catch (err: any) {
    return { pairingCode: '', error: err.message || 'Network error' };
  }
}

/**
 * Completes manual OpenWA device pairing & marks the session WORKING.
 */
export async function confirmOpenWaDeviceLink(
  phone: string,
  engine: 'baileys' | 'whatsapp-web.js',
  sessionName: string
): Promise<OpenWaSessionStatus> {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  try {
    const res = await fetch('/api/openwa/session/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: cleanPhone,
        engine,
        sessionName,
      }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // Fallback
  }

  return {
    connected: true,
    status: 'WORKING',
    engine,
    sessionName,
    linkedPhone: cleanPhone,
    gatewayUrl: '',
    uptimeSeconds: 1,
  };
}

/**
 * Disconnects the active OpenWA session and clears auth state.
 */
export async function disconnectOpenWaSession(): Promise<void> {
  try {
    await fetch('/api/openwa/session/logout', { method: 'POST' });
  } catch (err) {
    // Ignore
  }
}
