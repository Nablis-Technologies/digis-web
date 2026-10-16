/**
 * Events adapter — the single seam between the backend's wire shape and the
 * frontend `Event` domain type. Consolidates the mapping that used to live
 * inline in events.service.ts and reuses the shared mappers.
 *
 * Backend wire shapes (from the Rails serializers — both list and detail attach
 * the same EventSettingSerializer; detail adds only `created_at`):
 *   EventListSerializer:   id, slug, title, description, visibility, timezone,
 *                          currency, published_at, price_from_minor, price_from_currency,
 *                          event_lifecycle, ticket_availability, next_event_date,
 *                          is_recurring, categories, event_media, event_organizations,
 *                          event_setting, organization (price_from_minor is computed over
 *                          active ticket products only — BACKEND_GAPS #13/#32 resolved).
 *   EventDetailSerializer: id, slug, title, description, visibility, timezone,
 *                          currency, published_at, created_at, is_recurring,
 *                          event_dates_preview (≤7 upcoming), event_dates_url, categories, ...
 *
 * Date shape (2026-10-16 backend release — BACKEND_GAPS #70 resolved): the list no
 * longer ships `event_dates`; it ships a single `next_event_date` (the soonest
 * upcoming session) and the detail ships a bounded `event_dates_preview` plus
 * `event_dates_url` for the full schedule. A legacy `event_dates` array is kept
 * as a fallback for any payload that still serves it.
 *   event_setting.config:  after the 2026-09-30 composable-admission release the
 *                          PUBLIC_CONFIG_KEYS projection carries only
 *                          `public_guest_limit` (BACKEND_GAPS #53/#44). The
 *                          event-level mode/rsvp/access keys are gone AND were
 *                          never read by the backend, so this adapter maps none
 *                          of them. Admission is sourced per-offer from
 *                          `GET /public/events/:slug/products` (`products.ts`).
 *
 * Mock policy: the backend is the only source of truth. No mock event record
 * is merged in — absent backend data renders as absent.
 */

import type { Event, EventArtist, EventOrganizer } from "@/types";
import { isoToDisplayDate, isoToDisplayTime } from "@/lib/mappers";

/* ─── Backend wire types ─── */

export interface BackendMedia {
  id: string;
  type?: string;
  file?: { url?: string; thumbnail?: string; medium?: string };
}

export interface BackendEventDate {
  id: string;
  name?: string | null;
  doors_at?: string | null;
  starts_at: string;
  ends_at?: string;
  /** scheduled | postponed | cancelled | completed */
  status?: string;
  venue?: { id: string; name: string; city?: string } | null;
  /**
   * Recurring-series rule id (#68) — the backend derives it from the date's
   * `source_key` (`recurrence-<rule uuid>-<n>`). Present on every materialised
   * session date; null for a one-off date.
   */
  series_id?: string | null;
}

/** G-44 lifecycle + sellability states — served on every list card. */
export type EventLifecycle = "upcoming" | "ongoing" | "ended" | "unscheduled";
export type TicketAvailability =
  | "available"
  | "coming_soon"
  | "sold_out"
  | "sales_closed"
  | "no_public_tickets"
  | "no_eligible_dates"
  | "unavailable";

