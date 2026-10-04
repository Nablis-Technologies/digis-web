/**
 * Events adapter — the single seam between the backend's wire shape and the
 * frontend `Event` domain type. Consolidates the mapping that used to live
 * inline in events.service.ts and reuses the shared mappers.
 *
 * Backend wire shapes (from the Rails serializers — both list and detail attach
 * the same EventSettingSerializer; detail adds only `created_at`):
 *   EventListSerializer:   id, slug, title, description, visibility, timezone,
 *                          currency, published_at, categories, event_dates,
 *                          event_media, event_organizations, event_setting, organization,
 *                          price_from_minor (computed over active ticket products
 *                          only — BACKEND_GAPS #13/#32 resolved).
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
  starts_at: string;
  ends_at?: string;
  /** scheduled | postponed | cancelled | completed */
  status?: string;
  venue?: { id: string; name: string; city?: string } | null;
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
  categories?: { id: string; name: string }[];
  event_dates?: BackendEventDate[];
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
    followers?: number;
    eventsPlayed?: number;
    rating?: number;
    bio?: string;
    image?: string;
  }[];
  organization?: { id: string; name: string; slug?: string } | null;
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
  const date0 = be.event_dates?.[0];
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

  return {
    id: be.id,
    slug: be.slug,
    name: be.title,
    date: startsAt ? isoToDisplayDate(startsAt) : "",
    time: startsAt ? isoToDisplayTime(startsAt) : "",
    ...(be.event_dates && be.event_dates.length > 0
      ? {
          eventDates: be.event_dates.map((d) => ({
            id: d.id,
            startsAt: d.starts_at,
            ...(d.ends_at ? { endsAt: d.ends_at } : {}),
            ...(d.status ? { status: d.status } : {}),
            ...(d.name ? { name: d.name } : {}),
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
    // Co-organizers come from the live `event_organizations` association. The
    // event_setting.config projection no longer carries `organizers` (#53).
    ...(organizers.length > 0 ? { organizers } : {}),
  };
  // NOTE: `age_restriction` and `seat_map` have no public source after the
  // 2026-09-30 backend release and render absent (ADR-0002) — see #53.
  // Per-offer admission (price, availability, audience, approval, waitlist)
  // comes from `GET /public/events/:slug/products`.
}
