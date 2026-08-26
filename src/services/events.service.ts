import type { Event } from '@/types';
import { EVENTS } from '@/lib/mock/events';

/**
 * Events service — all event data access goes through here.
 * Swap the body of each function to call a Rails API endpoint
 * when the backend is ready; callers (useQuery hooks) stay unchanged.
 */
export const eventsService = {
  initialData: EVENTS,
  async fetchAll(): Promise<Event[]> {
    return EVENTS;
  },

  async fetchById(id: string): Promise<Event | null> {
    return EVENTS.find((e) => e.id === id) ?? null;
  },

  async fetchFeatured(): Promise<Event[]> {
    return EVENTS.filter((e) => e.featured);
  },
};

/** Stable query keys — import these wherever you call useQuery/useQueryClient. */
export const eventKeys = {
  all: ['events'] as const,
  detail: (id: string) => ['events', id] as const,
  featured: ['events', 'featured'] as const,
};