export interface BackendEvent {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  visibility?: string;
  currency?: string;
  price_from_minor?: number | null;
  event_lifecycle?: EventLifecycle;
  ticket_availability?: TicketAvailability;
  /**
   * Paid Featured placement label. Emitted **only** by the Featured serializer
   * (`GET /public/featured_events`, and `GET /public/events?featured=true`); the
   * plain list payload does not carry it, so a list-only read leaves `featured`
   * absent — never inferred from `event_setting.config` (#53).
   */
  placement_label?: string;
  categories?: { id: string; name: string }[];
  /** Legacy full date array — no longer sent by the 2026-10-16 serializers. */
  event_dates?: BackendEventDate[];
  /** List serializer: the soonest upcoming session (#70). */
  next_event_date?: BackendEventDate | null;
  /** Detail serializer: bounded (≤7) upcoming sessions (#70). */
  event_dates_preview?: BackendEventDate[];
  /** Detail serializer: path to the full paginated schedule
   *  (`GET /public/events/:slug/dates`) (#70). */
  event_dates_url?: string;
  event_media?: BackendMedia[];
  event_setting?: {
    id?: string;
    config?: Record<string, unknown>;
  };
  /** Co-organizers — { id, type, role, status, organization: { id, name, slug } }. */
  event_organizations?: {
    role?: string;
    organization?: { id: string; name: string; slug?: string } | null;
  }[];
  /** Lineup — public EventParticipantSerializer (artist profile per entry). */
  event_participants?: {
    id?: string;
    name?: string;
    handle?: string;
    role?: string;
    time?: string;
    genre?: string;
    verified?: boolean;
    /** FK pinning the participant to one event date (#36) — not yet public. */
    event_date_id?: string;
    followers?: number;
    eventsPlayed?: number;
    rating?: number;
    bio?: string;
    image?: string;
  }[];
  organization?: { id: string; name: string; slug?: string } | null;
  /**
   * Recurring-series signal (#68). The backend models + materialises recurrence
   * (`Events::RecurrenceRule` + `MaterializeRecurrenceJob`) but the public
   * payload carries **no series signal yet**, so this maps nothing today. The
   * read is provisional and isolated here — when the backend fixes the wire
   * location, only this adapter changes and the session UI lights up.
   */
  recurrence?: { rule_id?: string; rrule?: string; active?: boolean };
  is_recurring?: boolean;
}

/**
 * Map a backend event (list or detail) onto the frontend `Event` type.
 *
 * Backend fields are the live truth; absent backend data renders as absent
 * (ADR-0002). After the 2026-09-30 composable-admission release the public
 * `event_setting.config` projection carries only `public_guest_limit`, so the
 * event-level mode/rsvp/access keys are gone; admission is per-offer via
 * `GET /public/events/:slug/products` (see `products.ts`). `priceFromMinor`
 * defaults to 0 only when the wire omits `price_from_minor` entirely.
 */
