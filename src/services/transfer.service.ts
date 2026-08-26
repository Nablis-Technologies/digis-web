import { notificationsStore, DEMO_TRANSFER_TOKEN } from '@/services/notifications.service';
import { ticketsService } from '@/services/tickets.service';
import { getEventImage } from '@/lib/utils/eventImages';
import type { UserTicket } from '@/types/ticket';

export type TransferContactMethod = 'phone' | 'email';

/** A ticket snapshot carried by a transfer link / notification until claimed. */
export interface TicketTransfer {
  token: string;
  status: 'pending' | 'claimed';
  fromName: string;
  recipientName: string;
  contactMethod: TransferContactMethod;
  contactValue: string;
  note: string;
  createdAt: string;
  /** The scannable pass code — available to the recipient whether or not they have an account. */
  qrCode: string;
  ticket: {
    id?: string;
    eventId?: string;
    eventName: string;
    eventDate: string;
    eventTime?: string;
    venue: string;
    ticketType: string;
    ticketLevel?: string;
    image?: string;
    seat?: string;
  };
}

export interface SendTransferInput {
  fromName: string;
  recipientName: string;
  contactMethod: TransferContactMethod;
  contactValue: string;
  note: string;
  ticket: TicketTransfer['ticket'];
}

export interface SendTransferResult {
  token: string;
  /** A shareable deep link to send over email / SMS. */
  link: string;
  /** Whether the recipient has a Digis account (they get an in-app notification). */
  recipientHasAccount: boolean;
}

const STORAGE_KEY = 'digis.transfers.v1';

function loadTransfers(): Map<string, TicketTransfer> {
  if (typeof window === 'undefined') return new Map();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    return new Map(Object.entries(JSON.parse(raw) as Record<string, TicketTransfer>));
  } catch {
    return new Map();
  }
}

const transfers = loadTransfers();

// Seed a claimable demo transfer so the "You received a ticket" notification
// resolves to a fully populated claim page out of the box.
if (!transfers.has(DEMO_TRANSFER_TOKEN)) {
  transfers.set(DEMO_TRANSFER_TOKEN, {
    token: DEMO_TRANSFER_TOKEN,
    status: 'pending',
    fromName: 'Selam',
    recipientName: 'You',
    contactMethod: 'phone',
    contactValue: '+251 91 234 5678',
    note: 'Couldn’t make it — enjoy the coffee ceremony! ☕',
    createdAt: new Date().toISOString(),
    qrCode: 'DIGIS-TRANSFER-DEMO-COFFEE',
    ticket: {
      eventId: '2',
      eventName: 'Ethiopian Coffee Culture Night',
      eventDate: 'March 20, 2026',
      eventTime: '6:00 PM',
      venue: 'Sheraton Addis',
      ticketType: 'Regular',
      seat: 'Balcony · F4',
      image: getEventImage('Ethiopian Coffee Culture Night'),
    },
  });
}

function persistTransfers() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(transfers)));
  } catch {
    /* keep in-memory only */
  }
}

const genToken = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/**
 * Mock heuristic for "does this contact already have a Digis account?". A real
 * backend would look the recipient up; here we treat any Ethiopian mobile number
 * or gmail address as an existing account so the notification path is demoable.
 */
function recipientHasAccount(method: TransferContactMethod, value: string): boolean {
  const v = value.trim().toLowerCase();
  if (method === 'email') return v.endsWith('@gmail.com') || v.endsWith('@digis.app');
  const digits = v.replace(/\D/g, '');
  return digits.startsWith('2519') || digits.startsWith('09');
}

/** Build a claim deep link that survives the hash router. */
function buildLink(token: string): string {
  const path = `/claim/${token}`;
  if (typeof window === 'undefined') return `#${path}`;
  return `${window.location.origin}${window.location.pathname}#${path}`;
}

export const transferService = {
  sendTransfer(input: SendTransferInput): SendTransferResult {
    const token = genToken();
    const transfer: TicketTransfer = {
      token,
      status: 'pending',
      fromName: input.fromName || 'A friend',
      recipientName: input.recipientName,
      contactMethod: input.contactMethod,
      contactValue: input.contactValue,
      note: input.note,
      createdAt: new Date().toISOString(),
      // The pass code is minted now and travels with the link — the recipient
      // can scan it in without ever creating an account.
      qrCode: `DIGIS-TRANSFER-${token.toUpperCase()}`,
      ticket: input.ticket,
    };
    transfers.set(token, transfer);
    persistTransfers();

    const hasAccount = recipientHasAccount(input.contactMethod, input.contactValue);
    const link = `/claim/${token}`;

    // The recipient always gets an in-app notification that deep-links straight
    // to the claim page. (In this single-account demo it lands in the current
    // user's bell so the flow is visible end to end.)
    notificationsStore.push({
      type: 'transfer',
      title: 'You received a ticket',
      body: `${transfer.fromName} sent you a ticket to ${input.ticket.eventName}. Tap to view it and get your QR code.`,
      link,
    });

    return { token, link: buildLink(token), recipientHasAccount: hasAccount };
  },

  getTransfer(token: string): TicketTransfer | undefined {
    return transfers.get(token);
  },

  /**
   * Claim a pending transfer. The ticket + QR belong to the recipient regardless
   * of whether they have an account — the pass code is returned either way. When
   * they're signed in we also drop a copy into their in-app wallet so it shows up
   * under My Tickets across sessions.
   */
  claimTransfer(token: string, addToWallet: boolean): { qrCode: string; ticket?: UserTicket } {
    const transfer = transfers.get(token);
    if (!transfer) throw new Error('This transfer link is invalid or has expired.');
    let ticket: UserTicket | undefined;
    if (addToWallet && transfer.status !== 'claimed') {
      ticket = ticketsService.addReceivedTicket({ ...transfer.ticket, qrCode: transfer.qrCode });
    }
    transfers.set(token, { ...transfer, status: 'claimed' });
    persistTransfers();
    return { qrCode: transfer.qrCode, ticket };
  },
};
