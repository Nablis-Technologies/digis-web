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
 * Mock policy: the backend is the only source of truth. No mock event record
 * is merged in by title — when the backend does not serve a field (config
 * flags, rich seat maps), it renders as absent until the serializer expands.
 */

import type { Event } from "@/types";
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

/**
 * Map a backend event (list or detail) onto the frontend `Event` type.
 * Backend fields are the live truth; absent backend data renders as absent.
 */
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
    venue: date0?.venue?.name ?? "",
    city: date0?.venue?.city ?? "",
    organizer: be.organization?.name,
    image,
    ...(imageThumb ? { imageThumb } : {}),
    images: gallery,
    description: be.description,
    category: be.categories?.[0]?.name ?? "",
    priceFromMinor: typeof be.price_from_minor === "number" ? be.price_from_minor : 0,
    currency: (be.currency as Event["currency"]) ?? "ETB",
    // Absent until the public serializer exposes it (BACKEND_GAPS #1) — a
    // missing value must NOT read as sold out.
    ...(typeof config.tickets_left === "number" ? { ticketsLeft: config.tickets_left } : {}),
    featured: config.featured as boolean | undefined,
  };
}
