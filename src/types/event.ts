import type { ReactNode } from "react";
import type { CustomQuestion } from "./checkout";


export type EventProductType = "ticket" | "parking" | "merchandise" | "donation" | "food" | "digital_addon" | "other";

export interface EventProduct {
  id: string;
  type: EventProductType;
  name: string;
  description?: string;
  /** Integer cents (backend `*_minor`). */
  priceMinor: number;
  available?: number;
  maxPerOrder?: number;
  requiresTicket?: boolean;
}

export interface SelectedEventProduct {
  productId: string;
  type: EventProductType;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface TicketTierFeature {
  icon?: ReactNode;
  text: string;
}

export interface TicketTier {
  name: string;
  level: string;
  /** Integer cents (backend `*_minor`). */
  priceMinor: number;
  /** Integer cents, when a pre-discount face price exists. */
  originalPriceMinor?: number;
  available: number;
  isEarlyBird?: boolean;
  startedAt?: number;
  expiresAt?: number;
  totalCapacity?: number;
  isCouples?: boolean;
  seats?: number;
  isPremium?: boolean;
  isElite?: boolean;
  /** Ids of EventProducts bundled into this tier — pre-selected (and free) at checkout. */
  includedProductIds?: string[];
  features: TicketTierFeature[];
}

/* ─── Seat selection ─── */
export type SeatStatus = 'available' | 'sold';

export interface Seat {
  /** Unique within the map, e.g. "A12". */
  id: string;
  status: SeatStatus;
}

export interface SeatRow {
  /** Row label shown on the left, e.g. "A". */
  label: string;
  /** Seats left→right; `null` renders an aisle gap. */
  seats: (Seat | null)[];
}

export interface SeatSection {
  id: string;
  /** Physical area, e.g. "Front", "Balcony". */
  name: string;
  /** Optional link to a TicketTier by name to scope seats to that tier. */
  tierName?: string;
  rows: SeatRow[];
}

export interface SeatMapConfig {
  /** Label for the orientation bar, e.g. "STAGE" or "SCREEN". Defaults to "STAGE". */
  stageLabel?: string;
  sections: SeatSection[];
}

/** A seat the buyer has chosen, carried through checkout onto their ticket. */
export interface SelectedSeat {
  id: string;
  section: string;
  row: string;
  /** Numeric seat within its row, parsed for display. */
  seat: number;
}

export interface EventArtist {
  name: string;
  handle?: string;
  role?: string;
  time?: string;
  genre?: string;
  verified?: boolean;
  followers?: number;
  eventsPlayed?: number;
  rating?: number;
  bio?: string;
  image?: string;
  gradient?: string;
}

export interface EventOrganizer {
  name: string;
  handle?: string;
  verified?: boolean;
  followers?: number;
  eventsHosted?: number;
  rating?: number;
  bio?: string;
  image?: string;
  gradient?: string;
}

export interface RsvpRequirements {
  /** Name is collected by default for the guest list; set false only for anonymous RSVP events. */
  requireName?: boolean;
  requireEmail?: boolean;
  requirePhone?: boolean;
  /** Organizer-defined RSVP fields, using the same question model as checkout. */
  questions?: CustomQuestion[];
}

export interface Event {
  id: string;
  /** Backend URL slug (GET /public/events/:slug). Preferred over name-derived paths. */
  slug?: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  image: string;
  images?: string[];
  /** Short marketing blurb shown on the event detail page. */
  description?: string;
  /** Display name of the organizer/promoter. */
  organizer?: string;
  /** Aggregate event rating (0–5). */
  rating?: number;
  /** Explicitly mark an event as sold out regardless of ticketsLeft. */
  soldOut?: boolean;
  /** Tailwind gradient classes used for the event's artwork overlay. */
  gradient?: string;
  /** Starting price for international/foreign-currency buyers, in cents (backend `*_minor`). */
  priceForeignFromMinor?: number;
  category: string;
  /** Lowest starting price in integer cents (backend `*_minor`). */
  priceFromMinor: number;
  currency: "ETB";
  ticketsLeft: number;
  ticketTypes?: TicketTier[];
  /** Purchasable event extras such as parking, merchandise, food, or digital access. */
  products?: EventProduct[];
  /** When set, buyers pick assigned seats during checkout. */
  seatMap?: SeatMapConfig;
  /** Organizer-set answer edit window after purchase. Omit or set 0 to lock responses. */
  answerEditWindowHours?: number | null;
  featured?: boolean;
  eventType?: "ticketed" | "rsvp" | "inviteOnly";
  ageRestriction?: string;
  lineup?: EventArtist[];
  organizers?: EventOrganizer[];
  rsvpGoing?: number;
  rsvpCapacity?: number;
  allowsPlusOne?: boolean;
  maxGuests?: number;
  /** Registration fields the organizer requires before confirming an RSVP. */
  rsvpRequirements?: RsvpRequirements;
  // Invite Only
  accessMode?: "code" | "guestlist" | "both" | "request";
  accessCodes?: string[];
  onGuestList?: boolean;
  guestName?: string;
  inviteOnlyPaid?: boolean;
  inviteWaitlistOnly?: boolean;
  waitlistAhead?: number;
  inviteTickets?: {
    name: string;
    /** Integer cents (backend `*_minor`). */
    priceMinor: number;
    perks: string[];
    premium?: boolean;
  }[];
}