export function backendEventToEvent(be: BackendEvent): Event {
  // Resolve the session dates from whichever field the payload serves: the
  // detail's bounded preview, the list's single next session, or the legacy
  // array (ADR-0002 — absent stays absent; nothing is invented).
  const beDates: BackendEventDate[] =
    be.event_dates_preview ??
    (be.next_event_date ? [be.next_event_date] : be.event_dates) ??
    [];
  const date0 = beDates[0];
  const startsAt = date0?.starts_at;
  const cover =
    (be.event_media ?? []).find((m) => m.type === "cover") ??
    be.event_media?.[0];
  // Active Storage serves pre-sized variants (medium 800px, thumbnail 200px),
  // not `url`. Grid cards render ~343px wide through a per-image Rails
  // redirect (~600ms measured), so they take the 200px thumbnail; hero and
  // detail views take the 800px medium.
  const imageUrl = (m?: BackendMedia) =>
    m?.file?.medium ?? m?.file?.thumbnail ?? m?.file?.url;
  const thumbUrl = (m?: BackendMedia) =>
    m?.file?.thumbnail ?? m?.file?.medium ?? m?.file?.url;
  const image = imageUrl(cover) ?? "";
  const imageThumb = thumbUrl(cover);
  const gallery = (be.event_media ?? [])
    .map(imageUrl)
    .filter((u): u is string => Boolean(u));

  // Co-organizers from the live association (summary = { id, name, slug }).
  const organizers: EventOrganizer[] = (be.event_organizations ?? [])
    .map((entry) => entry.organization)
    .filter((org): org is NonNullable<typeof org> => Boolean(org))
    .map((org) => ({ id: org.id, name: org.name }));

  // Lineup from the public `event_participants` association. The backend does
  // not expose it yet (BACKEND_GAPS #36), so this maps nothing until it does —
  // the section then renders; absent stays absent (ADR-0002).
  const lineup: EventArtist[] = (be.event_participants ?? []).map((p) => ({
    name: p.name ?? "",
    ...(p.event_date_id ? { eventDateId: p.event_date_id } : {}),
    ...(p.handle ? { handle: p.handle } : {}),
    ...(p.role ? { role: p.role } : {}),
    ...(p.time ? { time: p.time } : {}),
    ...(p.genre ? { genre: p.genre } : {}),
    ...(typeof p.verified === "boolean" ? { verified: p.verified } : {}),
    ...(typeof p.followers === "number" ? { followers: p.followers } : {}),
    ...(typeof p.eventsPlayed === "number" ? { eventsPlayed: p.eventsPlayed } : {}),
    ...(typeof p.rating === "number" ? { rating: p.rating } : {}),
    ...(p.bio ? { bio: p.bio } : {}),
    ...(p.image ? { image: p.image } : {}),
  }));

  return {
    id: be.id,
    slug: be.slug,
    name: be.title,
    date: startsAt ? isoToDisplayDate(startsAt) : "",
    time: startsAt ? isoToDisplayTime(startsAt) : "",
    ...(beDates.length > 0
      ? {
          eventDates: beDates.map((d) => ({
            id: d.id,
            startsAt: d.starts_at,
            ...(d.ends_at ? { endsAt: d.ends_at } : {}),
            ...(d.doors_at ? { doorsAt: d.doors_at } : {}),
            ...(d.status ? { status: d.status } : {}),
            ...(d.name ? { name: d.name } : {}),
            ...(d.series_id ? { seriesId: d.series_id } : {}),
          })),
        }
      : {}),
    venue: date0?.venue?.name ?? "",
    city: date0?.venue?.city ?? "",
    organizer: be.organization?.name,
    organizerId: be.organization?.id,
    organizerSlug: be.organization?.slug,
    image,
    ...(imageThumb ? { imageThumb } : {}),
    images: gallery,
    description: be.description,
    category: be.categories?.[0]?.name ?? "",
    priceFromMinor: typeof be.price_from_minor === "number" ? be.price_from_minor : 0,
    currency: (be.currency as Event["currency"]) ?? "ETB",
    // G-44: server-evaluated lifecycle + availability. Absent renders as
    // absent (ADR-0002) — never inferred client-side.
    ...(be.event_lifecycle ? { eventLifecycle: be.event_lifecycle } : {}),
    ...(be.ticket_availability ? { ticketAvailability: be.ticket_availability } : {}),
    // Featured — a paid, rotating placement (its own public endpoint), not the
    // removed `event_setting.config.featured` key (#53). The label is the
    // backend's own statement; anything else stays absent.
    ...(be.placement_label === "featured" ? { featured: true } : {}),
    // Co-organizers come from the live `event_organizations` association. The
    // event_setting.config projection no longer carries `organizers` (#53).
    ...(organizers.length > 0 ? { organizers } : {}),
    // Lineup — only when the backend serves participants (#36).
    ...(lineup.length > 0 ? { lineup } : {}),
    // Recurring-series signal (#68) — absent today; maps when the backend serves
    // it so `lib/recurring.ts` mounts the session UI with no further change.
    ...(be.recurrence
      ? {
          recurrence: {
            ...(be.recurrence.rule_id ? { ruleId: be.recurrence.rule_id } : {}),
            ...(be.recurrence.rrule ? { rrule: be.recurrence.rrule } : {}),
            ...(typeof be.recurrence.active === "boolean" ? { active: be.recurrence.active } : {}),
          },
        }
      : {}),
    ...(typeof be.is_recurring === "boolean" ? { isRecurring: be.is_recurring } : {}),
    ...(be.event_dates_url ? { eventDatesUrl: be.event_dates_url } : {}),
  };
  // NOTE: `age_restriction` and `seat_map` have no public source after the
  // 2026-09-30 backend release and render absent (ADR-0002) — see #53.
  // Per-offer admission (price, availability, audience, approval, waitlist)
  // comes from `GET /public/events/:slug/products`.
}
