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

import type { Event, EventOrganizer } from "@/types";
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
  /** Co-organizers — { id, type, role, status, organization: { id, name, slug } }. */
  event_organizations?: {
    role?: string;
    organization?: { id: string; name: string; slug?: string } | null;
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
    // Co-organizers come from the live `event_organizations` association. The
    // event_setting.config projection no longer carries `organizers` (#53).
    ...(organizers.length > 0 ? { organizers } : {}),
  };
  // NOTE: `age_restriction`, `lineup`, and `seat_map` have no public source
  // after the 2026-09-30 backend release and render absent (ADR-0002) — see
  // BACKEND_GAPS #53 / #36. Per-offer admission (price, availability, audience,
  // approval, waitlist) comes from `GET /public/events/:slug/products`.
}
