/**
 * Events module — the single deep module mirroring the backend's public events
 * contract. Owns the HTTP calls (via apiFetch) AND the backend→domain mapping
 * (via the events-adapter, its internal seam). Components and the router call
 * this module; nobody reaches the backend for events any other way.
 *
 * Backend endpoints:
 *   - GET /public/events            → EventListSerializer (expanded, ADR-0004)
 *                                     supports search/filter/sort (#49):
 *                                     q, category, city, date_from, date_to,
 *                                     organization_id, venue_id, artist_id,
 *                                     sort, currency, min_price_minor,
 *                                     max_price_minor.
 *   - GET /public/events/:slug      → EventDetailSerializer (`public_show` action,
 *                                     full shape — BACKEND_GAPS.md #1b resolved)
 *   - GET /public/events/:slug/dates→ EventDateSerializer schedule (#70)
 *   - GET /public/featured_events   → Marketing::FeaturedEventSerializer (paid
 *                                     Featured placements; 503 when resolution
 *                                     fails)
 *
 * No mock fallback: absent backend data renders as absent (the adapter does
 * not merge mock records).
 */

import { apiFetch } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { backendEventToEvent, type BackendEvent } from "@/lib/events-adapter";
import type { Event } from "@/types";

/** Server-side sort values (BACKEND_GAPS #49). `price_*` require a `currency`. */
export type EventListSort = "newest" | "soonest" | "price_asc" | "price_desc";

/**
 * Public discovery query (BACKEND_GAPS #49). Every field is optional; an empty
 * query is the plain unfiltered list. Names are camelCase here and mapped to the
 * backend's snake_case params in `toQueryString`.
 */
export interface PublicEventQuery {
  featured?: boolean;
  /** Free-text search — the backend requires ≥2 chars (422 below that). */
  q?: string;
  /** Category **slug** (the backend filters by slug, not name). */
  category?: string;
  city?: string;
  /** ISO 8601 timestamps. */
  dateFrom?: string;
  dateTo?: string;
  organizationId?: string;
  venueId?: string;
  artistId?: string;
  sort?: EventListSort;
  /** Required by the backend when `sort` is a price sort. */
  currency?: string;
  minPriceMinor?: number;
  maxPriceMinor?: number;
  /** Page size (the backend caps this at 100). */
  perPage?: number;
  page?: number;
}

