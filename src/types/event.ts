import type { ReactElement } from "react";
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
  icon?: ReactElement;
  text: string;
}

export interface TicketTier {
  /** Backend Catalog::EventProduct id when the tier came from the live
   *  products endpoint — this is what order_quotes consumes. Mock tiers omit it. */
  id?: string;
  /** Backend Ticketing::TicketType id (nested in the product payload) —
   *  consent_requirements + registration submit address this id. Mock tiers omit it. */
  ticketTypeId?: string;
  /** Backend audience gate for this tier (public | access_code | invitation |
   *  code_or_invitation). Present only for live products; `public` = no gate. */
  audience?: 'public' | 'access_code' | 'invitation' | 'code_or_invitation';
  /** Backend ticket-type date selection mode. `choose_one` tiers require a
   *  selected event date at registration (invalid_registration without it). */
  dateSelection?: 'fixed' | 'choose_one';
  /** `manual` offers are "apply / request to join" and must be submitted as a
   *  single-offer selection (the backend rejects mixing them). */
  approvalMode?: 'automatic' | 'manual';
  /** Sold-out offers with this flag can be joined via the offer-scoped waitlist. */
  waitlistEnabled?: boolean;
  /** Admissions granted per unit (≥1) — drives quantity/seat math. */
  admissionsPerUnit?: number;
  /** Order bounds from the product. */
  minPerOrder?: number;
  maxPerOrder?: number;
  name: string;
  level: string;
  /** Integer cents (backend `*_minor`). `0` = free admission. */
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
  /** Rank-based presentation accent (cheapest→emerald, priciest→gold).
   *  Absent for single-tier events and unknown callers — falls back to the
   *  semantic flags below. */
  accent?: 'emerald' | 'rose' | 'violet' | 'gold' | 'blue';
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
  /**
   * Small (200px) cover variant for grid cards. `image` stays the 800px
   * medium for hero/detail. Absent for mock events (they use `image`).
   */
  imageThumb?: string;
  images?: string[];
  /** Short marketing blurb shown on the event detail page. */
  description?: string;
  /** Display name of the organizer/promoter. */
  organizer?: string;
  /** Backend organization id — the followable for organizer follow/unfollow. */
  organizerId?: string;
  /** Backend organization slug. */
  organizerSlug?: string;
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
  /** Backend `config.tickets_left` — absent when the backend omits it. */
  ticketsLeft?: number;
  ticketTypes?: TicketTier[];
  /** Backend event dates with ids (choose_one ticket types need a selected
   *  event_date_id at registration). Display date/time derive from [0].
   *  `endsAt`/`status` drive the "event ended" purchase gate (eventEnded). */
  eventDates?: { id: string; startsAt: string; endsAt?: string; status?: string; name?: string }[];
  /** Purchasable event extras such as parking, merchandise, food, or digital access. */
  products?: EventProduct[];
  /** When set, buyers pick assigned seats during checkout. */
  seatMap?: SeatMapConfig;
  /** Organizer-set answer edit window after purchase. Omit or set 0 to lock responses. */
  answerEditWindowHours?: number | null;
  featured?: boolean;
  /** Organizer age policy. No public source yet — see BACKEND_GAPS #53. */
  ageRestriction?: string;
  /** Event lineup. No public source yet — see BACKEND_GAPS #36. */
  lineup?: EventArtist[];
  /**
   * Co-organizers, mapped from the backend `event_organizations` association.
   * Field name kept for the existing OrganizerSection consumers.
   */
  organizers?: EventOrganizer[];
}
