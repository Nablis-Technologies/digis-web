import type { CheckoutAnswers, CustomQuestion } from './checkout';
import type { SelectedEventProduct } from './event';

export interface UserTicket {
  id: string;
  eventId?: string;
  /** Backend event slug — lets the ticket's event products (extras) be fetched. */
  eventSlug?: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  /** Raw ISO event start (from the wallet wire) — used for resale-cutoff math. */
  eventStartsAt?: string;
  venue: string;
  ticketType: string;
  ticketLevel?: string;
  /** Backend ticket status (active, transferred, ...). Absent on legacy mocks. */
  status?: string;
  /** Guest payment-refresh projection only — registration + signed view link. */
  registrationId?: string;
  ticketViewToken?: string;
  ticketViewUrl?: string;
  shortUrl?: string;
  qrCode: string;
  gradient?: string;
  purchased: string;
  image?: string;
  /** Attendee responses are stored per ticket so organizers receive the correct details. */
  customQuestions?: CustomQuestion[];
  answers?: CheckoutAnswers;
  /** ISO timestamp; omitted when the organizer does not allow answer edits. */
  answersEditableUntil?: string;
  /** Extras purchased with (or added after) this ticket — parking, merch, food, etc. */
  addOns?: SelectedEventProduct[];
  /** Assigned seat label (e.g. "Balcony · A12") for seat-map events. */
  seat?: string;
  /** Resale policy for this ticket's tier, projected on the wallet (BACKEND_GAPS #25). */
  resalePolicy?: {
    enabled: boolean;
    capType: 'none' | 'percentage' | 'fixed' | null;
    /** Server-computed maximum asking price in minor units (#42 resolved
     *  2026-09-30) — resolves a percentage cap to an amount. Null until served. */
    priceCapMinor: number | null;
    fixedCapMinor: number | null;
    fixedCapCurrency: string | null;
    percentageCapBps: number | null;
    cutoffSecondsBeforeStart: number;
    maxCompletedResales: number;
  };
}

export interface TicketActionResult {
  ok: boolean;
}

export interface ListForResaleResult extends TicketActionResult {
  listingId: string;
}
