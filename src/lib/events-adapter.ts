/**
 * Events adapter — the single seam between the backend's wire shape and the
 * frontend `Event` domain type. Consolidates the mapping that used to live
 * inline in events.service.ts and reuses the shared mappers.
 *
 * Backend wire shapes (from the Rails serializers):
 *   EventListSerializer:   id, slug, title, description, visibility, timezone,
 *                          currency, published_at, price_from_minor,
 *                          categories, event_dates, event_media
 *   EventDetailSerializer: adds event_setting.config (JSONB: featured, rating,
 *                          tickets_left, seat_map, access_codes, rsvp_*, ...)
 *
 * Display gaps (backend does not return them yet — BACKEND_GAPS.md):
 *   venue {name,city}, organizer name, products. These fall back to the mock,
 *   correlated by exact title, until the backend nests them.
 */

import type { Event } from "@/types";
import { EVENTS } from "@/lib/mock/events";
import { isoToDisplayDate, isoToDisplayTime } from "@/lib/mappers";

/* ─── Backend wire types ─── */

export interface BackendMedia {
  id: string;
  type?: string;
  file?: { url?: string; thumbnail?: string; medium?: string };
}

export interface BackendEventDate {
  id: string;
  starts_at: string;
  ends_at?: string;
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

/** Correlate a backend event to its mock counterpart by exact title. */
export function findMockEvent(title: string): Event | undefined {
  return EVENTS.find((e) => e.name === title);
}

/**
 * Map a backend event (list or detail) onto the frontend `Event` type.
 * Backend fields are the live truth; mock fills only what the backend does
 * not serve yet (config-driven flags, rich products/seat maps, foreign price).
 */
export function backendEventToEvent(be: BackendEvent): Event {
  const mock = findMockEvent(be.title);
  const config = be.event_setting?.config ?? {};

  const date0 = be.event_dates?.[0];
  const startsAt = date0?.starts_at;
  const cover =
    (be.event_media ?? []).find((m) => m.type === "cover") ??
    be.event_media?.[0];
  // Active Storage serves pre-sized variants (medium 800px, thumbnail 200px),
  // not `url` — prefer the card-sized variant.
  const imageUrl = (m?: BackendMedia) =>
    m?.file?.medium ?? m?.file?.thumbnail ?? m?.file?.url;
  const image = imageUrl(cover) ?? mock?.image ?? "";
  const gallery = (be.event_media ?? [])
    .map(imageUrl)
    .filter((u): u is string => Boolean(u));

  const live: Event = {
    id: be.id,
    slug: be.slug,
    name: be.title,
    date: startsAt ? isoToDisplayDate(startsAt) : (mock?.date ?? ""),
    time: startsAt ? isoToDisplayTime(startsAt) : (mock?.time ?? ""),
    // Venue/organizer now arrive nested on the payload — mock only when absent.
    venue: date0?.venue?.name ?? mock?.venue ?? "",
    city: date0?.venue?.city ?? mock?.city ?? "",
    organizer: be.organization?.name ?? mock?.organizer,
    image,
    images: gallery.length ? gallery : mock?.images,
    description: be.description ?? mock?.description,
    category: be.categories?.[0]?.name ?? mock?.category ?? "",
    priceFromMinor:
      typeof be.price_from_minor === "number"
        ? be.price_from_minor
        : (mock?.priceFromMinor ?? 0),
    currency: (be.currency as Event["currency"]) ?? mock?.currency ?? "ETB",
    ticketsLeft: (config.tickets_left as number) ?? mock?.ticketsLeft ?? 0,
    featured: (config.featured as boolean) ?? mock?.featured,
  };

  // Carry over the rich mock-only fields (products, seat maps, RSVP,
  // invite-only, etc.) so the detail view renders fully.
  if (mock) {
    return { ...mock, ...live };
  }
  return live;
}
