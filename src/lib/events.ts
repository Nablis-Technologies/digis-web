/**
 * Events module — the single deep module mirroring the backend's public events
 * contract. Owns the HTTP calls (via apiFetch) AND the backend→domain mapping
 * (via the events-adapter, its internal seam). Components and the router call
 * this module; nobody reaches the backend for events any other way.
 *
 * Backend endpoints:
 *   - GET /public/events            → EventListSerializer (expanded, ADR-0004)
 *   - GET /public/events/:slug      → EventDetailSerializer (`public_show` action,
 *                                     full shape — BACKEND_GAPS.md #1b resolved)
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

async function fetchList(): Promise<Event[]> {
  const { data } = await apiFetch<BackendEvent[]>("public/events");
  return data.map(backendEventToEvent);
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
async function fetchAllEvents(): Promise<Event[]> {
  const [events, featured] = await Promise.all([
    fetchList(),
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
    detail: (id: string) => ["events", id] as const,
    featured: ["events", "featured"] as const,
  },

  /** Mirror GET /public/events. */
  async fetchAll(): Promise<Event[]> {
    return fetchAllEvents();
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
   * GET /public/featured_events — the paid Featured placements, for the
   * discovery carousel/filter. 503 (`featured_events_unavailable`) means
   * placement resolution failed, not "nothing is featured".
   */
  async fetchFeatured(): Promise<Event[]> {
    return fetchFeaturedEvents();
  },
};
