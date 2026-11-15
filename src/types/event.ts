import type { ReactElement } from "react";


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
  /** Event dates this ticket offer is valid for (backend `covered_event_date_ids`,
   *  #69). Empty means all event dates; absent means metadata was not served. */
  coveredEventDateIds?: string[];
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
  artistId?: string;
  handle?: string;
  /**
   * Backend `event_date_id` — pins a festival participant to one scheduled date
   * (#36 served 2026-10-17); absent means event-level (shown on every day).
   */
  eventDateId?: string;
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

export interface Event {
  id: string;
  /** Backend URL slug (GET /public/events/:slug). Preferred over name-derived paths. */
  slug?: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  venueId?: string;
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
  /**
   * Server-evaluated timing state (G-44). Drives the "Ended"/"Happening Now"
   * badge and gates the buy CTA. Absent when the backend omits it.
   */
  eventLifecycle?: "upcoming" | "ongoing" | "ended" | "unscheduled";
  /**
   * Server-evaluated sellability (G-44) — distinguishes sold-out / coming-soon
   * / sales-closed / gated offers. Absent when the backend omits it.
   */
  ticketAvailability?:
    | "available"
    | "coming_soon"
    | "sold_out"
    | "sales_closed"
    | "no_public_tickets"
    | "no_eligible_dates"
    | "unavailable";
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
  eventDates?: {
    id: string;
    startsAt: string;
    endsAt?: string;
    /** Doors-open time when the backend serves it (session rail "Doors …"). */
    doorsAt?: string;
    status?: string;
    name?: string;
    /** Recurring-series rule id (#68) — present on materialised session dates. */
    seriesId?: string;
  }[];
  /**
   * Recurring-series signal (#68). The backend models + materialises recurrence
   * (`Events::RecurrenceRule` + `MaterializeRecurrenceJob`) but the public
   * payload carries **no series signal yet** — so this stays absent, and the
   * recurring session UI (`lib/recurring.ts`) renders nothing (ADR-0002: never
   * invent). The shape here is provisional and isolated to the adapter
   * (`lib/events-adapter.ts`); when the backend fixes the wire location the
   * adapter is the only place that changes.
   */
  recurrence?: { ruleId?: string; rrule?: string; active?: boolean };
  /** Belt-and-braces series flag; `true` also marks an event as a series. */
  isRecurring?: boolean;
  /** Purchasable event extras such as parking, merchandise, food, or digital access. */
  products?: EventProduct[];
  /**
   * Path to the event's full paginated schedule (`GET /public/events/:slug/dates`,
   * #70). Present on the detail payload; the bounded `eventDates` preview is only
   * the first few sessions.
   */
  eventDatesUrl?: string;
  /** When set, buyers pick assigned seats during checkout. */
  seatMap?: SeatMapConfig;
  /** Organizer-set answer edit window after purchase. Omit or set 0 to lock responses. */
  answerEditWindowHours?: number | null;
  featured?: boolean;
  /** Organizer age policy, flattened for the Age card from the backend detail's
   *  validated `event_setting.config.age_restriction` (#53). Absent renders the
   *  card's own "Any Age" fallback. */
  ageRestriction?: string;
  /** Event lineup, mapped from the public detail's `event_participants` (#36). */
  lineup?: EventArtist[];
  /**
   * Co-organizers, mapped from the backend `event_organizations` association.
   * Field name kept for the existing OrganizerSection consumers.
   */
  organizers?: EventOrganizer[];
}
