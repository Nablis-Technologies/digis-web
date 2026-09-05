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
 *
 * No mock fallback: absent backend data renders as absent (the adapter does
 * not merge mock records).
 */

import { apiFetch } from "@/lib/api";
import { backendEventToEvent, type BackendEvent } from "@/lib/events-adapter";
import type { Event } from "@/types";

async function fetchAllEvents(): Promise<Event[]> {
  const { data } = await apiFetch<BackendEvent[]>("public/events");
  return data.map(backendEventToEvent);
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

  /** Mirror GET /public/events/:slug. Returns null when the backend can't serve it. */
  async fetchById(idOrSlug: string): Promise<Event | null> {
    try {
      const { data: be } = await apiFetch<BackendEvent>(
        `public/events/${idOrSlug}`,
      );
      if (be) return backendEventToEvent(be);
    } catch {
      /* return null below */
    }
    return null;
  },

  /** Featured events for the discovery carousel/filter. */
  async fetchFeatured(): Promise<Event[]> {
    const all = await fetchAllEvents();
    return all.filter((e) => e.featured);
  },
};