/** Map the domain query onto the backend's snake_case query parameters. */
function toQueryString(query: PublicEventQuery): string {
  const p = new URLSearchParams();
  const set = (key: string, value: string | number | undefined) => {
    if (value === undefined || value === null || value === "") return;
    p.set(key, String(value));
  };
  set("q", query.q);
  set("featured", query.featured ? "true" : undefined);
  set("category", query.category);
  set("city", query.city);
  set("date_from", query.dateFrom);
  set("date_to", query.dateTo);
  set("organization_id", query.organizationId);
  set("venue_id", query.venueId);
  set("artist_id", query.artistId);
  set("sort", query.sort);
  set("currency", query.currency);
  set("min_price_minor", query.minPriceMinor);
  set("max_price_minor", query.maxPriceMinor);
  set("per_page", query.perPage);
  set("page", query.page);
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** The backend caps `per_page` at 100 — ask for the cap so a single page usually
 *  carries the whole (dev-scale) list. */
const MAX_PER_PAGE = 100;
/** Safety valve: never page past this many requests, even if the server lies. */
const MAX_PAGES = 50;

/**
 * GET /public/events, paged to completion.
 *
 * The list is paginated (default 25/page); discovery filters/sorts client-side
 * over the full set, so the module drains every page rather than silently
 * showing only page 1.
 */
async function fetchList(query: PublicEventQuery = {}): Promise<Event[]> {
  const all: BackendEvent[] = [];
  let page = query.page ?? 1;
  for (let i = 0; i < MAX_PAGES; i++) {
    const { data, pagination } = await apiFetch<BackendEvent[]>(
      `public/events${toQueryString({ ...query, page, perPage: query.perPage ?? MAX_PER_PAGE })}`,
    );
    all.push(...(data ?? []));
    if (!pagination || page >= pagination.total_pages) break;
    page += 1;
  }
  return all.map(backendEventToEvent);
}

/**
 * GET /public/featured_events — the paid public Featured placements.
 *
 * Featured is a paid, time-bounded, rotating entitlement
 * (`Marketing::FeaturedPlacements::PublicQuery`), so it is a distinct backend
 * read rather than a field on the list payload. The endpoint answers 503
 * `featured_events_unavailable` when placement resolution fails; a caller that
 * treats it as enrichment must tolerate that.
 */
async function fetchFeaturedEvents(): Promise<Event[]> {
  const { data } = await apiFetch<BackendEvent[]>("public/featured_events");
  return data.map(backendEventToEvent);
}

/**
 * The list, with the Featured entitlement applied.
 *
 * The list serializer carries no `featured` flag (#53) — Featured lives on its
 * own endpoint — so both are read concurrently and the intersection is marked
 * by slug. That one real signal then drives the discovery carousel and the
 * featured-first ordering.
 *
 * The Featured read is **optional enrichment**: when placement resolution fails
 * (503) the grid still renders, just without a featured row. Nothing renders a
 * false "no featured events" state — the row is simply absent.
 */
async function fetchAllEvents(query: PublicEventQuery = {}): Promise<Event[]> {
  const [events, featured] = await Promise.all([
    fetchList(query),
    fetchFeaturedEvents().catch(() => [] as Event[]),
  ]);
  if (featured.length === 0) return events;

  const featuredSlugs = new Set(featured.map((e) => e.slug));
  return events.map((e) =>
    featuredSlugs.has(e.slug) ? { ...e, featured: true } : e,
  );
}

export const eventsModule = {
  /** Stable query keys — import these wherever you call useQuery. */
  keys: {
    all: ["events"] as const,
    /** Keyed list read — include the query so filters cache independently. */
    list: (query: PublicEventQuery = {}) => ["events", "list", query] as const,
    detail: (id: string) => ["events", id] as const,
    dates: (slug: string) => ["events", slug, "dates"] as const,
    featured: ["events", "featured"] as const,
  },

  /**
   * Mirror GET /public/events (optionally filtered/sorted — #49). Drains every
   * page and applies the Featured entitlement, so the returned set is the whole
   * public catalogue for the given query.
   */
  async fetchAll(query: PublicEventQuery = {}): Promise<Event[]> {
    return fetchAllEvents(query);
  },

  /**
   * Mirror GET /public/events/:slug.
   *
   * `null` means the event genuinely does not exist (404) — callers treat that
   * as absence. Any other failure (network, 5xx) is thrown so the caller can
   * show an error state instead of silently claiming the event is missing.
   */
  async fetchById(idOrSlug: string): Promise<Event | null> {
    try {
      const { data: be } = await apiFetch<BackendEvent>(
        `public/events/${idOrSlug}`,
      );
      return be ? backendEventToEvent(be) : null;
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },

  /**
   * GET /public/events/:slug/dates — the full paginated schedule (#70). The
   * detail payload only carries a bounded preview; this drains every page of the
   * venue-scoped session list. Returns `[]` when the schedule is empty.
   */
  async fetchDates(
    slug: string,
    params: { from?: string; to?: string; perPage?: number } = {},
  ): Promise<Event["eventDates"]> {
    const p = new URLSearchParams();
    if (params.from) p.set("from", params.from);
    if (params.to) p.set("to", params.to);
    const perPage = params.perPage ?? MAX_PER_PAGE;
    const all: NonNullable<Event["eventDates"]> = [];
    let page = 1;
    for (let i = 0; i < MAX_PAGES; i++) {
      const qs = new URLSearchParams(p);
      qs.set("page", String(page));
      qs.set("per_page", String(perPage));
      const { data, pagination } = await apiFetch<BackendEventDateWire[]>(
        `public/events/${slug}/dates?${qs.toString()}`,
      );
      for (const d of data ?? []) {
        all.push({
          id: d.id,
          startsAt: d.starts_at,
          ...(d.ends_at ? { endsAt: d.ends_at } : {}),
          ...(d.doors_at ? { doorsAt: d.doors_at } : {}),
          ...(d.status ? { status: d.status } : {}),
          ...(d.name ? { name: d.name } : {}),
          ...(d.series_id ? { seriesId: d.series_id } : {}),
        });
      }
      if (!pagination || page >= pagination.total_pages) break;
      page += 1;
    }
    return all;
  },

  /**
   * GET /public/featured_events — the paid Featured placements, for the
   * discovery carousel/filter. 503 (`featured_events_unavailable`) means
   * placement resolution failed, not "nothing is featured".
   */
  async fetchFeatured(): Promise<Event[]> {
    return fetchFeaturedEvents();
  },
};

/** The schedule endpoint reuses the date serializer shape. */
interface BackendEventDateWire {
  id: string;
  name?: string | null;
  doors_at?: string | null;
  starts_at: string;
  ends_at?: string;
  status?: string;
  venue?: { id: string; name: string; city?: string } | null;
  series_id?: string | null;
}
