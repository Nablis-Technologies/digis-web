import type { CheckoutAnswers, CustomQuestion } from './checkout';
import type { SelectedEventProduct } from './event';

export type RsvpStatus = 'going' | 'maybe' | 'declined' | null;

export type InviteUnlockState = {
  unlocked: boolean;
  method: 'code' | 'guestlist' | 'waitlist' | null;
  selectedTicket?: string;
};

export interface UserTicket {
  id: string;
  eventId?: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  ticketType: string;
  ticketLevel?: string;
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
}

export interface TicketActionResult {
  ok: boolean;
}

export interface ListForResaleResult extends TicketActionResult {
  listingId: string;
}
