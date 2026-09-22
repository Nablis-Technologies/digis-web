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
 *   event_setting.config:  PUBLIC_CONFIG_KEYS projection (BACKEND_GAPS #1,
 *                          resolved + live since the 2026-09-10 serializer commit):
 *                          allow_waitlist, public_guest_limit, featured, rating,
 *                          sold_out, tickets_left, price_foreign_from_minor,
 *                          foreign_currency, event_type, seat_map,
 *                          answer_edit_window_hours, rsvp_going, rsvp_capacity,
 *                          allows_plus_one, max_guests, rsvp_requirements,
 *                          access_mode, invite_only_paid, on_guest_list,
 *                          age_restriction.
 *                          `access_codes`/`guest_name`/`invite_tickets`
 *                          stay private by design.
 *   All 17 config keys are mapped below; `foreign_currency` is intentionally
 *   dropped (currency is ETB-only).
 *
 * Mock policy: the backend is the only source of truth. No mock event record
 * is merged in — absent backend data renders as absent.
 */

import type { Event, RsvpRequirements, SeatMapConfig } from "@/types";
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

export interface BackendEvent {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  visibility?: string;
  currency?: string;
  price_from_minor?: number | null;
  categories?: { id: string; name: string }[];
  event_dates?: BackendEventDate[];
  event_media?: BackendMedia[];
  event_setting?: {
    id?: string;
    config?: Record<string, unknown>;
  };
  organization?: { id: string; name: string; slug?: string } | null;
}

/**
 * Map a backend event (list or detail) onto the frontend `Event` type.
 * Backend fields are the live truth; absent backend data renders as absent.
 *
 * Config parsing is strict by design: a wrong-typed or unknown value maps to
 * absent, never through. A missing value must NOT read as a real one (a
 * missing `tickets_left` is not sold out; a missing price is not free).
 * `priceFromMinor` defaults to 0 only as a last resort when the wire omits
 * `price_from_minor` entirely.
 */
const asNumber = (v: unknown): number | undefined =>
  typeof v === "number" ? v : undefined;
const asBoolean = (v: unknown): boolean | undefined =>
  typeof v === "boolean" ? v : undefined;
const asEnum = <T extends string>(
  v: unknown,
  allowed: readonly T[],
): T | undefined =>
  typeof v === "string" && (allowed as readonly string[]).includes(v)
    ? (v as T)
    : undefined;
const asObject = (v: unknown): Record<string, unknown> | undefined =>
  typeof v === "object" && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined;

function toSeatMap(v: unknown): SeatMapConfig | undefined {
  const o = asObject(v);
  if (!o || !Array.isArray(o.sections)) return undefined;
  // The seed writes snake_case `stage_label`; the domain reads `stageLabel`.
  const { stage_label: _dropped, ...rest } = o as Record<string, unknown> & {
    stage_label?: unknown;
  };
  void _dropped;
  return {
    ...(rest as unknown as SeatMapConfig),
    ...(typeof o.stage_label === "string" ? { stageLabel: o.stage_label } : {}),
  };
}

function toRsvpRequirements(v: unknown): RsvpRequirements | undefined {
  const o = asObject(v);
  if (!o) return undefined;
  return o as unknown as RsvpRequirements;
}

export function backendEventToEvent(be: BackendEvent): Event {
  const config = be.event_setting?.config ?? {};

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
    // Served via the public config projection (BACKEND_GAPS #1, resolved).
    // `foreign_currency` has no domain field (currency is ETB-only) and is
    // intentionally unmapped; everything else the projection serves is read.
    ...(typeof config.tickets_left === "number" ? { ticketsLeft: config.tickets_left } : {}),
    featured: asBoolean(config.featured),
    rating: asNumber(config.rating),
    soldOut: asBoolean(config.sold_out),
    priceForeignFromMinor: asNumber(config.price_foreign_from_minor),
    eventType: asEnum(config.event_type, ["ticketed", "rsvp", "inviteOnly"] as const),
    seatMap: toSeatMap(config.seat_map),
    answerEditWindowHours:
      asNumber(config.answer_edit_window_hours) ??
      (config.answer_edit_window_hours === null ? null : undefined),
    rsvpGoing: asNumber(config.rsvp_going),
    rsvpCapacity: asNumber(config.rsvp_capacity),
    allowsPlusOne: asBoolean(config.allows_plus_one),
    maxGuests: asNumber(config.max_guests),
    rsvpRequirements: toRsvpRequirements(config.rsvp_requirements),
    accessMode: asEnum(config.access_mode, ["code", "guestlist", "both", "request"] as const),
    inviteOnlyPaid: asBoolean(config.invite_only_paid),
    onGuestList: asBoolean(config.on_guest_list),
    ageRestriction: typeof config.age_restriction === "string" ? config.age_restriction : undefined,
    lineup: Array.isArray(config.lineup) ? config.lineup : undefined,
    organizers: Array.isArray(config.organizers) ? config.organizers : undefined,
    inviteWaitlistOnly: asBoolean(config.invite_waitlist_only),
    waitlistAhead: asNumber(config.waitlist_ahead),
  };
}
